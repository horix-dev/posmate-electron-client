import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AppError,
  NetworkError,
  OfflineError,
  TimeoutError,
  CacheError,
  CacheMissError,
  CacheExpiredError,
  DataLoadError,
  NoDataAvailableError,
  SyncError,
  isAppError,
  isNetworkRelatedError,
  createAppError,
} from '@/lib/errors'

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with message and code', () => {
      const error = new AppError('Test error', 'TEST_CODE')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.isOperational).toBe(true)
      expect(error.timestamp).toBeInstanceOf(Date)
      expect(error.name).toBe('AppError')
    })

    it('should allow non-operational errors', () => {
      const error = new AppError('Critical error', 'CRITICAL', false)

      expect(error.isOperational).toBe(false)
    })

    it('should serialize to JSON', () => {
      const error = new AppError('Test error', 'TEST_CODE')
      const json = error.toJSON()

      expect(json).toHaveProperty('name', 'AppError')
      expect(json).toHaveProperty('message', 'Test error')
      expect(json).toHaveProperty('code', 'TEST_CODE')
      expect(json).toHaveProperty('timestamp')
    })

    it('should maintain stack trace', () => {
      const error = new AppError('Test error', 'TEST_CODE')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AppError')
    })
  })

  describe('NetworkError', () => {
    it('should create with default message', () => {
      const error = new NetworkError()

      expect(error.message).toBe('Network connection failed')
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.name).toBe('NetworkError')
    })

    it('should create with custom message', () => {
      const error = new NetworkError('Connection timeout')

      expect(error.message).toBe('Connection timeout')
    })

    it('should store original error', () => {
      const originalError = new Error('Socket closed')
      const error = new NetworkError('Network failed', originalError)

      expect(error.originalError).toBe(originalError)
    })

    it('should identify NetworkError instances', () => {
      const error = new NetworkError()

      expect(NetworkError.isNetworkError(error)).toBe(true)
      expect(NetworkError.isNetworkError(new Error())).toBe(false)
    })
  })

  describe('OfflineError', () => {
    it('should create with default message', () => {
      const error = new OfflineError()

      expect(error.message).toBe('You are currently offline')
      expect(error.code).toBe('OFFLINE')
      expect(error.name).toBe('OfflineError')
    })

    it('should create with custom message', () => {
      const error = new OfflineError('No internet connection')

      expect(error.message).toBe('No internet connection')
    })

    it('should identify OfflineError instances', () => {
      const error = new OfflineError()

      expect(OfflineError.isOfflineError(error)).toBe(true)
      expect(OfflineError.isOfflineError(new Error())).toBe(false)
    })
  })

  describe('TimeoutError', () => {
    it('should create with timeout value', () => {
      const error = new TimeoutError(5000)

      expect(error.message).toBe('Request timed out after 5000ms')
      expect(error.code).toBe('TIMEOUT')
      expect(error.timeoutMs).toBe(5000)
      expect(error.name).toBe('TimeoutError')
    })

    it('should accept custom message', () => {
      const error = new TimeoutError(3000, 'API call timed out')

      expect(error.message).toBe('API call timed out')
      expect(error.timeoutMs).toBe(3000)
    })
  })

  describe('CacheError', () => {
    it('should create with default message', () => {
      const error = new CacheError()

      expect(error.message).toBe('Cache operation failed')
      expect(error.code).toBe('CACHE_ERROR')
      expect(error.name).toBe('CacheError')
    })

    it('should store cache key', () => {
      const error = new CacheError('Failed to get cache', 'products:list')

      expect(error.cacheKey).toBe('products:list')
    })
  })

  describe('CacheMissError', () => {
    it('should create with cache key in message', () => {
      const error = new CacheMissError('products:123')

      expect(error.message).toBe('No cached data available for: products:123')
      expect(error.cacheKey).toBe('products:123')
      expect(error.name).toBe('CacheMissError')
    })
  })

  describe('CacheExpiredError', () => {
    it('should create with cache key in message', () => {
      const error = new CacheExpiredError('session:abc')

      expect(error.message).toBe('Cached data expired for: session:abc')
      expect(error.cacheKey).toBe('session:abc')
      expect(error.name).toBe('CacheExpiredError')
    })
  })

  describe('DataLoadError', () => {
    it('should create with default source', () => {
      const error = new DataLoadError('Failed to load data')

      expect(error.message).toBe('Failed to load data')
      expect(error.code).toBe('DATA_LOAD_ERROR')
      expect(error.source).toBe('unknown')
    })

    it('should accept source parameter', () => {
      const apiError = new DataLoadError('API failed', 'api')
      const cacheError = new DataLoadError('Cache failed', 'cache')

      expect(apiError.source).toBe('api')
      expect(cacheError.source).toBe('cache')
    })
  })

  describe('NoDataAvailableError', () => {
    it('should create with resource in message', () => {
      const error = new NoDataAvailableError('products')

      expect(error.message).toBe('No products data available. Please connect to the internet and sync.')
      expect(error.code).toBe('NO_DATA')
    })
  })

  describe('SyncError', () => {
    it('should create with default failed items', () => {
      const error = new SyncError('Sync failed')

      expect(error.message).toBe('Sync failed')
      expect(error.code).toBe('SYNC_ERROR')
      expect(error.failedItems).toBe(0)
    })

    it('should store failed items count', () => {
      const error = new SyncError('Partial sync failure', 5)

      expect(error.failedItems).toBe(5)
    })
  })
})

