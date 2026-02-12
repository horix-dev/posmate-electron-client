import { QueryClient } from '@tanstack/react-query'

/**
 * Query Client Configuration
 *
 * Optimized caching strategy to reduce API calls by 70-80%:
 * - staleTime: Data is considered fresh for this duration (no refetch)
 * - gcTime: How long unused data stays in cache (formerly cacheTime)
 * - refetchOnWindowFocus: Disabled to respect staleTime cache
 * - refetchOnReconnect: Refetch when internet reconnects
 *
 * See: backend_docs/CACHE_AND_SYNC_STRATEGY.md
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Static reference data (units, brands, categories) - 30 min fresh
      staleTime: 30 * 60 * 1000, // 30 minutes

      // Keep data in cache for 60 minutes after last use
      gcTime: 60 * 60 * 1000, // 60 minutes

      // Refetch when user focuses window (Phase 1: Product Stock Freshness)
      refetchOnWindowFocus: true,

      // Refetch when network reconnects (offline-first recovery)
      refetchOnReconnect: true,

      // Retry failed requests (network errors)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})
