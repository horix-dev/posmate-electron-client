# Stock Management Page

## Overview

The Stock Management page (`/stocks`) provides a comprehensive table-based interface for viewing and managing inventory stocks. It features a tabbed interface to filter stocks by different statuses and includes search, filtering, pagination, and bulk operations capabilities.

## Features

### 1. **Tabbed Interface**

Three main tabs for different stock views:

- **All Stocks** - Complete inventory of all stock items with pagination
- **Low Stocks** - Items below the configured alert quantity threshold
- **Expired Products** - Items with past expiration dates

### 2. **Table-Based Display** (Following Finance Page Pattern)

Professional table layout with:
- **Checkbox Selection** - Select individual or all items on the current page
- **Sortable Columns**:
  - Product / Batch
  - Quantity (stock level)
  - Purchase Price (cost per unit)
  - Sale Price (selling price)
  - Status Badge (In Stock / Low Stock / Out of Stock)
  - Expiry Date (with relative time display)
  - Actions (Edit, Delete)

### 3. **Search & Filtering**

- Search by product name, product code, or batch number (debounced for performance)
- Warehouse and branch filtering support (ready for implementation)
- Real-time results update as you type

### 4. **Pagination Controls**

- **Rows Per Page Selector**: 10, 25, 50, 100 entries
- **Page Navigation**: Next/Previous buttons and page number selector
- **Entry Counter**: Shows "Showing X to Y of Z"
- Pagination state resets when data changes

### 5. **Bulk Operations**

- **Multi-Select**: Select multiple items with checkboxes
- **Select All**: Toggle to select all items on current page
- **Bulk Delete**: Delete multiple selected items at once
- Selection counter shows number of selected items

### 6. **Stock Status Indicators**

- **In Stock** - Default badge (Qty > 10)
- **Low Stock** - Warning badge (Qty ≤ 10)
- **Out of Stock** - Destructive badge (Qty = 0)

### 7. **Expiry Date Indicators**

- **Expired** - Red background with "Expired" label
- **Expiring Soon** - Yellow background (within 7 days)
- **Normal** - Green background with relative date (e.g., "in 30 days")
- **Non-expiring** - Dash (-) for items without expiry dates

### 8. **Analytics Dashboard**

Stats cards display:
- Total stock items count
- Low stock items count (in yellow)
- Expired items count (in red)
- Total inventory value (calculated from quantity × purchase price)

### 9. **Loading & Empty States**

- **Loading State**: Spinner with "Loading..." message
- **Empty State**: Icon with descriptive message
- **Error State**: Error card with retry button

## File Structure

```
src/pages/stocks/
├── StocksPage.tsx              # Main page component with tabs and layout
├── hooks/
│   ├── useStocks.ts            # Data fetching and state management hook
│   └── index.ts                # Hook exports
├── components/
│   ├── StocksList.tsx          # Professional table component
│   └── index.ts                # Component exports
└── README.md                   # This file
```

## API Integration

### Endpoints Used

- `GET /stocks` - Fetch all stocks with optional filtering
- `GET /stocks?stock_status=low_stock` - Fetch low stock items
- `GET /stocks?expiry_status=expired` - Fetch expired items

### Query Parameters Supported

```typescript
// Optional parameters
{
  page?: number              // Page number for pagination
  per_page?: number          // Items per page
  limit?: number             // Max items (for dropdown mode)
  cursor?: number            // Cursor for cursor-based pagination
  product_id?: number        // Filter by product
  variant_id?: number        // Filter by variant
  warehouse_id?: number      // Filter by warehouse
  branch_id?: number         // Filter by branch
  batch_no?: string          // Filter by batch number
  stock_status?: string      // 'in_stock', 'out_of_stock', 'low_stock'
  expiry_status?: string     // 'expired', 'expiring_soon'
  days?: number              // Days until expiry (for expiring_soon)
  search?: string            // Search term
}
```

## Hook: `useStocks`

### Usage

```typescript
import { useStocks } from '@/pages/stocks/hooks'

const filters = {
  search: 'iPhone',
  warehouseId: 1,
}

const {
  allStocks,
  lowStocks,
  expiredStocks,
  isLoading,
  isLoadingLow,
  isLoadingExpired,
  isOffline,
  error,
  refetch,
  setPage,
  setPerPage,
} = useStocks(filters)
```

