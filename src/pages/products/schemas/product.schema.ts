import { z } from 'zod'

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

  product_type: z.enum(['single', 'variant']).default('single'),

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
  product_type: 'single',
  productPurchasePrice: '',
  productSalePrice: '',
  productStock: '',
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
  product_type: 'single' | 'variant'
  stocks?: Array<{
    productPurchasePrice: number
    productSalePrice: number
    productStock: number
  }>
}): ProductFormData {
  const stock = product.stocks?.[0]

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
  }
}

/**
 * Convert form data to FormData for API submission
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
