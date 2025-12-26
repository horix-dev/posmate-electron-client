/**
 * Stock Adjustment Types
 * Used for stock adjustment management and sync
 */

export interface StockAdjustment {
  id?: number
  serverId?: number
  productId: number
  variantId?: number
  batchId?: number
  type: 'in' | 'out'
  quantity: number
  reason: string
  referenceNumber?: string
  notes?: string
  adjustedBy: number
  adjustmentDate: string
  syncStatus?: 'pending' | 'synced' | 'error'
  syncError?: string
  oldQuantity?: number
  newQuantity?: number
  createdAt?: string
  updatedAt?: string
}

export interface StockAdjustmentFilters {
  startDate?: string
  endDate?: string
  type?: 'in' | 'out'
  syncStatus?: 'pending' | 'synced' | 'error'
  productId?: number
}

export interface StockAdjustmentSummary {
  totalIn: number
  totalOut: number
  netChange: number
  pendingCount: number
}

export interface StockAdjustmentApiRequest {
  product_id: number
  variant_id?: number
  batch_id?: number
  type: 'in' | 'out'
  quantity: number
  reason: string
  reference_number?: string
  notes?: string
  adjusted_by: number
  adjustment_date: string
}

export interface StockAdjustmentApiResponse {
  success: boolean
  data: {
    id: number
    product_id: number
    variant_id?: number
    batch_id?: number
    type: 'in' | 'out'
    quantity: number
    reason: string
    reference_number?: string
    notes?: string
    adjusted_by: number
    adjustment_date: string
    created_at: string
    updated_at: string
  }
  message?: string
}

// Batch information for variant products
export interface Batch {
  id: number
  // Backend may return either `batch_no` or `batch_number`
  batch_no?: string
  batch_number?: string
  product_id?: number
  variant_id?: number
  quantity: number
  purchase_price?: number
  selling_price?: number
  manufactured_date?: string
  expiry_date?: string
  // Backend batch endpoints use these field names
  mfg_date?: string | null
  expire_date?: string | null
  is_expired?: boolean
  is_expiring_soon?: boolean
  days_until_expiry?: number | null
  warehouse?: unknown
  product?: { id?: number; name?: string | null }
  created_at?: string
  updated_at?: string
}

export interface BatchMovement {
  id: number
  batch_id: number
  type: 'in' | 'out'
  quantity: number
  reference_type: string
  reference_id: number
  created_at: string
}

// Stock adjustment reasons
export const ADJUSTMENT_REASONS = [
  'Damaged/Expired',
  'Lost/Stolen',
  'Returned by Customer',
  'Found in Inventory Count',
  'Initial Stock',
  'Supplier Return',
  'Transfer In',
  'Transfer Out',
  'Other',
] as const

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number]
