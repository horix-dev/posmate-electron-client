import type { CreatePurchaseRequest, PurchaseProductItem } from '@/types/api.types'

export type PurchaseLineForTotals = Pick<PurchaseProductItem, 'quantities' | 'productPurchasePrice'>

export interface PurchaseTotals {
  subtotal: number
  totalAmount: number
  dueAmount: number
}

const toNumber = (value: unknown): number => {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

export function calculatePurchaseTotals(
  lines: PurchaseLineForTotals[],
  discountAmount: number = 0,
  paidAmount: number = 0
): PurchaseTotals {
  const subtotal = lines.reduce((sum, line) => {
    const qty = Math.max(0, toNumber(line.quantities))
    const price = Math.max(0, toNumber(line.productPurchasePrice))
    return sum + qty * price
  }, 0)

  const discount = Math.max(0, toNumber(discountAmount))
  const paid = Math.max(0, toNumber(paidAmount))

  const totalAmount = Math.max(0, subtotal - discount)
  const dueAmount = Math.max(0, totalAmount - paid)

  return { subtotal, totalAmount, dueAmount }
}

export interface PurchaseFormLikeValues {
  party_id: number
  invoiceNumber?: string
  purchaseDate?: string
  payment_type_id?: number
  vat_id?: number
  vat_amount?: number
  discountAmount?: number
  paidAmount: number
  products: Array<{
    product_id: number
    variant_id?: number
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
  const totals = calculatePurchaseTotals(
    values.products,
    values.discountAmount ?? 0,
    values.paidAmount
  )

  return {
    party_id: values.party_id,
    invoiceNumber: values.invoiceNumber || undefined,
    purchaseDate: values.purchaseDate || undefined,
    payment_type_id: values.payment_type_id,
    vat_id: values.vat_id,
    vat_amount: values.vat_amount,
    totalAmount: totals.totalAmount,
    discountAmount: values.discountAmount,
    paidAmount: values.paidAmount,
    dueAmount: totals.dueAmount,
    products: values.products.map((p) => ({
      product_id: p.product_id,
      variant_id: p.variant_id,
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
