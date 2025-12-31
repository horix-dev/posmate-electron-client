import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

describe('useOnlineStatus', () => {
  let onlineSpy: any
  let addEventListenerSpy: any
  let removeEventListenerSpy: any

  beforeEach(() => {
    vi.useFakeTimers()
    
    // Mock navigator.onLine
    onlineSpy = vi.spyOn(navigator, 'onLine', 'get')
    onlineSpy.mockReturnValue(true)

    // Spy on event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.useRealTimers()
    onlineSpy.mockRestore()
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  describe('initial state', () => {
    it('should return online status from navigator', () => {
      const { result } = renderHook(() => useOnlineStatus())

      expect(result.current.isOnline).toBe(true)
      expect(result.current.isOffline).toBe(false)
    })

    it('should return offline status when navigator is offline', () => {
      onlineSpy.mockReturnValue(false)
      
      const { result } = renderHook(() => useOnlineStatus())

      expect(result.current.isOnline).toBe(false)
      expect(result.current.isOffline).toBe(true)
    })
  })

  describe('event listeners', () => {
    it('should register online and offline event listeners', () => {
      renderHook(() => useOnlineStatus())

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOnlineStatus())

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  describe('status changes', () => {
    it('should update status when going offline', () => {
      const { result } = renderHook(() => useOnlineStatus())

      expect(result.current.isOnline).toBe(true)

      // Simulate offline event
      act(() => {
        onlineSpy.mockReturnValue(false)
        window.dispatchEvent(new Event('offline'))
      })

      expect(result.current.isOnline).toBe(false)
      expect(result.current.isOffline).toBe(true)
    })

    it('should update status when going online with debounce', () => {
      onlineSpy.mockReturnValue(false)
      const { result } = renderHook(() => useOnlineStatus())

      expect(result.current.isOnline).toBe(false)

      // Simulate online event
      act(() => {
        onlineSpy.mockReturnValue(true)
        window.dispatchEvent(new Event('online'))
      })

      // Should still be offline due to debounce
      expect(result.current.isOnline).toBe(false)

      // Fast-forward debounce time (default 1000ms)
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.isOnline).toBe(true)
      expect(result.current.isOffline).toBe(false)
    })

    it('should use custom debounce time', () => {
      onlineSpy.mockReturnValue(false)
      const { result } = renderHook(() => useOnlineStatus({ debounceMs: 500 }))

      act(() => {
        onlineSpy.mockReturnValue(true)
        window.dispatchEvent(new Event('online'))
      })

      // Should still be offline
      expect(result.current.isOnline).toBe(false)

      // Fast-forward custom debounce time
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(result.current.isOnline).toBe(true)
    })
  })

  describe('callbacks', () => {
    it('should call onOnline callback when going online', () => {
      onlineSpy.mockReturnValue(false)
      const onOnline = vi.fn()
      
      renderHook(() => useOnlineStatus({ onOnline }))

      act(() => {
        onlineSpy.mockReturnValue(true)
        window.dispatchEvent(new Event('online'))
      })

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(onOnline).toHaveBeenCalledTimes(1)
    })

    it('should call onOffline callback when going offline', () => {
      const onOffline = vi.fn()
      
      renderHook(() => useOnlineStatus({ onOffline }))

      act(() => {
        onlineSpy.mockReturnValue(false)
        window.dispatchEvent(new Event('offline'))
      })

      expect(onOffline).toHaveBeenCalledTimes(1)
    })

    it('should not call callbacks on initial render', () => {
      const onOnline = vi.fn()
      const onOffline = vi.fn()
      
      renderHook(() => useOnlineStatus({ onOnline, onOffline }))

      expect(onOnline).not.toHaveBeenCalled()
      expect(onOffline).not.toHaveBeenCalled()
    })
  })

  describe('checkConnection', () => {
    it('should provide checkConnection method', () => {
      const { result } = renderHook(() => useOnlineStatus())

      expect(result.current.checkConnection).toBeTypeOf('function')
    })

    it('should return current online status', async () => {
      onlineSpy.mockReturnValue(true)
      const { result } = renderHook(() => useOnlineStatus())

      const status = await act(async () => {
        return await result.current.checkConnection()
      })

      expect(status).toBe(true)
    })

    it('should return offline status when offline', async () => {
      onlineSpy.mockReturnValue(false)
      const { result } = renderHook(() => useOnlineStatus())

      const status = await act(async () => {
        return await result.current.checkConnection()
      })

      expect(status).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid online/offline toggling', () => {
      const { result } = renderHook(() => useOnlineStatus({ debounceMs: 500 }))

      // Rapid toggles
      act(() => {
        onlineSpy.mockReturnValue(false)
        window.dispatchEvent(new Event('offline'))
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      act(() => {
        onlineSpy.mockReturnValue(true)
        window.dispatchEvent(new Event('online'))
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      act(() => {
        onlineSpy.mockReturnValue(false)
        window.dispatchEvent(new Event('offline'))
      })

      // Should be offline immediately (no debounce for offline)
      expect(result.current.isOnline).toBe(false)
    })

    it('should cancel debounce on unmount', () => {
      onlineSpy.mockReturnValue(false)
      const onOnline = vi.fn()
      
      const { unmount } = renderHook(() => useOnlineStatus({ onOnline }))

      act(() => {
        onlineSpy.mockReturnValue(true)
        window.dispatchEvent(new Event('online'))
      })

      unmount()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Callback should not be called after unmount
      expect(onOnline).not.toHaveBeenCalled()
    })
  })
})
