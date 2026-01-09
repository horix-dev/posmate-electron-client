# Stock Management Page - Quick Start Guide

## 🚀 Quick Access

**URL**: `http://localhost:5173/#/stocks`

**Menu Path**: Sidebar → Stocks (under Secondary Navigation)

**Keyboard**: Not yet configured (can be added)

## 📋 What's New

### Three Tabs
1. **All Stocks** - Complete inventory
2. **Low Stocks** - Items below alert threshold
3. **Expired Products** - Items past expiration

### Stats Dashboard
- Total items count
- Low stock items count  
- Expired items count
- Total inventory value (qty × purchase price)

### Search
- Search box filters by: product name, product code, batch number
- Real-time results with 300ms debounce
- Works on all tabs

## 📁 Created Files

| File | Purpose |
|------|---------|
| `src/pages/stocks/StocksPage.tsx` | Main page component with tabs |
| `src/pages/stocks/hooks/useStocks.ts` | Data fetching and state management |
| `src/pages/stocks/components/StocksList.tsx` | Stock items display |
| `src/api/services/stocksList.service.ts` | API service methods |
| `src/pages/stocks/README.md` | Detailed documentation |

## 🔧 Modified Files

| File | Change |
|------|--------|
| `src/api/endpoints.ts` | Added `LIST: '/stocks'` |
| `src/routes/index.tsx` | Added `/stocks` route |
| `src/components/layout/Sidebar.tsx` | Added "Stocks" menu item |
| `src/api/services/index.ts` | Exported `stocksListService` |
| `DEVELOPMENT_LOG.md` | Updated with this feature |

## 💡 Usage Examples

### Navigate to Stocks Page
```typescript
import { Link } from 'react-router-dom'

// In JSX
<Link to="/stocks">View Stocks</Link>
<Link to="/stocks?tab=low">Low Stocks</Link>
<Link to="/stocks?tab=expired">Expired Products</Link>
```

### Use useStocks Hook
```typescript
import { useStocks } from '@/pages/stocks/hooks'

function MyComponent() {
  const { allStocks, lowStocks, expiredStocks, isLoading } = useStocks({
    search: '',
  })

  return (
    <div>
      <p>Total stocks: {allStocks.length}</p>
      <p>Low stock items: {lowStocks.length}</p>
    </div>
  )
}
```

### Use stocksListService Directly
```typescript
import { stocksListService } from '@/api/services'

// Get all stocks
const data = await stocksListService.getAll({
  limit: 50,
  search: 'iPhone',
})

// Get low stocks
const lowStocks = await stocksListService.getLowStocks()

// Get expired
const expiredStocks = await stocksListService.getExpiredStocks()
```

## 🎨 UI Components

```
StocksPage
├── Header with title and [+ Add] button
├── Stats Cards (4 cards)
├── Search Input
├── Tabs Container
│   ├── Tab: All Stocks
│   │   └── StocksList
│   │       └── Stock Items with actions
│   ├── Tab: Low Stocks
│   │   └── StocksList
│   │       └── Stock Items with actions
│   └── Tab: Expired Products
│       └── StocksList
│           └── Stock Items with actions
├── Offline Notice (if offline)
└── Error Card (if error occurs)
```

## 🔌 API Endpoints

**Base Endpoint**: `GET /stocks`

**Query Parameters** (all optional):
```
?page=1                          # Pagination page
&per_page=20                     # Items per page
&limit=100                       # Max items (alt to page/per_page)
&search=iPhone                   # Search term
&stock_status=low_stock          # Filter: in_stock|out_of_stock|low_stock
&expiry_status=expired           # Filter: expired|expiring_soon
&days=30                         # Days until expiry
&warehouse_id=1                  # Filter by warehouse
&branch_id=1                     # Filter by branch
&product_id=5                    # Filter by product
&batch_no=ABC-001                # Filter by batch
```

## 📊 Data Structure

```typescript
interface Stock {
  id: number
  product_id: number
  variant_id?: number
  batch_no?: string
  productStock: number                    // Quantity
  productPurchasePrice: number            // Cost per unit
  productSalePrice: number                // Selling price
  productDealerPrice?: number             // Dealer price
  productWholeSalePrice?: number          // Wholesale price
  profit_percent?: number                 // Profit margin %
  mfg_date?: string                       // Manufacturing date
  expire_date?: string                    // Expiration date
  warehouse_id?: number                   // Warehouse ID
  branch_id?: number                      // Branch ID
}
```

## 🔍 Search Behavior

- **Triggers**: User types in search box
- **Debounce**: 300 milliseconds
- **Search Fields**: 
  - Product name
  - Product code
  - Batch number
- **Scope**: Works across all tabs
- **Case**: Insensitive

## 🌐 Offline Support

- **Detection**: Automatic via `useOnlineStatus()`
- **Behavior**: Shows offline message when no internet
- **Data**: No data fetched when offline
- **Future**: Ready for cached data integration

## ⚠️ Error Handling

- **Network Error**: Shows error card with message
- **Retry**: Button to attempt fetch again
- **Fallback**: Shows empty state with message
- **Toast**: User-friendly notifications

## 🎯 Current Limitations

The following are ready for future implementation:

- [ ] Edit stock action
- [ ] View stock details dialog
- [ ] Add stock action
- [ ] Bulk select and operations
- [ ] Export to CSV/Excel
- [ ] Advanced filtering UI
- [ ] Stock history/movements
- [ ] Warehouse transfers
- [ ] Price bulk updates

## 🧪 Testing Checklist

- [ ] Navigate to `/stocks`
- [ ] Click "All Stocks" tab
- [ ] Type in search box
- [ ] Click "Low Stocks" tab
- [ ] Click "Expired Products" tab
- [ ] Verify stats cards update
- [ ] Go offline and verify message
- [ ] Test on mobile/tablet view

## 📞 Support

For issues or questions:
1. Check [src/pages/stocks/README.md](src/pages/stocks/README.md) for detailed docs
2. Review [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) for implementation details
3. Check API docs at [backend_docs/API_QUICK_REFERENCE.md](backend_docs/API_QUICK_REFERENCE.md)
