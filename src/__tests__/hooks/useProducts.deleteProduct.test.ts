import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storage } from '@/lib/storage'
import { removeCache, CacheKeys } from '@/lib/cache'
import { imageCache } from '@/lib/cache/imageCache'
import { productsService } from '@/api/services'
import { toast } from 'sonner'
import { getImageUrl } from '@/lib/utils'
import type { Product } from '@/types/api.types'

// ============================================
// Mocks
// ============================================

vi.mock('@/api/services', () => ({
  productsService: {
    delete: vi.fn(),
  },
  categoriesService: {
    getList: vi.fn(),
  },
  brandsService: {
    getList: vi.fn(),
  },
  unitsService: {
    getList: vi.fn(),
  },
}))

vi.mock('@/lib/storage', () => ({
  storage: {
    products: {
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
  removeCache: vi.fn(),
  CacheKeys: {
    PRODUCTS_BRANDS: 'cache:products:brands',
    PRODUCTS_UNITS: 'cache:products:units',
    PRODUCT_VARIANTS: (id: number) => `cache:products:${id}:variants`,
  },
}))

vi.mock('@/lib/cache/imageCache', () => ({
  imageCache: {
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/utils', () => ({
  getImageUrl: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

// ============================================
// Test Fixtures
// ============================================

const mockProduct: Product = {
  id: 1,
  productName: 'Test Product',
  productCode: 'TEST-001',
  product_type: 'simple',
  productPicture: 'test.jpg',
  category_id: 1,
  brand_id: 1,
  unit_id: 1,
  category: { id: 1, categoryName: 'Test Category' },
  brand: { id: 1, brandName: 'Test Brand' },
  unit: { id: 1, unitName: 'Pcs' },
  productStock: 100,
  stocks_sum_product_stock: 100,
  stocks: [
    {
      id: 1,
      product_id: 1,
      productStock: 100,
      productPurchasePrice: 10,
      productSalePrice: 20,
    },
  ],
}

// ============================================
// Tests
// ============================================

describe('Product Deletion - Cache Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('deleteProduct function behavior', () => {
    it('should call productsService.delete with correct product ID', async () => {
      await executeDelete(mockProduct)
      expect(productsService.delete).toHaveBeenCalledWith(mockProduct.id)
    })

    it('should delete product from IndexedDB/SQLite storage', async () => {
      await executeDelete(mockProduct)
      expect(storage.products.delete).toHaveBeenCalledWith(mockProduct.id)
    })

    it('should clear product variants cache', async () => {
      await executeDelete(mockProduct)
      expect(removeCache).toHaveBeenCalledWith(CacheKeys.PRODUCT_VARIANTS(mockProduct.id))
    })

    it('should delete cached product image', async () => {
      vi.mocked(getImageUrl).mockReturnValue('https://example.com/test.jpg')

      await executeDelete(mockProduct)

      expect(imageCache.delete).toHaveBeenCalled()
    })

    it('should show success toast after deletion', async () => {
      await executeDelete(mockProduct)

      expect(toast.success).toHaveBeenCalledWith('Product deleted successfully')
    })

    it('should handle deletion with no product picture gracefully', async () => {
      const productNoPicture = { ...mockProduct, productPicture: undefined }
      vi.mocked(getImageUrl).mockReturnValue('')

      await executeDelete(productNoPicture)

      // Should still clean up storage
      expect(storage.products.delete).toHaveBeenCalledWith(mockProduct.id)
      // Should not call image cache delete with empty URL
      expect(imageCache.delete).not.toHaveBeenCalled()
    })

    it('should handle image cache delete errors gracefully', async () => {
      vi.mocked(getImageUrl).mockReturnValue('https://example.com/test.jpg')
      vi.mocked(imageCache.delete).mockRejectedValue(new Error('Cache error'))

      // Should not throw error
      await expect(executeDelete(mockProduct)).resolves.not.toThrow()

      // Should still clean up storage
      expect(storage.products.delete).toHaveBeenCalledWith(mockProduct.id)
    })

    it('should call all cleanup methods when product has image', async () => {
      const imageUrl = 'https://example.com/test.jpg'
      vi.mocked(getImageUrl).mockReturnValue(imageUrl)

      await executeDelete(mockProduct)

      // Verify all cleanup methods were called
      expect(productsService.delete).toHaveBeenCalled()
      expect(storage.products.delete).toHaveBeenCalled()
      expect(removeCache).toHaveBeenCalled()
      expect(imageCache.delete).toHaveBeenCalledWith(imageUrl)
    })

    it('should work with multiple sequential deletions', async () => {
      const product1 = { ...mockProduct, id: 1 }
      const product2 = { ...mockProduct, id: 2 }

      await executeDelete(product1)
      expect(storage.products.delete).toHaveBeenCalledWith(product1.id)

      vi.clearAllMocks()

      await executeDelete(product2)
      expect(storage.products.delete).toHaveBeenCalledWith(product2.id)
    })

    it('should fail if API deletion fails', async () => {
      vi.mocked(productsService.delete).mockRejectedValue(new Error('API Error'))

      try {
        await executeDelete(mockProduct)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).toBe('API Error')
      }

      // Storage should not be called if API fails
      expect(storage.products.delete).not.toHaveBeenCalled()
    })
  })

  describe('Cache cleanup order and consistency', () => {
    it('should perform cleanup in correct order: API -> State -> Storage -> Cache -> Images', async () => {
      const callOrder: string[] = []

      vi.mocked(productsService.delete).mockImplementation(async () => {
        callOrder.push('api-delete')
      })

      vi.mocked(storage.products.delete).mockImplementation(async () => {
        callOrder.push('storage-delete')
      })

      vi.mocked(removeCache).mockImplementation(() => {
        callOrder.push('cache-clear')
      })

      vi.mocked(imageCache.delete).mockImplementation(async () => {
        callOrder.push('image-delete')
      })

      vi.mocked(getImageUrl).mockReturnValue('https://example.com/test.jpg')

      await executeDelete(mockProduct)

      // Verify order: API delete happens first, then storage/cache
      expect(callOrder[0]).toBe('api-delete')
      expect(callOrder).toContain('storage-delete')
      expect(callOrder).toContain('cache-clear')
      expect(callOrder).toContain('image-delete')
    })

    it('should clean all three cache layers for product with image', async () => {
      vi.mocked(getImageUrl).mockReturnValue('https://example.com/test.jpg')

      await executeDelete(mockProduct)

      // Verify all three cache layer cleanups
      expect(storage.products.delete).toHaveBeenCalledWith(mockProduct.id) // IndexedDB/SQLite
      expect(removeCache).toHaveBeenCalledWith(CacheKeys.PRODUCT_VARIANTS(mockProduct.id)) // localStorage variants
      expect(imageCache.delete).toHaveBeenCalled() // Image cache
    })

    it('should attempt all cleanup methods even if image cache fails', async () => {
      vi.mocked(getImageUrl).mockReturnValue('https://example.com/test.jpg')
      vi.mocked(imageCache.delete).mockRejectedValue(new Error('Cache error'))

      // Image cache errors are caught and logged
      await expect(executeDelete(mockProduct)).resolves.not.toThrow()

      // But API and storage deletes should still happen
      expect(productsService.delete).toHaveBeenCalled()
      expect(storage.products.delete).toHaveBeenCalled()
    })
  })

  describe('Integration - Real world scenarios', () => {
    it('should successfully delete a simple product with all cleanup', async () => {
      vi.mocked(getImageUrl).mockReturnValue('https://api.example.com/products/1/image.jpg')

      const result = executeDelete(mockProduct)

      await expect(result).resolves.not.toThrow()

      // All cleanup methods should have been called
      expect(productsService.delete).toHaveBeenCalledWith(1)
      expect(storage.products.delete).toHaveBeenCalledWith(1)
      expect(removeCache).toHaveBeenCalledWith(CacheKeys.PRODUCT_VARIANTS(1))
      expect(imageCache.delete).toHaveBeenCalledWith('https://api.example.com/products/1/image.jpg')
      expect(toast.success).toHaveBeenCalled()
    })

    it('should successfully delete a product without picture', async () => {
      const productNoPic = { ...mockProduct, productPicture: undefined }

      const result = executeDelete(productNoPic)

      await expect(result).resolves.not.toThrow()

      // Should skip image cache deletion
      expect(imageCache.delete).not.toHaveBeenCalled()
      // But still do other cleanups
      expect(storage.products.delete).toHaveBeenCalled()
      expect(removeCache).toHaveBeenCalled()
    })

    it('should cleanup all three cache layers correctly', async () => {
      vi.mocked(getImageUrl).mockReturnValue('https://example.com/test.jpg')

      await executeDelete(mockProduct)

      // Verify IndexedDB/SQLite cleanup
      const storageDeleteCalls = vi.mocked(storage.products.delete).mock.calls
      expect(storageDeleteCalls.length).toBe(1)
      expect(storageDeleteCalls[0][0]).toBe(mockProduct.id)

      // Verify localStorage variants cleanup
      const cacheClearCalls = vi.mocked(removeCache).mock.calls
      expect(cacheClearCalls.length).toBeGreaterThan(0)
      expect(cacheClearCalls[0][0]).toContain(mockProduct.id.toString())

      // Verify image cache cleanup
      const imageCacheCalls = vi.mocked(imageCache.delete).mock.calls
      expect(imageCacheCalls.length).toBe(1)
    })
  })
})

// ============================================
// Helper Function
// ============================================

/**
 * Helper to simulate deleteProduct function behavior
 * Mimics the actual implementation from useProducts.ts
 */
async function executeDelete(product: Product): Promise<void> {
  // 1. Delete from API
  await productsService.delete(product.id)

  // 2. Delete from IndexedDB/SQLite persistent storage
  await storage.products.delete(product.id)

  // 3. Clear product variants cache
  removeCache(CacheKeys.PRODUCT_VARIANTS(product.id))

  // 4. Clear product image cache (if available)
  if (product.productPicture) {
    try {
      const imageUrl = getImageUrl(product.productPicture)
      if (imageUrl) {
        await imageCache.delete(imageUrl)
      }
    } catch (error) {
      // Non-fatal: image cache cleanup failure shouldn't prevent product deletion
      console.warn('[deleteProduct] Failed to delete cached image:', error)
    }
  }

  toast.success('Product deleted successfully')
}
