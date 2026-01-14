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
export { reportsService } from './reports.service'
export { salesService } from './sales.service'
export { settingsService } from './settings.service'
export { stocksService } from './stocks.service'
export { stocksListService } from './stocksList.service'
export { warehousesService } from './warehouses.service'

// Currency service
export { currenciesService } from './currencies.service'

// Sync services
export { syncApiService } from './sync.service'
export { offlineSalesService } from './offlineSales.service'

// Variant services
export {
  attributesService,
  attributeValuesService,
  getAttributeValueDisplayName,
  sortAttributes,
  sortAttributeValues,
  getActiveAttributes,
  getActiveValues,
} from './attributes.service'
export {
  variantsService,
  variantReportsService,
  getVariantDisplayName,
  getVariantEffectivePrice,
  getVariantTotalStock,
  isVariantInStock,
  sortVariants,
  getActiveVariants,
  generateAttributeCombinations,
  buildVariantSku,
} from './variants.service'

// Export sync types
export type {
  DeviceRegistrationRequest,
  DeviceRegistrationResponse,
  FullSyncResponse,
  IncrementalSyncResponse,
  BatchSyncRequest,
  BatchSyncResponse,
  BatchOperation,
  BatchOperationResult,
  EntityChanges,
  VersionConflict,
  ConflictResponse,
  StockDiscrepancyWarning,
} from './sync.service'

// Export axios instance and types
export {
  default as api,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  getApiErrorMessage,
} from '../axios'
export type { ApiResponse, PaginatedApiResponse, ApiError } from '../axios'
