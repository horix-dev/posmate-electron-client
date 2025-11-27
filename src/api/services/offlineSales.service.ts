/**
 * Offline-Aware Sales Service
 * Wraps the sales service to handle offline scenarios
 */

import { salesService } from '@/api/services/sales.service'
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
    
    // Generate temporary invoice number
    const tempInvoiceNo = `OFFLINE-${Date.now()}`

    // Create local sale record
    const localSale: Omit<LocalSale, 'id' | 'isOffline' | 'isSynced'> = {
      invoiceNumber: tempInvoiceNo,
      customerId: saleData.party_id || null,
      saleDate: saleData.saleDate || new Date().toISOString(),
      totalAmount: saleData.totalAmount,
      discountAmount: saleData.discountAmount || 0,
      paidAmount: saleData.paidAmount,
      dueAmount: saleData.dueAmount || 0,
      paymentTypeId: saleData.payment_type_id || null,
      note: saleData.note || null,
      // These fields are required by Sale interface
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tempId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    } as any

    // Save to IndexedDB
    const localId = await saleRepository.createOffline(localSale as any)

    // Add to sync queue
    await syncQueueRepository.enqueue({
      operation: 'CREATE',
      entity: 'sale',
      entityId: localId,
      data: saleData,
      endpoint: '/sales',
      method: 'POST',
      maxAttempts: 5,
      attempts: 0,
      createdAt: new Date().toISOString(),
      status: 'pending',
    })

    // Update pending sync count
    await syncStore.updatePendingSyncCount()

    // Return a mock response
    const mockSale: Sale = {
      id: localId,
      invoiceNumber: tempInvoiceNo,
      customerId: saleData.party_id || null,
      saleDate: saleData.saleDate || new Date().toISOString(),
      totalAmount: saleData.totalAmount,
      discountAmount: saleData.discountAmount || 0,
      paidAmount: saleData.paidAmount,
      dueAmount: saleData.dueAmount || 0,
      paymentTypeId: saleData.payment_type_id || null,
      note: saleData.note || null,
      // Add other required Sale fields
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
