import * as z from 'zod'

/**
 * Stock Adjustment Form Schema
 */
export const stockAdjustmentFormSchema = z.object({
  productId: z.number().positive('Please select a product'),
  variantId: z.number().optional(),
  batchId: z.number().optional(),
  type: z.enum(['in', 'out'], {
    required_error: 'Please select adjustment type',
  }),
  quantity: z.number().positive('Quantity must be greater than 0'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  adjustmentDate: z.string().optional(),
})

export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentFormSchema>

export const defaultStockAdjustmentFormValues: StockAdjustmentFormData = {
  productId: 0,
  type: 'in',
  quantity: 1,
  reason: '',
  referenceNumber: '',
  notes: '',
  adjustmentDate: new Date().toISOString().split('T')[0],
}
