import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type { Category, CreateCategoryRequest } from '@/types/api.types'
import { storage } from '@/lib/storage'
import type { LocalCategory } from '@/lib/db/schema'

// ============================================
// Types
// ============================================

export interface CategoriesListParams {
  limit?: number
  status?: boolean
  search?: string
}

export interface CategoriesPaginatedParams {
  page?: number
  per_page?: number
  status?: boolean
  search?: string
}

export interface CategoriesCursorParams {
  cursor?: number
  per_page?: number
}

interface CursorPaginationResponse {
  message: string
  data: Category[]
  pagination: {
    next_cursor: number | null
    has_more: boolean
    count: number
    per_page: number
  }
  _server_timestamp: string
}

// ============================================
// Service Implementation
// ============================================

export const categoriesService = {
  /**
   * Get categories list (for dropdowns, filters)
   * Returns flat array with optional limit
   *
   * Mode: Limit
   * Use Case: POS dropdown, filters, anywhere you need a simple list
   *
   * @example
   * // POS dropdown - get 100 active categories
   * await categoriesService.getList({ limit: 100, status: true })
   */
  getList: async (params?: CategoriesListParams): Promise<ApiResponse<Category[]>> => {
    try {
      const { data } = await api.get<ApiResponse<Category[]>>(API_ENDPOINTS.CATEGORIES.LIST, {
        params,
      })

      // Cache for offline use
      if (data.data && Array.isArray(data.data)) {
        const localCategories: LocalCategory[] = data.data.map((cat) => ({
          id: cat.id,
          categoryName: cat.categoryName,
          icon: cat.icon ?? undefined,
          status: typeof cat.status === 'boolean' ? (cat.status ? 1 : 0) : (cat.status ?? 1),
          parentId: cat.parentId ?? undefined,
          variationCapacity: cat.variationCapacity ?? 0,
          variationColor: cat.variationColor ?? 0,
          variationSize: cat.variationSize ?? 0,
          variationType: cat.variationType ?? 0,
          variationWeight: cat.variationWeight ?? 0,
          version: cat.version ?? 1,
          lastSyncedAt: new Date().toISOString(),
        }))
        console.log('[categoriesService.getList] Caching categories:', localCategories.slice(0, 2))
        await storage.categories.bulkUpsert(localCategories)
      }

      return data
    } catch (error) {
      // Fallback to cache when API fails (offline or server error)
      console.warn('[categoriesService] API failed, attempting cache fallback', error)

      try {
        const cached = await storage.categories.getAll()
        console.log('[categoriesService.getList] Retrieved from cache:', cached.slice(0, 2))

        // If cache is empty, throw original error
        if (cached.length === 0) {
          throw error
        }

        // Apply filters client-side
        // Normalize status to number (handle boolean, number, undefined, null from cache)
        let filtered = cached.map((c) => ({
          ...c,
          status: typeof c.status === 'boolean' ? (c.status ? 1 : 0) : (c.status ?? 1),
          icon: c.icon || undefined,
        }))
        console.log('[categoriesService.getList] After normalization:', filtered.slice(0, 2))

        if (params?.status !== undefined) {
          filtered = filtered.filter((c) => c.status === (params.status ? 1 : 0))
        }

        if (params?.search) {
          const query = params.search.toLowerCase()
          filtered = filtered.filter((c) => c.categoryName.toLowerCase().includes(query))
        }

        // Apply limit
        if (params?.limit) {
          filtered = filtered.slice(0, params.limit)
        }

        return {
          message: 'Data loaded from cache',
          data: filtered,
        }
      } catch (cacheError) {
        // Cache also failed, throw original API error
        throw error
      }
    }
  },

  /**
   * Get paginated categories (for management tables)
   * Returns paginated response with metadata
   *
   * Mode: Offset Pagination
   * Use Case: Management tables with page navigation
   *
   * @example
   * // Management table - page 1, 10 items
   * await categoriesService.getPaginated({ page: 1, per_page: 10 })
   */
  getPaginated: async (
    params?: CategoriesPaginatedParams
  ): Promise<PaginatedApiResponse<Category[]>> => {
    try {
      const { data } = await api.get<PaginatedApiResponse<Category[]>>(
        API_ENDPOINTS.CATEGORIES.LIST,
        { params }
      )

      // Cache the data for offline use
      if (data.data && 'data' in data.data && Array.isArray(data.data.data)) {
        const categories: LocalCategory[] = data.data.data.map((cat: Category) => ({
          id: cat.id,
          categoryName: cat.categoryName,
          icon: cat.icon ?? undefined,
          status: typeof cat.status === 'boolean' ? (cat.status ? 1 : 0) : (cat.status ?? 1),
          parentId: cat.parentId ?? undefined,
          variationCapacity: cat.variationCapacity ?? 0,
          variationColor: cat.variationColor ?? 0,
          variationSize: cat.variationSize ?? 0,
          variationType: cat.variationType ?? 0,
          variationWeight: cat.variationWeight ?? 0,
          version: cat.version ?? 1,
          lastSyncedAt: new Date().toISOString(),
        }))
        console.log('[categoriesService.getPaginated] Caching categories:', categories.slice(0, 2))
        await storage.categories.bulkUpsert(categories)
      }

      return data
    } catch (error) {
      // Fallback to cache when API fails (offline or server error)
      console.warn('[categoriesService] API failed, attempting cache fallback', error)

      try {
        const cached = await storage.categories.getAll()
        console.log('[categoriesService.getPaginated] Retrieved from cache:', cached.slice(0, 2))

        // If cache is empty, throw original error
        if (cached.length === 0) {
          throw error
        }

        // Apply filters
        // Normalize status to number (handle boolean, number, undefined, null from cache)
        let filtered = cached.map((c) => ({
          ...c,
          status: typeof c.status === 'boolean' ? (c.status ? 1 : 0) : (c.status ?? 1),
          icon: c.icon || undefined,
        }))
        console.log('[categoriesService.getPaginated] After normalization:', filtered.slice(0, 2))

        if (params?.status !== undefined) {
          filtered = filtered.filter((c) => c.status === (params.status ? 1 : 0))
        }

        if (params?.search) {
          const query = params.search.toLowerCase()
          filtered = filtered.filter((c) => c.categoryName.toLowerCase().includes(query))
        }

        // Client-side pagination
        const page = params?.page || 1
        const perPage = params?.per_page || 10
        const total = filtered.length
        const lastPage = Math.ceil(total / perPage)
        const startIndex = (page - 1) * perPage
        const paginatedData = filtered.slice(startIndex, startIndex + perPage)

        return {
          message: 'Data loaded from cache',
          data: {
            data: paginatedData,
            current_page: page,
            last_page: lastPage,
            total,
            per_page: perPage,
            first_page_url: '',
            last_page_url: '',
            next_page_url: page < lastPage ? '' : null,
            prev_page_url: page > 1 ? '' : null,
            path: '',
            from: startIndex + 1,
            to: Math.min(startIndex + perPage, total),
            links: [],
          },
          current_page: page,
          last_page: lastPage,
          per_page: perPage,
          total,
        } as unknown as PaginatedApiResponse<Category[]>
      } catch (cacheError) {
        // Cache also failed, throw original API error
        throw error
      }
    }
  },

  /**
   * Get categories with cursor pagination (for offline sync)
   * Returns data with next_cursor for efficient batching
   *
   * Mode: Cursor Pagination
   * Use Case: Offline sync, bulk exports, large dataset processing
   *
   * @example
   * // Sync batch of 100
   * let cursor = 0
   * let hasMore = true
   * while (hasMore) {
   *   const response = await categoriesService.getCursor({ cursor, per_page: 100 })
   *   await saveToDatabase(response.data)
   *   cursor = response.pagination.next_cursor
   *   hasMore = response.pagination.has_more
   * }
   */
  getCursor: async (params?: CategoriesCursorParams): Promise<CursorPaginationResponse> => {
    const { data } = await api.get<CursorPaginationResponse>(API_ENDPOINTS.CATEGORIES.LIST, {
      params,
    })

    // Cache batch for offline use
    if (data.data && Array.isArray(data.data)) {
      const localCategories: LocalCategory[] = data.data.map((cat) => ({
        id: cat.id,
        categoryName: cat.categoryName,
        icon: cat.icon ?? undefined,
        status: typeof cat.status === 'boolean' ? (cat.status ? 1 : 0) : (cat.status ?? 1),
        parentId: cat.parentId ?? undefined,
        variationCapacity: cat.variationCapacity ?? 0,
        variationColor: cat.variationColor ?? 0,
        variationSize: cat.variationSize ?? 0,
        variationType: cat.variationType ?? 0,
        variationWeight: cat.variationWeight ?? 0,
        version: cat.version ?? 1,
        lastSyncedAt: new Date().toISOString(),
      }))
      await storage.categories.bulkUpsert(localCategories)
    }

    return data
  },

  /**
   * Filter categories (legacy - use getPaginated with search param)
   * @deprecated Use getPaginated() instead
   */
  filter: async (
    params: { search?: string; page?: number; per_page?: number } = {}
  ): Promise<PaginatedApiResponse<Category[]>> => {
    console.warn('[categoriesService] filter() is deprecated. Use getPaginated() with search param')
    return categoriesService.getPaginated(params)
  },

  /**
   * Get all categories (legacy - use getList or getPaginated)
   * @deprecated Use getList() for flat array or getPaginated() for paginated data
   */
  getAll: async (params?: {
    page?: number
    per_page?: number
  }): Promise<PaginatedApiResponse<Category[]>> => {
    console.warn('[categoriesService] getAll() is deprecated. Use getList() or getPaginated()')
    return categoriesService.getPaginated(params)
  },

  /**
   * Get single category
   */
  getById: async (id: number): Promise<ApiResponse<Category>> => {
    const { data } = await api.get<ApiResponse<Category>>(API_ENDPOINTS.CATEGORIES.UPDATE(id))
    return data
  },

  /**
   * Create category
   */
  create: async (categoryData: CreateCategoryRequest): Promise<ApiResponse<Category>> => {
    const formData = buildFormData(categoryData as unknown as Record<string, unknown>)
    const { data } = await api.post<ApiResponse<Category>>(
      API_ENDPOINTS.CATEGORIES.CREATE,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return data
  },

  /**
   * Update category
   */
  update: async (
    id: number,
    categoryData: Partial<CreateCategoryRequest>
  ): Promise<ApiResponse<Category>> => {
    const formData = buildFormData(categoryData as unknown as Record<string, unknown>)
    formData.append('_method', 'PUT')
    const { data } = await api.post<ApiResponse<Category>>(
      API_ENDPOINTS.CATEGORIES.UPDATE(id),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return data
  },

  /**
   * Delete category
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.CATEGORIES.DELETE(id))
    return data
  },

  /**
   * Update category status
   */
  updateStatus: async (id: number, status: boolean): Promise<ApiResponse<Category>> => {
    const { data } = await api.patch<ApiResponse<Category>>(
      `${API_ENDPOINTS.CATEGORIES.UPDATE(id)}/status`,
      { status }
    )
    return data
  },

  /**
   * Delete multiple categories
   */
  deleteMultiple: async (ids: number[]): Promise<ApiResponse<null>> => {
    const { data } = await api.post<ApiResponse<null>>(
      `${API_ENDPOINTS.CATEGORIES.LIST}/delete-all`,
      { ids }
    )
    return data
  },
}

// Helper to build FormData
function buildFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (value instanceof File) {
      formData.append(key, value)
    } else if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0') // Convert boolean to 1/0 for backend
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        formData.append(`${key}[]`, String(item))
      })
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

export default categoriesService
