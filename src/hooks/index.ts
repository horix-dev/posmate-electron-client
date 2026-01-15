export { useDebounce, useDebouncedCallback } from './useDebounce'
export { useSyncQueue } from './useSyncQueue'
export type { SyncQueueStats, SyncQueueGrouped } from './useSyncQueue'
export {
  useCurrency,
  formatCurrency,
  getCurrencySymbol,
  refreshActiveCurrency,
} from './useCurrency'
export type { CurrencyConfig, UseCurrencyReturn } from './useCurrency'

// Product search hooks
export { useProductSearch, useBarcodeScanner, useProductAutocomplete } from './useProductSearch'
export type {
  UseProductSearchOptions,
  UseBarcodeScanner,
  UseProductAutocompleteOptions,
} from './useProductSearch'

// POS barcode scanner hook
export { usePOSBarcodeScanner } from './usePOSBarcodeScanner'
export type { ScannedItem, UsePOSBarcodeScannerOptions } from './usePOSBarcodeScanner'
