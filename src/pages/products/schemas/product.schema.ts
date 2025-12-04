import { z } from 'zod'

/**
 * Variant input schema for variable products
 */
export const variantInputSchema = z.object({
  sku: z.string().optional(),
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

  category_id: z.string().optional().or(z.literal('')),

  brand_id: z.string().optional().or(z.literal('')),

  unit_id: z.string().optional().or(z.literal('')),

  alert_qty: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val))
    .pipe(
      z
        .string()
        .regex(/^\d*$/, 'Alert quantity must be a positive number')
        .optional()
    ),

  product_type: z.enum(['simple', 'variable']).default('simple'),

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
    .pipe(
      z
        .string()
        .regex(/^\d*$/, 'Stock must be a positive number')
        .optional()
    ),

  // Variants for variable products - managed separately
  variants: z.array(variantInputSchema).optional(),

  // Description field for products
  description: z.string().optional(),
})

export type ProductFormData = z.infer<typeof productFormSchema>

/**
 * Default form values
 */
export const defaultProductFormValues: ProductFormData = {
  productName: '',
  productCode: '',
  category_id: '',
  brand_id: '',
  unit_id: '',
  alert_qty: '',
  product_type: 'simple',
  productPurchasePrice: '',
  productSalePrice: '',
  productStock: '',
  variants: [],
  description: '',
}

/**
 * Convert Product to form data for editing
 */
export function productToFormData(product: {
  productName: string
  productCode?: string | null
  category_id?: number | null
  brand_id?: number | null
  unit_id?: number | null
  alert_qty?: number | null
  product_type: 'simple' | 'variable'
  description?: string | null
  stocks?: Array<{
    productPurchasePrice: number
    productSalePrice: number
    productStock: number
  }>
  variants?: Array<{
    sku: string
    price?: number | null
    cost_price?: number | null
    dealer_price?: number | null
    wholesale_price?: number | null
    is_active: boolean
    attribute_values?: Array<{ id: number }>
  }>
}): ProductFormData {
  const stock = product.stocks?.[0]

  // Convert existing variants to form format
  const variants: VariantInputData[] = product.variants?.map(v => ({
    sku: v.sku || '',
    enabled: 1 as const,
    cost_price: v.cost_price ?? undefined,
    price: v.price ?? undefined,
    dealer_price: v.dealer_price ?? undefined,
    wholesale_price: v.wholesale_price ?? undefined,
    is_active: v.is_active ? 1 as const : 0 as const,
    attribute_value_ids: v.attribute_values?.map(av => av.id) || [],
  })) || []

  return {
    productName: product.productName,
    productCode: product.productCode || '',
    category_id: product.category_id?.toString() || '',
    brand_id: product.brand_id?.toString() || '',
    unit_id: product.unit_id?.toString() || '',
    alert_qty: product.alert_qty?.toString() || '',
    product_type: product.product_type,
    productPurchasePrice: stock?.productPurchasePrice?.toString() || '',
    productSalePrice: stock?.productSalePrice?.toString() || '',
    productStock: stock?.productStock?.toString() || '',
    variants,
    description: product.description || '',
  }
}

/**
 * Convert form data to FormData for API submission (simple products)
 */
export function formDataToFormData(
  data: ProductFormData,
  imageFile?: File | null
): FormData {
  const formData = new FormData()

  formData.append('productName', data.productName)

  if (data.productCode) {
    formData.append('productCode', data.productCode)
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

  formData.append('product_type', data.product_type)

  if (data.productPurchasePrice) {
    formData.append('productPurchasePrice', data.productPurchasePrice)
  }
  if (data.productSalePrice) {
    formData.append('productSalePrice', data.productSalePrice)
  }
  if (data.productStock) {
    formData.append('productStock', data.productStock)
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
  variants: VariantInputData[],
  _imageFile?: File | null
): VariableProductPayload {
  return {
    productName: data.productName,
    productCode: data.productCode || undefined,
    category_id: data.category_id ? parseInt(data.category_id, 10) : undefined,
    brand_id: data.brand_id ? parseInt(data.brand_id, 10) : undefined,
    unit_id: data.unit_id ? parseInt(data.unit_id, 10) : undefined,
    alert_qty: data.alert_qty ? parseInt(data.alert_qty, 10) : undefined,
    product_type: 'variable',
    description: data.description || undefined,
    variants: variants,
  }
}
