/**
 * Example: Using Image Cache in Components
 */

import { useImageCache } from '@/hooks/useImageCache'

// Example 1: Simple usage in Product Card
export function ProductCard({ product }) {
  const { cachedUrl, loading } = useImageCache(product.imageUrl, {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    fallback: '/placeholder-product.png',
  })

  return (
    <div className="product-card">
      {loading ? (
        <div className="animate-pulse bg-muted h-40 w-full" />
      ) : (
        <img 
          src={cachedUrl || '/placeholder-product.png'} 
          alt={product.name}
          className="h-40 w-full object-cover"
        />
      )}
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  )
}

// Example 2: Preload images for better UX
export function ProductList({ products }) {
  const preloaded = useImagePreload(
    products.map(p => p.imageUrl),
    7 * 24 * 60 * 60 * 1000
  )

  return (
    <div className="grid grid-cols-4 gap-4">
      {!preloaded && <LoadingSpinner />}
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

// Example 3: Manual cache management
import { imageCache } from '@/lib/cache/imageCache'

// Clear cache
await imageCache.clear()

// Get cache stats
const stats = await imageCache.getStats()
console.log(`Cache: ${stats.count} images, ${stats.percentUsed}% full`)

// Cleanup expired entries
await imageCache.cleanup()

// Preload specific images
await imageCache.preloadImages([
  'https://api.example.com/products/1/image.jpg',
  'https://api.example.com/products/2/image.jpg',
])
