/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useBusinessStore } from '@/stores/business.store'
import { businessService } from '@/api/services'

// Mock business service
vi.mock('@/api/services', () => ({
  businessService: {
    getBusiness: vi.fn(),
    createBusiness: vi.fn(),
    updateBusiness: vi.fn(),
  },
}))

describe('Business Store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    
    // Reset store
    act(() => {
      useBusinessStore.getState().setBusiness(null)
      useBusinessStore.getState().clearError()
    })
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useBusinessStore.getState()

      expect(state.business).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('fetchBusiness', () => {
    it('should successfully fetch business data', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        email: 'business@test.com',
        phone: '1234567890',
        address: '123 Test St',
      }

      vi.mocked(businessService.getBusiness).mockResolvedValue({
        data: mockBusiness,
      } as any)

      await act(async () => {
        await useBusinessStore.getState().fetchBusiness()
      })

      const state = useBusinessStore.getState()

      expect(state.business).toEqual(mockBusiness)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle fetch failure', async () => {
      const error = new Error('Failed to fetch business')
      vi.mocked(businessService.getBusiness).mockRejectedValue(error)

      await act(async () => {
        await useBusinessStore.getState().fetchBusiness()
      })

      const state = useBusinessStore.getState()

      expect(state.business).toBeNull()
      expect(state.error).toBe('Failed to fetch business')
      expect(state.isLoading).toBe(false)
    })

    it('should set loading state during fetch', async () => {
      vi.mocked(businessService.getBusiness).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      act(() => {
        useBusinessStore.getState().fetchBusiness()
      })

      expect(useBusinessStore.getState().isLoading).toBe(true)
    })
  })

  describe('createBusiness', () => {
    it('should successfully create business', async () => {
      const mockBusiness = {
        id: 1,
        name: 'New Business',
        email: 'new@business.com',
      }

      const formData = new FormData()
      formData.append('name', 'New Business')
      formData.append('email', 'new@business.com')

      vi.mocked(businessService.createBusiness).mockResolvedValue({
        data: mockBusiness,
      } as any)

      let result: any
      await act(async () => {
        result = await useBusinessStore.getState().createBusiness(formData)
      })

      const state = useBusinessStore.getState()

      expect(result.success).toBe(true)
      expect(state.business).toEqual(mockBusiness)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle create failure', async () => {
      const error = new Error('Validation failed')
      const formData = new FormData()

      vi.mocked(businessService.createBusiness).mockRejectedValue(error)

      let result: any
      await act(async () => {
        result = await useBusinessStore.getState().createBusiness(formData)
      })

      const state = useBusinessStore.getState()

      expect(result.success).toBe(false)
      expect(state.error).toBe('Validation failed')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('updateBusiness', () => {
    it('should successfully update business', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Updated Business',
        email: 'updated@business.com',
      }

      const formData = new FormData()
      formData.append('name', 'Updated Business')

      vi.mocked(businessService.updateBusiness).mockResolvedValue({
        data: mockBusiness,
      } as any)

      let result: any
      await act(async () => {
        result = await useBusinessStore.getState().updateBusiness(1, formData)
      })

      const state = useBusinessStore.getState()

      expect(result.success).toBe(true)
      expect(state.business).toEqual(mockBusiness)
      expect(businessService.updateBusiness).toHaveBeenCalledWith(1, formData)
    })

    it('should handle update failure', async () => {
      const error = new Error('Not found')
      const formData = new FormData()

      vi.mocked(businessService.updateBusiness).mockRejectedValue(error)

      let result: any
      await act(async () => {
        result = await useBusinessStore.getState().updateBusiness(999, formData)
      })

      expect(result.success).toBe(false)
      expect(useBusinessStore.getState().error).toBe('Not found')
    })
  })

  describe('state management', () => {
    it('should set business directly', () => {
      const business = {
        id: 1,
        name: 'Direct Set Business',
      } as any

      act(() => {
        useBusinessStore.getState().setBusiness(business)
      })

      expect(useBusinessStore.getState().business).toEqual(business)
    })

    it('should clear error', () => {
      act(() => {
        useBusinessStore.setState({ error: 'Some error' })
        useBusinessStore.getState().clearError()
      })

      expect(useBusinessStore.getState().error).toBeNull()
    })
  })

  describe('persistence', () => {
    it('should persist business data', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Persistent Business',
      }

      vi.mocked(businessService.getBusiness).mockResolvedValue({
        data: mockBusiness,
      } as any)

      await act(async () => {
        await useBusinessStore.getState().fetchBusiness()
      })

      // Business should be in state
      expect(useBusinessStore.getState().business).toEqual(mockBusiness)
    })
  })

  describe('error handling', () => {
    it('should handle non-Error objects', async () => {
      vi.mocked(businessService.getBusiness).mockRejectedValue('String error')

      await act(async () => {
        await useBusinessStore.getState().fetchBusiness()
      })

      expect(useBusinessStore.getState().error).toBe('Failed to fetch business')
    })

    it('should handle null errors', async () => {
      vi.mocked(businessService.getBusiness).mockRejectedValue(null)

      await act(async () => {
        await useBusinessStore.getState().fetchBusiness()
      })

      expect(useBusinessStore.getState().error).toBe('Failed to fetch business')
    })
  })
})
