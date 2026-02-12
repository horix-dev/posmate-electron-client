import { z } from 'zod'

const decimalRegex = /^\d+(?:\.\d+)?$/

const optionalDecimalString = (label: string) =>
  z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val ?? '').trim())
    .refine((val) => val === '' || decimalRegex.test(val), {
      message: `${label} must be a valid number`,
    })

export const batchEntrySchema = z.object({
  batch_no: z
    .string()
    .trim()
    .min(1, 'Batch number is required')
    .max(100, 'Batch number must be less than 100 characters'),
  productStock: z
    .string()
    .trim()
    .min(1, 'Quantity is required')
    .regex(/^[0-9]+$/, 'Quantity must be a whole number'),
  productPurchasePrice: optionalDecimalString('Purchase price'),
  productSalePrice: optionalDecimalString('Sale price'),
  productWholeSalePrice: optionalDecimalString('Wholesale price'),
  productDealerPrice: optionalDecimalString('Dealer price'),
  mfg_date: z.string().optional().or(z.literal('')),
  expire_date: z.string().optional().or(z.literal('')),
})

export type BatchFormValue = z.infer<typeof batchEntrySchema>

/**
 * Variant input schema for variable products
 */
export const variantInputSchema = z.object({
  id: z.number().optional(), // Existing variant ID for updates
  sku: z.string().optional(),
  barcode: z.string().optional(),
  initial_stock: z.number().int().min(0).optional(),
  enabled: z.union([z.literal(0), z.literal(1)]).default(1),
  cost_price: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  dealer_price: z.number().min(0).optional(),
  wholesale_price: z.number().min(0).optional(),
  is_active: z.union([z.literal(0), z.literal(1)]).default(1),
  attribute_value_ids: z.array(z.number()).min(1, 'At least one attribute value is required'),
})

export type VariantInputData = z.infer<typeof variantInputSchema>

/**
 * Product form validation schema
 * Uses zod for type-safe runtime validation
 */
export const productFormSchema = z.object({
  productName: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters')
    .trim(),

  productCode: z
    .string()
    .max(100, 'Product code must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  barcode: z
    .string()
    .max(100, 'Barcode must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),

  category_id: z.string().optional().or(z.literal('')),

  brand_id: z.string().optional().or(z.literal('')),

  unit_id: z.string().optional().or(z.literal('')),

  alert_qty: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().regex(/^\d*$/, 'Alert quantity must be a positive number').optional()),

  product_type: z.enum(['simple', 'variable']).default('simple'),

  is_batch_tracked: z.boolean().default(false),

  batches: z.array(batchEntrySchema).default([]),

  productPurchasePrice: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val))
    .pipe(
      z
        .string()
        .regex(/^\d*\.?\d*$/, 'Purchase price must be a valid number')
        .optional()
    ),

  productSalePrice: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val))
    .pipe(
      z
        .string()
        .regex(/^\d*\.?\d*$/, 'Sale price must be a valid number')
        .optional()
    ),

  productStock: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().regex(/^\d*$/, 'Stock must be a positive number').optional()),

  // Description field for products
  description: z.string().optional(),
})
// Note: variants are managed separately in component state and validated in handleSubmit

export type ProductFormData = z.infer<typeof productFormSchema>

/**
 * Default form values
 */
export const defaultProductFormValues: ProductFormData = {
  productName: '',
  productCode: '',
  barcode: '',
  category_id: '',
  brand_id: '',
  unit_id: '',
  alert_qty: '',
  product_type: 'simple',
  is_batch_tracked: false,
  productPurchasePrice: '',
  productSalePrice: '',
  productStock: '',
  description: '',
  batches: [],
}

/**
 * Convert Product to form data for editing
 */
const normalizeBoolean = (value?: boolean | number | string | null): boolean => {
  if (value === true || value === '1' || value === 1) return true
  if (value === false || value === '0' || value === 0) return false
  return false
}

export function productToFormData(product: {
  productName: string
  productCode?: string | null
  barcode?: string | null
  category_id?: number | null
  brand_id?: number | null
  unit_id?: number | null
  alert_qty?: number | null
  product_type: 'simple' | 'variable' | 'variant' | 'single'
  is_batch_tracked?: boolean
  description?: string | null
  stocks?: Array<{
    productPurchasePrice: number
    productSalePrice: number
    productStock: number
    batch_no?: string | null
    mfg_date?: string | null
    expire_date?: string | null
    productWholeSalePrice?: number | null
    productDealerPrice?: number | null
  }>
  variants?: Array<{
    id?: number
    price?: number | null
    cost_price?: number | null
    dealer_price?: number | null
    wholesale_price?: number | null
    is_active: boolean
    attribute_value_ids?: number[]
    attribute_values?: Array<{ id: number }>
    sku?: string | null
    barcode?: string | null
    initial_stock?: number | null
  }>
}): ProductFormData & { variants: VariantInputData[] } {
  const stock = product.stocks?.[0]

  // Backend may send legacy/alias types (e.g. 'single'). Normalize to form schema values.
  const normalizedProductType: 'simple' | 'variable' =
    product.product_type === 'variable'
      ? 'variable'
      : // Treat everything else as simple in this form
        'simple'

  // Convert existing variants to form format
  const variants: VariantInputData[] =
    product.variants?.map((v) => ({
      id: v.id, // Preserve variant ID for updates
      sku: v.sku || '',
      barcode: v.barcode || '',
      initial_stock: v.initial_stock ?? undefined,
      enabled: 1 as const,
      cost_price: v.cost_price ?? undefined,
      price: v.price ?? undefined,
      dealer_price: v.dealer_price ?? undefined,
      wholesale_price: v.wholesale_price ?? undefined,
      is_active: v.is_active ? (1 as const) : (0 as const),
      attribute_value_ids: v.attribute_value_ids
        ? v.attribute_value_ids
        : v.attribute_values?.map((av) => av.id) || [],
    })) || []

  return {
    productName: product.productName,
    productCode: product.productCode || '',
    barcode: product.barcode || '',
    category_id: product.category_id?.toString() || '',
    brand_id: product.brand_id?.toString() || '',
    unit_id: product.unit_id?.toString() || '',
    alert_qty: product.alert_qty?.toString() || '',
    product_type: normalizedProductType,
    is_batch_tracked: normalizeBoolean(product.is_batch_tracked),
    productPurchasePrice: stock?.productPurchasePrice?.toString() || '',
    productSalePrice: stock?.productSalePrice?.toString() || '',
    productStock: stock?.productStock?.toString() || '',
    variants,
    description: product.description || '',
    batches:
      product.is_batch_tracked && product.stocks
        ? product.stocks.map((batchStock) => ({
            batch_no: batchStock.batch_no || '',
            productStock: batchStock.productStock?.toString() || '',
            productPurchasePrice: batchStock.productPurchasePrice?.toString() || '',
            productSalePrice: batchStock.productSalePrice?.toString() || '',
            productWholeSalePrice: batchStock.productWholeSalePrice?.toString() || '',
            productDealerPrice: batchStock.productDealerPrice?.toString() || '',
            mfg_date: batchStock.mfg_date || '',
            expire_date: batchStock.expire_date || '',
          }))
        : [],
  }
}

