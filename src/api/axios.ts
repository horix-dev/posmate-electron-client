import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import axiosRetry from 'axios-retry'

// Get API base URL with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.posmate.app'

// Device ID cache
let cachedDeviceId: string | null = null

/**
 * Get device ID (cached for performance)
 */
async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId

  if (window.electronAPI?.getDeviceId) {
    cachedDeviceId = await window.electronAPI.getDeviceId()
  } else {
    cachedDeviceId =
      localStorage.getItem('device_id') ||
      `WEB-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    localStorage.setItem('device_id', cachedDeviceId)
  }

  return cachedDeviceId
}

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

function shouldDebugStockRequests(): boolean {
  if (!import.meta.env.DEV) return false
  const flag = (import.meta.env.VITE_DEBUG_STOCK || '').toString().toLowerCase()
  return flag === '1' || flag === 'true' || flag === 'yes'
}

function isStockRelatedEndpoint(url?: string): boolean {
  if (!url) return false
  return /\/variants\/(\d+)\/stock/.test(url) || /\/stocks\/(\d+)/.test(url)
}

// Configure axios-retry for network errors
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429
  },
})

// Token management helpers
let authToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export const setAuthToken = (token: string | null) => {
  authToken = token
  if (token && window.electronAPI?.secureStore?.set) {
    window.electronAPI.secureStore.set('authToken', token)
  }
}

export const getAuthToken = async (): Promise<string | null> => {
  if (authToken) return authToken
  if (window.electronAPI?.secureStore?.get) {
    authToken = (await window.electronAPI.secureStore.get<string>('authToken')) || null
  }
  return authToken
}

export const clearAuthToken = () => {
  authToken = null
  if (window.electronAPI?.secureStore?.delete) {
    window.electronAPI.secureStore.delete('authToken')
  }
}

// Request interceptor - Add auth token and device ID
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add auth token
    const token = await getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add device ID for sync-related endpoints
    const isSyncEndpoint =
      config.url?.includes('/sync') ||
      config.url?.includes('/sales') ||
      config.url?.includes('/parties')
    if (isSyncEndpoint) {
      const deviceId = await getDeviceId()
      config.headers['X-Device-ID'] = deviceId
    }

    if (shouldDebugStockRequests() && isStockRelatedEndpoint(config.url)) {
      console.debug('[stock-debug] request', {
        method: config.method,
        url: config.url,
        params: config.params,
        data: config.data,
      })
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - Handle errors, token refresh, and server timestamp
api.interceptors.response.use(
  (response) => {
    // Capture server timestamp from headers or body
    const serverTimestamp =
      response.headers['x-server-timestamp'] || response.data?._server_timestamp
    if (serverTimestamp) {
      localStorage.setItem('last_server_timestamp', serverTimestamp)
    }

    if (shouldDebugStockRequests() && isStockRelatedEndpoint(response.config?.url)) {
      console.debug('[stock-debug] response', {
        url: response.config?.url,
        status: response.status,
        data: response.data,
      })
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (shouldDebugStockRequests() && isStockRelatedEndpoint(originalRequest?.url)) {
      console.debug('[stock-debug] error', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status: error.response?.status,
        response: error.response?.data,
        requestData: originalRequest?.data,
      })
    }

    // Handle 401 - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Prevent multiple refresh requests
      if (!refreshPromise) {
        refreshPromise = refreshToken()
      }

      try {
        const newToken = await refreshPromise
        refreshPromise = null

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        refreshPromise = null
        // Redirect to login or clear auth state
        clearAuthToken()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Refresh token function
async function refreshToken(): Promise<string | null> {
  try {
    const response = await api.post('/refresh-token')
    const newToken = response.data.token
    if (newToken) {
      setAuthToken(newToken)
      return newToken
    }
    return null
  } catch {
    return null
  }
}

// API Response type
export interface ApiResponse<T = unknown> {
  message: string
  data: T
}

// Paginated API Response type
export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T> {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// API Error type
export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

// Helper to extract error message
export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined
    if (apiError?.message) {
      return apiError.message
    }
    if (apiError?.errors) {
      const firstError = Object.values(apiError.errors)[0]
      if (firstError && firstError[0]) {
        return firstError[0]
      }
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export default api
