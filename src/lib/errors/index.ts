/**
 * Application Error Types
 * 
 * Custom error classes for better error handling and user feedback.
 * Following industry standards for typed errors.
 */

// ============================================
// Base Application Error
// ============================================

export class AppError extends Error {
  public readonly code: string
  public readonly isOperational: boolean
  public readonly timestamp: Date

  constructor(message: string, code: string, isOperational = true) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.isOperational = isOperational
    this.timestamp = new Date()

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace?.(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
    }
  }
}

// ============================================
// Network Errors
// ============================================

export class NetworkError extends AppError {
  public readonly originalError?: Error

  constructor(message = 'Network connection failed', originalError?: Error) {
    super(message, 'NETWORK_ERROR')
    this.originalError = originalError
  }

  static isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError
  }
}

export class OfflineError extends AppError {
  constructor(message = 'You are currently offline') {
    super(message, 'OFFLINE')
  }

  static isOfflineError(error: unknown): error is OfflineError {
    return error instanceof OfflineError
  }
}

export class TimeoutError extends AppError {
  public readonly timeoutMs: number

  constructor(timeoutMs: number, message?: string) {
    super(message ?? `Request timed out after ${timeoutMs}ms`, 'TIMEOUT')
    this.timeoutMs = timeoutMs
  }
}

// ============================================
// Cache Errors
// ============================================

export class CacheError extends AppError {
  public readonly cacheKey?: string

  constructor(message = 'Cache operation failed', cacheKey?: string) {
    super(message, 'CACHE_ERROR')
    this.cacheKey = cacheKey
  }
}

export class CacheMissError extends CacheError {
  constructor(key: string) {
    super(`No cached data available for: ${key}`, key)
    this.name = 'CacheMissError'
  }
}

export class CacheExpiredError extends CacheError {
  constructor(key: string) {
    super(`Cached data expired for: ${key}`, key)
    this.name = 'CacheExpiredError'
  }
}

// ============================================
// Data Errors
// ============================================

export class DataLoadError extends AppError {
  public readonly source: 'api' | 'cache' | 'unknown'

  constructor(message: string, source: 'api' | 'cache' | 'unknown' = 'unknown') {
    super(message, 'DATA_LOAD_ERROR')
    this.source = source
  }
}

export class NoDataAvailableError extends AppError {
  constructor(resource: string) {
    super(`No ${resource} data available. Please connect to the internet and sync.`, 'NO_DATA')
  }
}

// ============================================
// Sync Errors
// ============================================

export class SyncError extends AppError {
  public readonly failedItems: number

  constructor(message: string, failedItems = 0) {
    super(message, 'SYNC_ERROR')
    this.failedItems = failedItems
  }
}

// ============================================
// Error Type Guards
// ============================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function isNetworkRelatedError(error: unknown): boolean {
  if (error instanceof NetworkError || error instanceof OfflineError || error instanceof TimeoutError) {
    return true
  }
  
  // Check for common network error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('failed to fetch') ||
      message.includes('net::err') ||
      message.includes('timeout')
    )
  }
  
  return false
}

// ============================================
// Error Factory
// ============================================

/**
 * Create an appropriate error type from an unknown error
 */
export function createAppError(error: unknown, context?: string): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error
  }

  // Check for offline
  if (!navigator.onLine) {
    return new OfflineError()
  }

  // Error instance
  if (error instanceof Error) {
    if (isNetworkRelatedError(error)) {
      return new NetworkError(error.message, error)
    }
    return new AppError(error.message, 'UNKNOWN_ERROR')
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR')
  }

  // Unknown error
  return new AppError(
    context ? `${context}: Unknown error occurred` : 'An unknown error occurred',
    'UNKNOWN_ERROR'
  )
}

export default {
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
}