### Return Values

- `allStocks: Stock[]` - Array of all stocks
- `lowStocks: Stock[]` - Array of low stock items
- `expiredStocks: Stock[]` - Array of expired items
- `isLoading: boolean` - Loading state for all stocks tab
- `isLoadingLow: boolean` - Loading state for low stocks tab
- `isLoadingExpired: boolean` - Loading state for expired tab
- `isOffline: boolean` - Offline status
- `error: Error | null` - Error object if fetch failed
- `currentPage: number` - Current page number
- `perPage: number` - Items per page
- `totalItems: number` - Total items count
- `filteredAllStocks: Stock[]` - Filtered all stocks (ready for display)
- `filteredLowStocks: Stock[]` - Filtered low stocks
- `filteredExpiredStocks: Stock[]` - Filtered expired stocks
- `refetch: () => Promise<void>` - Manual refetch function
- `setPage: (page: number) => void` - Set page number
- `setPerPage: (perPage: number) => void` - Set items per page

## Component: `StocksList`

Professional table component for displaying stocks with all features.

### Props

```typescript
interface StocksListProps {
  stocks: Stock[]
  isLoading: boolean
  emptyMessage: string
  onDelete?: (id: number) => void         // Called when delete button clicked
  onEdit?: (stock: Stock) => void         // Called when edit button clicked
  onSelectionChange?: (ids: number[]) => void  // Called when selection changes
  onBulkDelete?: (ids: number[]) => void      // Called for bulk delete
}
```

### Features

- Checkbox selection for multi-select operations
- Inline edit and delete buttons for each row
- Bulk delete button when items selected
- Rows per page selector
- Pagination with page numbers
- Loading and empty states
- Hover effects on rows

## Service: `stocksListService`

Available methods for direct API calls:

```typescript
import { stocksListService } from '@/api/services'

// Get all stocks
const allStocks = await stocksListService.getAll({
  page: 1,
  per_page: 20,
  search: 'iPhone',
})

// Get low stocks
const lowStocks = await stocksListService.getLowStocks({
  limit: 100,
})

// Get expired stocks
const expiredStocks = await stocksListService.getExpiredStocks({
  limit: 100,
})

// Get expiring soon
const expiringStocks = await stocksListService.getExpiringStocks({
  days: 30,
})

// Search
const results = await stocksListService.search('iPhone', {
  warehouse_id: 1,
})
```

## Offline Support

The page includes:
- Offline status detection via `useOnlineStatus()` hook
- Graceful fallback UI showing offline message
- Alert card indicating offline state
- Ready for cached data integration

## Error Handling

- Network errors are caught and displayed
- User-friendly error messages
- Retry button to attempt refetch
- Toast notifications for actions

## UI Components Used

- `Table` - Professional data table with borders
- `Tabs` - Tab navigation interface
- `Card` - Container components
- `Button` - Action buttons with variants
- `Input` - Search input
- `Badge` - Status indicators
- `Checkbox` - Multi-select functionality
- `Select` - Rows per page dropdown
- Icons from `lucide-react`

## Pattern Alignment

This page follows the **Finance Page Pattern**:
- Professional table layout instead of lists
- Pagination with configurable rows per page
- Multi-select with bulk operations
- Consistent UI/UX with finance module
- Same component structure and naming conventions
- Matching styling and interactions

## Navigation

Access from:
- Main sidebar menu → "Stocks"
- Direct URL: `/stocks`
- Tab navigation: `/stocks?tab=all`, `/stocks?tab=low`, `/stocks?tab=expired`

## Related Pages

- **Stock Adjustments** (`/inventory/stock-adjustments`) - Adjust stock quantities
- **Products** (`/products`) - Manage product master data
- **Warehouses** (`/warehouses`) - Manage warehouse locations
- **Finance** (`/finance`) - Similar table-based pattern reference

## Future Enhancements

- [ ] Inline editing of stock fields
- [ ] Export selected to CSV/Excel
- [ ] Advanced filtering with UI builder
- [ ] Stock history/movement tracking modal
- [ ] Warehouse transfer modal
- [ ] Batch price adjustment operations
- [ ] Stock value analytics dashboard
- [ ] Low stock alerts configuration
- [ ] Barcode scanning for quantity updates
