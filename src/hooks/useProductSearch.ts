/**
 * Product Search Hooks
 *
 * Custom hooks for unified product search functionality
 * Supports offline-first architecture with caching
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { productSearchService } from '@/api/services'
import { useOnlineStatus } from './useOnlineStatus'
import { useDebounce } from './useDebounce'
import type {
  ProductSearchParams,
  QuickBarcodeResult,
  SearchResultItem,
} from '@/types/product-search.types'

// ============================================
// Unified Product Search Hook
// ============================================

export interface UseProductSearchOptions {
  enabled?: boolean
  debounceMs?: number
  cacheTime?: number
  staleTime?: number
}

/**
 * Hook for unified product search
 *
 * @example
 * const { results, isLoading, error, search, clear } = useProductSearch()
 *
 * // Search as user types
 * <input onChange={(e) => search({ q: e.target.value })} />
 *
 * // Display results
 * results.products.map(product => <ProductCard key={product.id} {...product} />)
 */
export function useProductSearch(options: UseProductSearchOptions = {}) {
  const { enabled = true, debounceMs = 300, cacheTime = 5 * 60 * 1000 } = options
  const [searchParams, setSearchParams] = useState<ProductSearchParams | null>(null)
  const isOnline = useOnlineStatus()

  // Debounce search query
  const debouncedQuery = useDebounce(searchParams?.q, debounceMs)

  // Query key changes when debounced query changes
  const queryKey = ['product-search', debouncedQuery, searchParams?.type, searchParams?.limit]

  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!searchParams || !debouncedQuery || debouncedQuery.length < 2) {
        return { products: [], variants: [], batches: [], total: 0 }
      }

      const response = await productSearchService.search({
        ...searchParams,
        q: debouncedQuery,
      })
      return response.data
    },
    enabled: enabled && !!searchParams && (debouncedQuery?.length ?? 0) >= 2,
    staleTime: cacheTime,
    gcTime: cacheTime,
    retry: isOnline ? 3 : 0,
  })

  const search = useCallback((params: ProductSearchParams) => {
    setSearchParams(params)
  }, [])

  const clear = useCallback(() => {
    setSearchParams(null)
  }, [])

  // Combine all results into a single array for easy rendering
  const allResults: SearchResultItem[] = results
    ? [...results.products, ...results.variants, ...results.batches]
    : []

  return {
    results: results || { products: [], variants: [], batches: [], total: 0 },
    allResults,
    isLoading,
    error,
    search,
    clear,
    refetch,
    isOnline,
  }
}

// ============================================
// Quick Barcode Lookup Hook
// ============================================

export interface UseBarcodeScanner {
  scan: (barcode: string) => Promise<QuickBarcodeResult | null>
  isScanning: boolean
  error: Error | null
  lastResult: QuickBarcodeResult | null
  clear: () => void
}

/**
 * Hook for quick barcode scanning
 *
 * @example
 * const { scan, isScanning, lastResult } = useBarcodeScanner({
 *   onSuccess: (result) => {
 *     if (result.type === 'variant') {
 *       addToCart(result.data)
 *     }
 *   }
 * })
 *
 * // Scan barcode
 * await scan('8901234567001')
 */
export function useBarcodeScanner(options?: {
  onSuccess?: (result: QuickBarcodeResult) => void
  onError?: (error: Error) => void
  onNotFound?: (barcode: string) => void
}): UseBarcodeScanner {
  const [lastResult, setLastResult] = useState<QuickBarcodeResult | null>(null)

  const mutation = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await productSearchService.quickBarcodeLookup(barcode)
      return response.data
    },
    onSuccess: (data) => {
      setLastResult(data)
      options?.onSuccess?.(data)
    },
    onError: (error: unknown) => {
      // Check if it's a 404 (not found)
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 404
      ) {
        const barcode =
          error &&
          typeof error === 'object' &&
          'config' in error &&
          error.config &&
          typeof error.config === 'object' &&
          'url' in error.config &&
          typeof error.config.url === 'string'
            ? error.config.url.split('/').pop() || 'unknown'
            : 'unknown'
        options?.onNotFound?.(barcode)
      } else {
        options?.onError?.(error instanceof Error ? error : new Error(String(error)))
      }
    },
    retry: false, // Don't retry on 404
  })

  const scan = useCallback(
    async (barcode: string): Promise<QuickBarcodeResult | null> => {
      if (!barcode || barcode.trim().length === 0) {
        return null
      }

      try {
        const result = await mutation.mutateAsync(barcode.trim())
        return result
      } catch (error) {
        console.error('Barcode scan error:', error)
        return null
      }
    },
    [mutation]
  )

  const clear = useCallback(() => {
    setLastResult(null)
    mutation.reset()
  }, [mutation])

  return {
    scan,
    isScanning: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : null,
    lastResult,
    clear,
  }
}

// ============================================
// Autocomplete Search Hook
// ============================================

export interface UseProductAutocompleteOptions {
  minChars?: number
  debounceMs?: number
  limit?: number
  type?: 'product' | 'variant' | 'batch' | 'all'
  onSelect?: (item: SearchResultItem) => void
}

/**
 * Hook for product autocomplete/dropdown search
 *
 * @example
 * const { query, setQuery, results, isLoading } = useProductAutocomplete({
 *   limit: 10,
 *   onSelect: (item) => console.log('Selected:', item)
 * })
 *
 * <Combobox value={query} onChange={setQuery}>
 *   {results.map(item => <ComboboxOption key={item.id} value={item} />)}
 * </Combobox>
 */
export function useProductAutocomplete(options: UseProductAutocompleteOptions = {}) {
  const { minChars = 2, limit = 10, onSelect } = options

  const [query, setQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null)

  const { results, allResults, isLoading, error, isOnline } = useProductSearch({
    enabled: query.length >= minChars,
    debounceMs: options.debounceMs,
  })

  useEffect(() => {
    if (query.length >= minChars) {
      // Trigger search when query changes
      // The useProductSearch hook handles debouncing internally
    }
  }, [query, minChars])

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      setSelectedItem(item)
      onSelect?.(item)
    },
    [onSelect]
  )

  // Limit results for autocomplete
  const limitedResults = allResults.slice(0, limit)

  return {
    query,
    setQuery,
    results: limitedResults,
    allResults: limitedResults,
    fullResults: results,
    selectedItem,
    setSelectedItem,
    isLoading,
    error,
    isOnline,
    onSelect: handleSelect,
  }
}
