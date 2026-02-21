import type { CreatePurchaseRequest, PurchaseProductItem } from '@/types/api.types'

export type PurchaseLineForTotals = Pick<PurchaseProductItem, 'quantities' | 'productPurchasePrice'>

export interface PurchaseTotals {
  subtotal: number
  discountAmount: number
  vatAmount: number
  shippingCharge: number
  totalAmount: number
  dueAmount: number
}

const toNumber = (value: unknown): number => {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

export function calculatePurchaseTotals(
  lines: PurchaseLineForTotals[],
  options: {
    discountAmount?: number
    discountPercent?: number
    discountType?: string
    vatPercent?: number
    shippingCharge?: number
    paidAmount?: number
  } = {}
): PurchaseTotals {
  const subtotal = lines.reduce((sum, line) => {
    const qty = Math.max(0, toNumber(line.quantities))
    const price = Math.max(0, toNumber(line.productPurchasePrice))
    return sum + qty * price
  }, 0)

  // Calculate discount
  let discountAmount = 0
  if (options.discountType === 'percentage' && options.discountPercent) {
    discountAmount = (subtotal * toNumber(options.discountPercent)) / 100
  } else {
    discountAmount = Math.max(0, toNumber(options.discountAmount))
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount)

  // Calculate VAT
  const vatAmount = options.vatPercent ? (afterDiscount * toNumber(options.vatPercent)) / 100 : 0

  // Add shipping
  const shippingCharge = Math.max(0, toNumber(options.shippingCharge))

  const totalAmount = Math.max(0, afterDiscount + vatAmount + shippingCharge)
  const paid = Math.max(0, toNumber(options.paidAmount))
  const dueAmount = Math.max(0, totalAmount - paid)

  return { subtotal, discountAmount, vatAmount, shippingCharge, totalAmount, dueAmount }
}

export interface PurchaseFormLikeValues {
  party_id: number
  invoiceNumber?: string
  purchaseDate?: string
  payment_type_id?: number
  vat_id?: number
  vat_amount?: number
  vat_percent?: number
  discountAmount?: number
  discount_percent?: number
  discount_type?: string
  shipping_charge?: number
  paidAmount: number
  products: Array<{
    product_id: number
    variant_id?: number
    stock_id?: number
    batch_no?: string
    quantities: number
    productPurchasePrice: number
    productSalePrice: number
    productDealerPrice?: number
    productWholeSalePrice?: number
    profit_percent?: number
    mfg_date?: string
    expire_date?: string
  }>
}

export function buildCreatePurchaseRequest(values: PurchaseFormLikeValues): CreatePurchaseRequest {
  const totals = calculatePurchaseTotals(values.products, {
    discountAmount: values.discountAmount,
    discountPercent: values.discount_percent,
    discountType: values.discount_type,
    vatPercent: values.vat_percent,
    shippingCharge: values.shipping_charge,
    paidAmount: values.paidAmount,
  })

  return {
    party_id: values.party_id,
    invoiceNumber: values.invoiceNumber || undefined,
    purchaseDate: values.purchaseDate || undefined,
    payment_type_id: values.payment_type_id,
    vat_id: values.vat_id,
    vat_amount: totals.vatAmount || values.vat_amount,
    totalAmount: totals.totalAmount,
    discountAmount: totals.discountAmount,
    discount_percent: values.discount_percent,
    discount_type: values.discount_type,
    shipping_charge: totals.shippingCharge,
    paidAmount: values.paidAmount,
    dueAmount: totals.dueAmount,
    products: values.products.map((p) => ({
      product_id: p.product_id,
      variant_id: p.variant_id,
      stock_id: p.stock_id,
      batch_no: p.batch_no?.trim() ? p.batch_no : undefined,
      quantities: p.quantities,
      productPurchasePrice: p.productPurchasePrice,
      productSalePrice: p.productSalePrice,
      productDealerPrice: p.productDealerPrice,
      productWholeSalePrice: p.productWholeSalePrice,
      profit_percent: p.profit_percent,
      mfg_date: p.mfg_date?.trim() ? p.mfg_date : undefined,
      expire_date: p.expire_date?.trim() ? p.expire_date : undefined,
    })),
  }
}