describe('Type Guards', () => {
  describe('isAppError', () => {
    it('should identify AppError instances', () => {
      expect(isAppError(new AppError('test', 'TEST'))).toBe(true)
      expect(isAppError(new NetworkError())).toBe(true)
      expect(isAppError(new OfflineError())).toBe(true)
      expect(isAppError(new Error())).toBe(false)
      expect(isAppError('string')).toBe(false)
      expect(isAppError(null)).toBe(false)
    })
  })

  describe('isNetworkRelatedError', () => {
    it('should identify network-related error instances', () => {
      expect(isNetworkRelatedError(new NetworkError())).toBe(true)
      expect(isNetworkRelatedError(new OfflineError())).toBe(true)
      expect(isNetworkRelatedError(new TimeoutError(5000))).toBe(true)
    })

    it('should identify network-related error messages', () => {
      expect(isNetworkRelatedError(new Error('Network connection failed'))).toBe(true)
      expect(isNetworkRelatedError(new Error('You are offline'))).toBe(true)
      expect(isNetworkRelatedError(new Error('Failed to fetch'))).toBe(true)
      expect(isNetworkRelatedError(new Error('net::ERR_CONNECTION_REFUSED'))).toBe(true)
      expect(isNetworkRelatedError(new Error('Request timeout'))).toBe(true)
    })

    it('should return false for non-network errors', () => {
      expect(isNetworkRelatedError(new Error('Validation failed'))).toBe(false)
      expect(isNetworkRelatedError(new CacheError())).toBe(false)
      expect(isNetworkRelatedError('string')).toBe(false)
      expect(isNetworkRelatedError(null)).toBe(false)
    })
  })
})

describe('Error Factory', () => {
  let onLineSpy: any

  beforeEach(() => {
    // Mock navigator.onLine
    onLineSpy = vi.spyOn(navigator, 'onLine', 'get')
    onLineSpy.mockReturnValue(true)
  })

  afterEach(() => {
    onLineSpy.mockRestore()
  })

  describe('createAppError', () => {
    it('should return AppError as-is', () => {
      const original = new AppError('test', 'TEST')
      const result = createAppError(original)

      expect(result).toBe(original)
    })

    it('should create OfflineError when offline', () => {
      onLineSpy.mockReturnValue(false)
      
      const result = createAppError(new Error('Some error'))

      expect(result).toBeInstanceOf(OfflineError)
    })

    it('should create NetworkError for network-related errors', () => {
      const networkError = new Error('Failed to fetch')
      const result = createAppError(networkError)

      expect(result).toBeInstanceOf(NetworkError)
      expect(result.message).toBe('Failed to fetch')
    })

    it('should create AppError from Error instance', () => {
      const error = new Error('Regular error')
      const result = createAppError(error)

      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('Regular error')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should create AppError from string', () => {
      const result = createAppError('String error')

      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('String error')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should create AppError from unknown type', () => {
      const result = createAppError(undefined)

      expect(result).toBeInstanceOf(AppError)
      expect(result.message).toBe('An unknown error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should include context in unknown error message', () => {
      const result = createAppError(undefined, 'Data loading')

      expect(result.message).toBe('Data loading: Unknown error occurred')
    })

    it('should handle network errors', () => {
      const errors = [
        new Error('network connection failed'),
        new Error('You are offline'),
        new Error('Failed to fetch'),
        new Error('net::ERR_INTERNET_DISCONNECTED'),
        new Error('Request timeout after 5000ms'),
      ]

      errors.forEach((error) => {
        const result = createAppError(error)
        expect(result).toBeInstanceOf(NetworkError)
      })
    })
  })
})

describe('Error Serialization', () => {
  it('should serialize AppError to JSON', () => {
    const error = new AppError('Test error', 'TEST_CODE')
    const json = JSON.stringify(error)
    const parsed = JSON.parse(json)

    expect(parsed.name).toBe('AppError')
    expect(parsed.message).toBe('Test error')
    expect(parsed.code).toBe('TEST_CODE')
    expect(parsed.timestamp).toBeTruthy()
  })

  it('should include inheritance chain names', () => {
    const errors = [
      new NetworkError(),
      new OfflineError(),
      new TimeoutError(5000),
      new CacheMissError('test'),
      new SyncError('test'),
    ]

    errors.forEach((error) => {
      const json = error.toJSON()
      expect(json.name).toBeTruthy()
      expect(json.name).not.toBe('AppError') // Should use child class name
    })
  })
})
