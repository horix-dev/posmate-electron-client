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
  initial_stock: z
    .number({ required_error: 'Stock is required' })
    .int('Stock must be an integer')
    .min(0, 'Stock must be 0 or greater'),
  enabled: z.union([z.literal(0), z.literal(1)]).default(1),
  cost_price: z
    .number({ required_error: 'Cost price is required' })
    .min(0.01, 'Cost price must be greater than 0'),
  price: z
    .number({ required_error: 'Sale price is required' })
    .min(0.01, 'Sale price must be greater than 0'),
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
export const productFormSchema = z
  .object({
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
    is_combo_product: z.boolean().default(false),
    combo_products: z
      .array(
        z.object({
          product_id: z.number(),
          quantity: z.number().min(1, 'Quantity must be at least 1'),
          productName: z.string().optional(),
          productCode: z.string().optional(),
          productPurchasePrice: z.number().optional(),
          productSalePrice: z.number().optional(),
          availableStock: z.number().optional(),
        })
      )
      .default([]),
    combo_discount_type: z.enum(['none', 'percentage', 'fixed']).default('none'),
    combo_discount_value: z.number().min(0).default(0),
    productPurchasePrice: z
      .string()
      .regex(/^\d*\.?\d*$/, 'Purchase price must be a valid number')
      .optional()
      .or(z.literal('')),
    productSalePrice: z
      .string()
      .regex(/^\d*\.?\d*$/, 'Sale price must be a valid number')
      .optional()
      .or(z.literal('')),
    productStock: z
      .string()
      .regex(/^\d*$/, 'Stock must be a positive number')
      .optional()
      .or(z.literal('')),

    // Description field for products
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Skip price and stock validation for batch-tracked and combo products (managed separately)
    if (data.product_type === 'simple' && !data.is_batch_tracked && !data.is_combo_product) {
      if (
        !data.productPurchasePrice ||
        isNaN(Number(data.productPurchasePrice)) ||
        Number(data.productPurchasePrice) <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['productPurchasePrice'],
          message: 'Purchase price is required',
        })
      }
      if (
        !data.productSalePrice ||
        isNaN(Number(data.productSalePrice)) ||
        Number(data.productSalePrice) <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['productSalePrice'],
          message: 'Sale price is required',
        })
      }
      if (!data.productStock || isNaN(Number(data.productStock)) || Number(data.productStock) < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['productStock'],
          message: 'Stock is required',
        })
      }
    }

    // Combo product validation
    if (data.is_combo_product) {
      if (!data.combo_products || data.combo_products.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['combo_products'],
          message: 'At least one product must be selected for combo products',
        })
      }
    }
  })

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
  batches: [],
  is_combo_product: false,
  combo_products: [],
  combo_discount_type: 'none' as const,
  combo_discount_value: 0,
  productPurchasePrice: '',
  productSalePrice: '',
  productStock: '',
  description: '',
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
  is_combo_product?: boolean
  combo_products?: Array<{
    id?: number
    product_id: number
    quantity: number
    productName?: string // Make productName optional to match ComboProductItem
    productCode?: string
    productPurchasePrice?: number
    productSalePrice?: number
    availableStock?: number
  }>
  combo_components?: Array<{
    id: number
    component_product_id: number
    quantity: string | number
    component_product: {
      id: number
      productName: string
      productCode?: string
      stocks?: Array<{
        productStock: number
        productPurchasePrice: number
        productSalePrice: number
      }>
    }
  }>
  combo_discount_type?: 'none' | 'percentage' | 'fixed'
  combo_discount_value?: number | string
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
      initial_stock: v.initial_stock ?? 0,
      enabled: 1 as const,
      cost_price: v.cost_price ?? 0.01,
      price: v.price ?? 0.01,
      dealer_price: v.dealer_price ?? 0,
      wholesale_price: v.wholesale_price ?? 0,
      is_active: v.is_active ? (1 as const) : (0 as const),
      attribute_value_ids: v.attribute_value_ids
        ? v.attribute_value_ids
        : v.attribute_values?.map((av) => av.id) || [],
    })) || []

  const comboProducts =
    product.combo_components?.map((component) => {
      const componentStock = component.component_product.stocks?.[0]
      return {
        product_id: component.component_product_id,
        quantity: Number(component.quantity),
        productName: component.component_product.productName,
        productCode: component.component_product.productCode,
        productPurchasePrice: componentStock?.productPurchasePrice,
        productSalePrice: componentStock?.productSalePrice,
        availableStock: componentStock?.productStock,
      }
    }) || []

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
    is_combo_product: normalizeBoolean(product.is_combo_product),
    combo_products: comboProducts,
    combo_discount_type: (product.combo_discount_type as 'none' | 'percentage' | 'fixed') || 'none',
    combo_discount_value:
      typeof product.combo_discount_value === 'string'
        ? parseFloat(product.combo_discount_value)
        : product.combo_discount_value || 0,
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
  formData.append('is_combo_product', data.is_combo_product ? '1' : '0')

  const firstBatch = data.batches?.[0]
  const purchasePriceValue = data.productPurchasePrice || firstBatch?.productPurchasePrice
  const salePriceValue = data.productSalePrice || firstBatch?.productSalePrice

  if (purchasePriceValue) {
    formData.append('productPurchasePrice', purchasePriceValue)
  }
  if (salePriceValue) {
    formData.append('productSalePrice', salePriceValue)
  }

  if (hasBatchRows) {
    formData.append('inventory_tracking_mode', 'batch')
    data.batches.forEach((batch, index) => {
      formData.append(`batch_no[${index}]`, batch.batch_no)

      // Only include stock data for new products, not edits
      if (!isEdit) {
        formData.append(`productStock[${index}]`, batch.productStock)
      }

      // Always include price and date data (for both new and edit)
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
  } else if (!isEdit && data.productStock) {
    // Only include simple product stock for new products
    formData.append('productStock', data.productStock)
  }

  // Handle combo products
  if (data.is_combo_product && data.combo_products && data.combo_products.length > 0) {
    data.combo_products.forEach((comboProduct, index) => {
      formData.append(`combo_products[${index}][product_id]`, comboProduct.product_id.toString())
      formData.append(`combo_products[${index}][quantity]`, comboProduct.quantity.toString())
    })

    // Add discount fields
    if (data.combo_discount_type) {
      formData.append('combo_discount_type', data.combo_discount_type)
    }
    if (data.combo_discount_value) {
      formData.append('combo_discount_value', data.combo_discount_value.toString())
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