/**
 * Convert form data to FormData for API submission (simple products)
 * @param data - Form data from the product form
 * @param imageFile - Optional image file
 * @param isEdit - If true, excludes productStock field (stock adjustments use separate API)
 */
export function formDataToFormData(
  data: ProductFormData,
  imageFile?: File | null,
  isEdit = false
): FormData {
  const formData = new FormData()

  formData.append('productName', data.productName)

  if (data.productCode) {
    formData.append('productCode', data.productCode)
  }
  if (data.barcode) {
    formData.append('barcode', data.barcode)
  }
  if (data.category_id) {
    formData.append('category_id', data.category_id)
  }
  if (data.brand_id) {
    formData.append('brand_id', data.brand_id)
  }
  if (data.unit_id) {
    formData.append('unit_id', data.unit_id)
  }
  if (data.alert_qty) {
    formData.append('alert_qty', data.alert_qty)
  }

  const hasBatchRows = data.is_batch_tracked && data.batches && data.batches.length > 0
  const effectiveProductType = hasBatchRows ? 'variant' : data.product_type

  formData.append('product_type', effectiveProductType)
  formData.append('is_batch_tracked', data.is_batch_tracked ? '1' : '0')

  const firstBatch = data.batches?.[0]
  const purchasePriceValue = data.productPurchasePrice || firstBatch?.productPurchasePrice
  const salePriceValue = data.productSalePrice || firstBatch?.productSalePrice

  if (purchasePriceValue) {
    formData.append('productPurchasePrice', purchasePriceValue)
  }
  if (salePriceValue) {
    formData.append('productSalePrice', salePriceValue)
  }

  if (!isEdit) {
    if (hasBatchRows) {
      formData.append('inventory_tracking_mode', 'batch')
      data.batches.forEach((batch, index) => {
        formData.append(`batch_no[${index}]`, batch.batch_no)
        formData.append(`productStock[${index}]`, batch.productStock)

        if (batch.productPurchasePrice) {
          formData.append(`productPurchasePrice[${index}]`, batch.productPurchasePrice)
        }
        if (batch.productSalePrice) {
          formData.append(`productSalePrice[${index}]`, batch.productSalePrice)
        }
        if (batch.productWholeSalePrice) {
          formData.append(`productWholeSalePrice[${index}]`, batch.productWholeSalePrice)
        }
        if (batch.productDealerPrice) {
          formData.append(`productDealerPrice[${index}]`, batch.productDealerPrice)
        }
        if (batch.mfg_date) {
          formData.append(`mfg_date[${index}]`, batch.mfg_date)
        }
        if (batch.expire_date) {
          formData.append(`expire_date[${index}]`, batch.expire_date)
        }
      })
    } else if (data.productStock) {
      formData.append('productStock', data.productStock)
    }
  }
  if (imageFile) {
    formData.append('productPicture', imageFile)
  }

  return formData
}

/**
 * Product payload for variable products (JSON body)
 */
export interface VariableProductPayload {
  productName: string
  productCode?: string
  category_id?: number
  brand_id?: number
  unit_id?: number
  alert_qty?: number
  product_type: 'variable'
  is_batch_tracked: boolean
  description?: string
  variants: VariantInputData[]
}

/**
 * Convert form data to JSON payload for variable products
 * @param data - Form data from the product form
 * @param variants - Variants managed separately in VariantManager
 * @param imageFile - Optional image file (not used in JSON payload, handled separately)
 */
export function formDataToVariableProductPayload(
  data: ProductFormData,
  variants: VariantInputData[]
): VariableProductPayload {
  return {
    productName: data.productName,
    productCode: data.productCode || undefined,
    category_id: data.category_id ? parseInt(data.category_id, 10) : undefined,
    brand_id: data.brand_id ? parseInt(data.brand_id, 10) : undefined,
    unit_id: data.unit_id ? parseInt(data.unit_id, 10) : undefined,
    alert_qty: data.alert_qty ? parseInt(data.alert_qty, 10) : undefined,
    product_type: 'variable',
    is_batch_tracked: data.is_batch_tracked,
    description: data.description || undefined,
    variants: variants,
  }
}
