// Export all API services
export { authService } from './auth.service'
export { businessService } from './business.service'
export { dashboardService } from './dashboard.service'
export { duesService } from './dues.service'
export { expensesService, incomesService } from './expenses.service'
export {
  categoriesService,
  brandsService,
  unitsService,
  productModelsService,
  vatsService,
  paymentTypesService,
} from './inventory.service'
export { partiesService } from './parties.service'
export { productsService } from './products.service'
export { purchasesService } from './purchases.service'
export { salesService } from './sales.service'
export { settingsService } from './settings.service'
export { stocksService } from './stocks.service'
export { warehousesService } from './warehouses.service'

// Export axios instance and types
export { default as api, setAuthToken, getAuthToken, clearAuthToken, getApiErrorMessage } from '../axios'
export type { ApiResponse, PaginatedApiResponse, ApiError } from '../axios'
