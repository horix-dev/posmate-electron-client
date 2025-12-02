/**
 * CachedImage Component
 * 
 * Displays images with automatic offline caching.
 * When online: Fetches image and caches to IndexedDB
 * When offline: Loads from IndexedDB cache
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { imageCache } from '@/lib/cache/imageCache'

interface CachedImageProps {
  /** Image URL to load and cache */
  src: string | null | undefined
  /** Alt text for accessibility */
  alt: string
  /** CSS classes */
  className?: string
  /** Fallback element when image is loading or unavailable */
  fallback?: React.ReactNode
  /** Time-to-live for cache in ms (default: 7 days) */
  ttl?: number
  /** Loading attribute for native lazy loading */
  loading?: 'lazy' | 'eager'
}

export function CachedImage({
  src,
  alt,
  className,
  fallback,
  ttl,
  loading = 'lazy',
}: CachedImageProps) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadImage() {
      if (!src) {
        setIsLoading(false)
        setHasError(true)
        return
      }

      setIsLoading(true)
      setHasError(false)

      try {
        // Try to get from cache (will fetch and cache if not present and online)
        const result = await imageCache.getImage(src, ttl)
        
        if (!isMounted) return

        if (result) {
          setCachedUrl(result)
          setHasError(false)
        } else {
          // No cached version and couldn't fetch (likely offline)
          setHasError(true)
        }
      } catch (error) {
        console.error('[CachedImage] Failed to load:', src, error)
        if (isMounted) {
          setHasError(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
      // Note: Don't revoke the URL here as imageCache manages the lifecycle
    }
  }, [src, ttl])

  // Show fallback if loading, error, or no src
  if (isLoading || hasError || !cachedUrl) {
    return fallback ? <>{fallback}</> : null
  }

  return (
    <img
      src={cachedUrl}
      alt={alt}
      className={cn(className)}
      loading={loading}
      onError={() => {
        setHasError(true)
        setCachedUrl(null)
      }}
    />
  )
}

/**
 * Hook to preload images into cache
 * Call this when data is loaded to cache images in background
 */
export function usePreloadImages(urls: (string | null | undefined)[]) {
  useEffect(() => {
    const validUrls = urls.filter((url): url is string => !!url)
    
    if (validUrls.length === 0) return

    // Preload in background
    imageCache.preloadImages(validUrls).catch((err) => {
      console.warn('[usePreloadImages] Some images failed to preload:', err)
    })
  }, [urls.join(',')])
}
