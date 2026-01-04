import api, { ApiResponse, PaginatedApiResponse } from '../axios'
import { API_ENDPOINTS } from '../endpoints'
import type {
  Expense,
  ExpenseCategory,
  Income,
  IncomeCategory,
} from '@/types/api.types'

// ============================================
// Expenses Service
// ============================================

export const expensesService = {
  /**
   * Get all expenses with optional filters and flexible pagination
   */
  getAll: async (params?: {
    page?: number
    per_page?: number
    limit?: number
    cursor?: number
    start_date?: string
    end_date?: string
    category_id?: number
    branch_id?: number
    payment_type_id?: number
    search?: string
  }): Promise<PaginatedApiResponse<Expense[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Expense[]>>(API_ENDPOINTS.EXPENSES.LIST, {
      params: params || { limit: 100 },
    })
    return data
  },

  /**
   * Create a new expense
   */
  create: async (expense: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    const { data } = await api.post<ApiResponse<Expense>>(API_ENDPOINTS.EXPENSES.CREATE, expense)
    return data
  },

  /**
   * Update an expense
   */
  update: async (
    id: number,
    expense: Partial<Expense>
  ): Promise<ApiResponse<Expense>> => {
    const { data } = await api.post<ApiResponse<Expense>>(API_ENDPOINTS.EXPENSES.UPDATE(id), {
      ...expense,
      _method: 'PUT',
    })
    return data
  },

  /**
   * Delete an expense
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.EXPENSES.DELETE(id))
    return data
  },

  // ============================================
  // Expense Categories
  // ============================================

  /**
   * Get all expense categories with flexible pagination
   */
  getCategories: async (params?: {
    limit?: number
    page?: number
    per_page?: number
    cursor?: number
    search?: string
    status?: boolean | number
  }): Promise<ApiResponse<ExpenseCategory[]>> => {
    const { data } = await api.get<ApiResponse<ExpenseCategory[]>>(
      API_ENDPOINTS.EXPENSE_CATEGORIES.LIST,
      { params: params || { limit: 1000 } }
    )
    return data
  },

  /**
   * Create an expense category
   */
  createCategory: async (category: {
    categoryName: string
  }): Promise<ApiResponse<ExpenseCategory>> => {
    const { data } = await api.post<ApiResponse<ExpenseCategory>>(
      API_ENDPOINTS.EXPENSE_CATEGORIES.CREATE,
      category
    )
    return data
  },

  /**
   * Update an expense category
   */
  updateCategory: async (
    id: number,
    category: { categoryName: string }
  ): Promise<ApiResponse<ExpenseCategory>> => {
    const { data } = await api.post<ApiResponse<ExpenseCategory>>(
      API_ENDPOINTS.EXPENSE_CATEGORIES.UPDATE(id),
      { ...category, _method: 'PUT' }
    )
    return data
  },

  /**
   * Delete an expense category
   */
  deleteCategory: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(
      API_ENDPOINTS.EXPENSE_CATEGORIES.DELETE(id)
    )
    return data
  },
}

// ============================================
// Incomes Service
// ============================================

export const incomesService = {
  /**
   * Get all incomes with optional filters and flexible pagination
   */
  getAll: async (params?: {
    page?: number
    per_page?: number
    limit?: number
    cursor?: number
    start_date?: string
    end_date?: string
    category_id?: number
    branch_id?: number
    payment_type_id?: number
    search?: string
  }): Promise<PaginatedApiResponse<Income[]>> => {
    const { data } = await api.get<PaginatedApiResponse<Income[]>>(API_ENDPOINTS.INCOMES.LIST, {
      params: params || { limit: 100 },
    })
    return data
  },

  /**
   * Create a new income
   */
  create: async (income: Partial<Income>): Promise<ApiResponse<Income>> => {
    const { data } = await api.post<ApiResponse<Income>>(API_ENDPOINTS.INCOMES.CREATE, income)
    return data
  },

  /**
   * Update an income
   */
  update: async (
    id: number,
    income: Partial<Income>
  ): Promise<ApiResponse<Income>> => {
    const { data } = await api.post<ApiResponse<Income>>(API_ENDPOINTS.INCOMES.UPDATE(id), {
      ...income,
      _method: 'PUT',
    })
    return data
  },

  /**
   * Delete an income
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.INCOMES.DELETE(id))
    return data
  },

  // ============================================
  // Income Categories
  // ============================================

  /**
   * Get all income categories with flexible pagination
   */
  getCategories: async (params?: {
    limit?: number
    page?: number
    per_page?: number
    cursor?: number
    search?: string
    status?: boolean | number
  }): Promise<ApiResponse<IncomeCategory[]>> => {
    const { data } = await api.get<ApiResponse<IncomeCategory[]>>(
      API_ENDPOINTS.INCOME_CATEGORIES.LIST,
      { params: params || { limit: 1000 } }
    )
    return data
  },

  /**
   * Create an income category
   */
  createCategory: async (category: {
    categoryName: string
  }): Promise<ApiResponse<IncomeCategory>> => {
    const { data } = await api.post<ApiResponse<IncomeCategory>>(
      API_ENDPOINTS.INCOME_CATEGORIES.CREATE,
      category
    )
    return data
  },

  /**
   * Update an income category
   */
  updateCategory: async (
    id: number,
    category: { categoryName: string }
  ): Promise<ApiResponse<IncomeCategory>> => {
    const { data } = await api.post<ApiResponse<IncomeCategory>>(
      API_ENDPOINTS.INCOME_CATEGORIES.UPDATE(id),
      { ...category, _method: 'PUT' }
    )
    return data
  },

  /**
   * Delete an income category
   */
  deleteCategory: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(API_ENDPOINTS.INCOME_CATEGORIES.DELETE(id))
    return data
  },
}

export default { expensesService, incomesService }
