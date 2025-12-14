import type { Expense, Income } from '@/types/api.types'

export interface NormalizedTransaction {
    id: number
    amount: number
    title: string
    date: string
    referenceNo: string
    note: string
    categoryId: number
    categoryName: string
    paymentTypeId?: number
    paymentName: string
    type: 'expense' | 'income'
    original: Expense | Income
}

export function normalizeTransaction(item: Expense | Income, type: 'expense' | 'income'): NormalizedTransaction {
    // Handle backend inconsistencies (e.g. 'expanseFor' typo)
    // @ts-ignore
    const rawTitle = item.expanseFor || item.expenseFor || item.incomeFor || item.expense_for || item.income_for || item.description || '-'
    // @ts-ignore
    const rawDate = item.expenseDate || item.incomeDate || item.expense_date || item.income_date || item.date || item.created_at
    // @ts-ignore
    const rawRef = item.referenceNo || item.reference_no || ''

    return {
        id: item.id,
        amount: Number(item.amount),
        title: rawTitle,
        date: rawDate,
        referenceNo: rawRef,
        note: item.note || '',
        // @ts-ignore
        categoryId: type === 'expense' ? (item as Expense).expense_category_id : (item as Income).income_category_id,
        categoryName: item.category?.categoryName || '-',
        paymentTypeId: item.payment_type_id,
        paymentName: item.payment_type?.name || '-',
        type,
        original: item
    }
}
