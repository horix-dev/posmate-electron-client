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

const getCategoryName = (category: Expense['category'] | Income['category']): string => {
    if (category && 'categoryName' in category && typeof category.categoryName === 'string') {
        return category.categoryName
    }

    if (category && 'name' in category && typeof (category as { name?: unknown }).name === 'string') {
        return (category as { name?: string }).name ?? '-'
    }

    return '-'
}

export function normalizeTransaction(item: Expense | Income, type: 'expense' | 'income'): NormalizedTransaction {
    // Handle backend inconsistencies (e.g. 'expanseFor' typo)
    // @ts-expect-error - Handling backend inconsistencies
    const rawTitle = item.expanseFor || item.expenseFor || item.incomeFor || item.expense_for || item.income_for || item.description || '-'
    // @ts-expect-error - Handling backend inconsistencies
    const rawDate = item.expenseDate || item.incomeDate || item.expense_date || item.income_date || item.date || item.created_at
    const rawRef = item.referenceNo || item.reference_no || ''

    const category = type === 'expense' ? (item as Expense).category : (item as Income).category

    return {
        id: item.id,
        amount: Number(item.amount),
        title: rawTitle,
        date: rawDate,
        referenceNo: rawRef,
        note: item.note || '',
        categoryId: type === 'expense' ? (item as Expense).expense_category_id : (item as Income).income_category_id,
        categoryName: getCategoryName(category),
        paymentTypeId: item.payment_type_id,
        paymentName: item.payment_type?.name || '-',
        type,
        original: item
    }
}
