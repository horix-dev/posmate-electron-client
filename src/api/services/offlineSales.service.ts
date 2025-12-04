/**
 * Offline-Aware Sales Service
 * Wraps the sales service to handle offline scenarios
 * 
 * Uses backend sync API format:
 * - Idempotency keys for duplicate prevention
 * - Device-specific offline invoice numbers
 * - Batch sync compatible data format
 */

import { salesService } from '@/api/services/sales.service'
import { syncApiService } from '@/api/services/sync.service'
import { saleRepository, syncQueueRepository } from '@/lib/db/repositories'
import { useSyncStore } from '@/stores/sync.store'
import { isOfflineQueuedError } from '@/api/offlineHandler'
import type { CreateSaleRequest, Sale } from '@/types/api.types'
import type { LocalSale } from '@/lib/db/schema'

export const offlineSalesService = {
  /**
   * Create sale - works offline
   */
  async create(saleData: CreateSaleRequest): Promise<{ data: Sale; isOffline: boolean }> {
    const syncStore = useSyncStore.getState()
    const isOnline = syncStore.isOnline

    // Try online first if we think we're online
    if (isOnline) {
      try {
        const response = await salesService.create(saleData)
        return {
          data: response.data,
          isOffline: false,
        }
      } catch (error) {
        // If it failed due to offline, fall through to offline handling
        if (!isOfflineQueuedError(error)) {
          throw error
        }
        console.log('[Offline Sales] API call failed, saving locally...')
      }
    }

    // Save offline
    console.log('[Offline Sales] Creating sale offline...')
    
    // Generate offline invoice number in backend-expected format
    const offlineInvoiceNo = syncApiService.generateOfflineInvoiceNo()
    
    // Generate idempotency key for this sale
    const idempotencyKey = syncApiService.generateIdempotencyKey('sale', 'create')
    
    // Create temp ID for local reference
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    // Create local sale record
    const localSale: Omit<LocalSale, 'id' | 'isOffline' | 'isSynced'> = {
      invoiceNumber: offlineInvoiceNo,
      customerId: saleData.party_id || null,
      saleDate: saleData.saleDate || now,
      totalAmount: saleData.totalAmount,
      discountAmount: saleData.discountAmount || 0,
      paidAmount: saleData.paidAmount,
      dueAmount: saleData.dueAmount || 0,
      paymentTypeId: saleData.payment_type_id || null,
      note: saleData.note || null,
      createdAt: now,
      updatedAt: now,
      tempId,
    } as any

    // Save to IndexedDB
    const localId = await saleRepository.createOffline(localSale as any)

    // Format data for backend batch sync
    // Parse products from JSON string if needed
    let parsedProducts: Array<{ 
      stock_id: number
      quantities: number
      price: number
      lossProfit?: number
      variant_id?: number
      variant_name?: string
    }> = []
    try {
      if (typeof saleData.products === 'string') {
        parsedProducts = JSON.parse(saleData.products)
      }
    } catch {
      console.warn('[Offline Sales] Failed to parse products JSON')
    }

    const batchSyncData = {
      local_id: localId,
      offline_invoice_no: offlineInvoiceNo,
      party_id: saleData.party_id,
      totalAmount: saleData.totalAmount,
      paidAmount: saleData.paidAmount,
      dueAmount: saleData.dueAmount || 0,
      isPaid: (saleData.dueAmount || 0) === 0,
      discountAmount: saleData.discountAmount || 0,
      vat_amount: saleData.vat_amount || 0,
      payment_type_id: saleData.payment_type_id,
      saleDate: saleData.saleDate || now,
      meta: {
        note: saleData.note,
        customer_phone: saleData.customer_phone,
      },
      products: parsedProducts.map(p => ({
        stock_id: p.stock_id,
        quantities: p.quantities,
        price: p.price,
        lossProfit: p.lossProfit || 0,
        // Include variant info if present
        variant_id: p.variant_id,
        variant_name: p.variant_name,
      })),
    }

    // Add to sync queue with idempotency key
    await syncQueueRepository.enqueue({
      idempotencyKey,
      operation: 'CREATE',
      entity: 'sale',
      entityId: localId,
      data: batchSyncData,
      endpoint: '/sync/batch', // Will be processed via batch sync
      method: 'POST',
      maxAttempts: 5,
      attempts: 0,
      createdAt: now,
      offlineTimestamp: now,
      status: 'pending',
    })

    // Update pending sync count
    await syncStore.updatePendingSyncCount()

    // Return a mock response
    const mockSale: Sale = {
      id: localId,
      invoiceNumber: offlineInvoiceNo,
      customerId: saleData.party_id || null,
      saleDate: saleData.saleDate || now,
      totalAmount: saleData.totalAmount,
      discountAmount: saleData.discountAmount || 0,
      paidAmount: saleData.paidAmount,
      dueAmount: saleData.dueAmount || 0,
      paymentTypeId: saleData.payment_type_id || null,
      note: saleData.note || null,
      createdAt: now,
      updatedAt: now,
      saleItems: [],
    } as Sale

    return {
      data: mockSale,
      isOffline: true,
    }
  },

  /**
   * Get all sales - falls back to local when offline
   */
  async getAll(): Promise<Sale[]> {
    const syncStore = useSyncStore.getState()

    if (syncStore.isOnline) {
      try {
        const response = await salesService.getAll()
        return response.data
      } catch (error) {
        console.log('[Offline Sales] Failed to fetch from API, using local data')
      }
    }

    // Fallback to local data
    const localSales = await saleRepository.getAll()
    return localSales as unknown as Sale[]
  },

  /**
   * Get sale by ID - falls back to local when offline
   */
  async getById(id: number): Promise<Sale | null> {
    const syncStore = useSyncStore.getState()

    if (syncStore.isOnline) {
      try {
        const response = await salesService.getById(id)
        return response.data
      } catch (error) {
        console.log('[Offline Sales] Failed to fetch from API, using local data')
      }
    }

    // Fallback to local data
    const localSale = await saleRepository.getById(id)
    return localSale as unknown as Sale
  },

  /**
   * Get offline sales count
   */
  async getOfflineSalesCount(): Promise<number> {
    return await saleRepository.countPendingSync()
  },

  /**
   * Get offline sales
   */
  async getOfflineSales(): Promise<LocalSale[]> {
    return await saleRepository.getOfflineSales()
  },
}
