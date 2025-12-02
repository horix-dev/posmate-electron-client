/**
 * React Hook for cached images
 * 
 * Usage:
 * const imageUrl = useImageCache(product.imageUrl)
 * <img src={imageUrl || fallbackImage} alt="Product" />
 */

import { useState, useEffect } from 'react'
import { imageCache } from '@/lib/cache/imageCache'

interface UseImageCacheOptions {
  /** Cache TTL in milliseconds (default: 7 days) */
  ttl?: number
  /** Fallback image URL if loading fails */
  fallback?: string
}

export function useImageCache(
  url: string | undefined | null,
  options: UseImageCacheOptions = {}
) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!url) {
      setCachedUrl(options.fallback || null)
      return
    }

    let mounted = true

    const loadImage = async () => {
      setLoading(true)
      setError(null)

      try {
        const cached = await imageCache.getImage(url, options.ttl)
        if (mounted) {
          setCachedUrl(cached)
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
          setCachedUrl(options.fallback || null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      mounted = false
    }
  }, [url, options.ttl, options.fallback])

  return { cachedUrl, loading, error }
}

/**
 * Preload multiple images (for product lists, etc.)
 * 
 * Usage:
 * useImagePreload(products.map(p => p.imageUrl))
 */
export function useImagePreload(urls: (string | undefined | null)[], ttl?: number) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const validUrls = urls.filter((url): url is string => !!url)
    
    if (validUrls.length === 0) {
      setLoaded(true)
      return
    }

    imageCache.preloadImages(validUrls, ttl)
      .then(() => setLoaded(true))
      .catch(err => {
        console.error('[useImagePreload] Failed:', err)
        setLoaded(true) // Set to true even on error
      })
  }, [urls, ttl])

  return loaded
}
