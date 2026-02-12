/**
 * Cache Utilities
 *
 * Industry-standard caching layer with:
 * - Type safety
 * - TTL (Time-To-Live) expiration
 * - Version control for cache invalidation
 * - Error handling
 */

// ============================================
// Types
// ============================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: number
}

interface CacheOptions {
  /** Time-to-live in milliseconds (default: 24 hours) */
  ttl?: number
  /** Cache version for invalidation */
  version?: number
}

// ============================================
// Constants
// ============================================

const DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours
const CURRENT_CACHE_VERSION = 1

// ============================================
// LocalStorage Cache
// ============================================

/**
 * Set data in localStorage with metadata
 */
export function setCache<T>(key: string, data: T, options: CacheOptions = {}): boolean {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: options.version ?? CURRENT_CACHE_VERSION,
    }
    localStorage.setItem(key, JSON.stringify(entry))
    return true
  } catch (error) {
    console.warn(`[Cache] Failed to set "${key}":`, error)
    return false
  }
}

/**
 * Get data from localStorage with TTL check
 */
export function getCache<T>(key: string, options: CacheOptions = {}): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)

    // Check version - invalidate if outdated
    const requiredVersion = options.version ?? CURRENT_CACHE_VERSION
    if (entry.version !== requiredVersion) {
      console.log(`[Cache] Version mismatch for "${key}", invalidating`)
      localStorage.removeItem(key)
      return null
    }

    // Check TTL
    const ttl = options.ttl ?? DEFAULT_TTL
    const age = Date.now() - entry.timestamp
    if (age > ttl) {
      console.log(`[Cache] Entry "${key}" expired (age: ${Math.round(age / 1000 / 60)}min)`)
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch (error) {
    console.warn(`[Cache] Failed to get "${key}":`, error)
    return null
  }
}

/**
 * Remove item from cache
 */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`[Cache] Failed to remove "${key}":`, error)
  }
}

/**
 * Clear all cache entries with a specific prefix
 */
export function clearCacheByPrefix(prefix: string): void {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix))
    keys.forEach((key) => localStorage.removeItem(key))
  } catch (error) {
    console.warn(`[Cache] Failed to clear prefix "${prefix}":`, error)
  }
}

/**
 * Check if cache entry exists and is valid
 */
export function hasValidCache(key: string, options: CacheOptions = {}): boolean {
  return getCache(key, options) !== null
}

// ============================================
// Cache Key Generators
// ============================================

export const CacheKeys = {
  // Auth
  AUTH_USER: 'cache:auth:user',
  AUTH_BUSINESS: 'cache:auth:business',
  AUTH_CURRENCY: 'cache:auth:currency',

  // POS
  POS_PAYMENT_TYPES: 'cache:pos:payment-types',
  POS_VATS: 'cache:pos:vats',

  // Products
  PRODUCTS_BRANDS: 'cache:products:brands',
  PRODUCTS_UNITS: 'cache:products:units',
  PRODUCT_VARIANTS: (productId: number) => `cache:products:${productId}:variants`,

  // Inventory metadata
  WAREHOUSES: 'cache:inventory:warehouses',

  // Stocks
  STOCKS_TOTAL_VALUE: 'cache:stocks:total-value',

  // Dashboard
  DASHBOARD_SUMMARY: 'cache:dashboard:summary',
  DASHBOARD_DATA: 'cache:dashboard:data',
} as const

// ============================================
// Batch Cache Operations
// ============================================

/**
 * Set multiple cache entries at once
 */
export function setCacheMultiple(
  entries: Record<string, unknown>,
  options: CacheOptions = {}
): void {
  Object.entries(entries).forEach(([key, data]) => {
    if (data !== null && data !== undefined) {
      setCache(key, data, options)
    }
  })
}

/**
 * Get multiple cache entries at once
 */
export function getCacheMultiple<T extends Record<string, unknown>>(
  keys: (keyof T)[],
  options: CacheOptions = {}
): Partial<T> {
  const result: Partial<T> = {}

  keys.forEach((key) => {
    const data = getCache<T[typeof key]>(key as string, options)
    if (data !== null) {
      result[key] = data
    }
  })

  return result
}

export default {
  set: setCache,
  get: getCache,
  remove: removeCache,
  clearByPrefix: clearCacheByPrefix,
  hasValid: hasValidCache,
  keys: CacheKeys,
}
