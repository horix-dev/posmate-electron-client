/**
 * Image Cache Manager
 * 
 * Industry standard approach for caching images in Electron:
 * - Uses IndexedDB for metadata and small images
 * - Uses Electron's app.getPath('userData') for large files
 * - Implements cache expiration (TTL)
 * - Memory-efficient with LRU eviction
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface ImageCacheSchema extends DBSchema {
  images: {
    key: string // URL or unique identifier
    value: {
      url: string
      data: Blob
      mimeType: string
      cachedAt: number
      lastAccessed: number
      size: number
      expiresAt?: number
    }
  }
  metadata: {
    key: string
    value: {
      totalSize: number
      lastCleanup: number
    }
  }
}

class ImageCacheManager {
  private db: IDBPDatabase<ImageCacheSchema> | null = null
  private readonly DB_NAME = 'posmate-image-cache'
  private readonly DB_VERSION = 1
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days
  private memoryCache = new Map<string, string>() // In-memory blob URLs

  async init() {
    if (this.db) return

    this.db = await openDB<ImageCacheSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Images store
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'url' })
          imageStore.createIndex('cachedAt', 'cachedAt')
          imageStore.createIndex('lastAccessed', 'lastAccessed')
          imageStore.createIndex('size', 'size')
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata')
        }
      },
    })
  }

  /**
   * Get cached image or fetch and cache it
   */
  async getImage(url: string, ttl: number = this.DEFAULT_TTL): Promise<string> {
    await this.init()

    // Check memory cache first
    if (this.memoryCache.has(url)) {
      return this.memoryCache.get(url)!
    }

    // Check IndexedDB cache
    const cached = await this.db!.get('images', url)
    
    if (cached) {
      const now = Date.now()
      
      // Check if expired
      if (cached.expiresAt && cached.expiresAt < now) {
        await this.delete(url)
      } else {
        // Update last accessed time
        await this.db!.put('images', {
          ...cached,
          lastAccessed: now,
        })

        // Create blob URL and store in memory
        const blobUrl = URL.createObjectURL(cached.data)
        this.memoryCache.set(url, blobUrl)
        return blobUrl
      }
    }

    // Fetch from network
    return this.fetchAndCache(url, ttl)
  }

  /**
   * Fetch image from network and cache it
   */
  private async fetchAndCache(url: string, ttl: number): Promise<string> {
    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }

      const blob = await response.blob()
      const mimeType = response.headers.get('content-type') || 'image/jpeg'
      const now = Date.now()

      // Check cache size and evict if needed
      await this.ensureCacheSpace(blob.size)

      // Store in IndexedDB
      await this.db!.put('images', {
        url,
        data: blob,
        mimeType,
        cachedAt: now,
        lastAccessed: now,
        size: blob.size,
        expiresAt: now + ttl,
      })

      // Update total cache size
      await this.updateCacheSize(blob.size)

      // Create blob URL and store in memory
      const blobUrl = URL.createObjectURL(blob)
      this.memoryCache.set(url, blobUrl)
      
      return blobUrl
    } catch (error) {
      console.error('[ImageCache] Failed to fetch and cache image:', url, error)
      throw error
    }
  }

  /**
   * Preload images (for product catalog, etc.)
   */
  async preloadImages(urls: string[], ttl: number = this.DEFAULT_TTL): Promise<void> {
    await this.init()
    
    const promises = urls.map(url => 
      this.getImage(url, ttl).catch(err => {
        console.warn('[ImageCache] Failed to preload:', url, err)
        return null
      })
    )

    await Promise.all(promises)
  }

  /**
   * Delete cached image
   */
  async delete(url: string): Promise<void> {
    await this.init()

    const cached = await this.db!.get('images', url)
    if (cached) {
      await this.db!.delete('images', url)
      await this.updateCacheSize(-cached.size)
    }

    // Revoke memory blob URL
    const blobUrl = this.memoryCache.get(url)
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      this.memoryCache.delete(url)
    }
  }

  /**
   * Clear all cached images
   */
  async clear(): Promise<void> {
    await this.init()

    // Revoke all memory blob URLs
    this.memoryCache.forEach(blobUrl => URL.revokeObjectURL(blobUrl))
    this.memoryCache.clear()

    // Clear IndexedDB
    await this.db!.clear('images')
    await this.db!.put('metadata', { totalSize: 0, lastCleanup: Date.now() }, 'cache')
  }

  /**
   * Clean expired entries
   */
  async cleanup(): Promise<void> {
    await this.init()

    const now = Date.now()
    const tx = this.db!.transaction('images', 'readwrite')
    const store = tx.objectStore('images')
    
    let cursor = await store.openCursor()
    let deletedSize = 0

    while (cursor) {
      const { url, expiresAt, size } = cursor.value
      
      if (expiresAt && expiresAt < now) {
        await cursor.delete()
        deletedSize += size

        // Revoke memory blob URL
        const blobUrl = this.memoryCache.get(url)
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl)
          this.memoryCache.delete(url)
        }
      }
      
      cursor = await cursor.continue()
    }

    await tx.done

    if (deletedSize > 0) {
      await this.updateCacheSize(-deletedSize)
    }

    await this.db!.put('metadata', { lastCleanup: now }, 'cleanup')
  }

  /**
   * Ensure there's enough space in cache (LRU eviction)
   */
  private async ensureCacheSpace(requiredSize: number): Promise<void> {
    const metadata = await this.db!.get('metadata', 'cache')
    const currentSize = metadata?.totalSize || 0

    if (currentSize + requiredSize <= this.MAX_CACHE_SIZE) {
      return
    }

    // Evict least recently accessed images until we have space
    const tx = this.db!.transaction('images', 'readwrite')
    const store = tx.objectStore('images')
    const index = store.index('lastAccessed')
    
    let cursor = await index.openCursor()
    let freedSize = 0

    while (cursor && freedSize < requiredSize) {
      const { url, size } = cursor.value
      await cursor.delete()
      freedSize += size

      // Revoke memory blob URL
      const blobUrl = this.memoryCache.get(url)
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        this.memoryCache.delete(url)
      }
      
      cursor = await cursor.continue()
    }

    await tx.done

    if (freedSize > 0) {
      await this.updateCacheSize(-freedSize)
    }
  }

  /**
   * Update total cache size metadata
   */
  private async updateCacheSize(delta: number): Promise<void> {
    const metadata = await this.db!.get('metadata', 'cache')
    const currentSize = metadata?.totalSize || 0
    const newSize = Math.max(0, currentSize + delta)

    await this.db!.put('metadata', {
      totalSize: newSize,
      lastCleanup: metadata?.lastCleanup || Date.now(),
    }, 'cache')
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    await this.init()

    const metadata = await this.db!.get('metadata', 'cache')
    const allImages = await this.db!.getAll('images')

    return {
      totalSize: metadata?.totalSize || 0,
      count: allImages.length,
      maxSize: this.MAX_CACHE_SIZE,
      percentUsed: ((metadata?.totalSize || 0) / this.MAX_CACHE_SIZE) * 100,
      lastCleanup: metadata?.lastCleanup,
    }
  }
}

// Singleton instance
export const imageCache = new ImageCacheManager()

// Auto cleanup on app start
if (typeof window !== 'undefined') {
  imageCache.cleanup().catch(console.error)
}
