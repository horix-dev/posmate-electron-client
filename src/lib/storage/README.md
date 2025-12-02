# Storage Abstraction Layer

This module provides a unified storage interface that abstracts the underlying database implementation. Currently uses IndexedDB (via Dexie.js), with SQLite planned for v2.0.

## Why This Abstraction?

1. **Future-proofing**: Enables migration from IndexedDB to SQLite without changing application code
2. **Testing**: Makes it easier to mock storage in tests
3. **Consistency**: Single interface for all data operations
4. **Type Safety**: Full TypeScript support with strict typing

## Usage

```typescript
import { storage } from '@/lib/storage'

// Products
const products = await storage.products.getAll()
const product = await storage.products.getById(123)
await storage.products.update(123, { salePrice: 19.99 })

// Sales
const saleId = await storage.sales.createOffline(saleData)
const todaySales = await storage.sales.getTodaySales()
const summary = await storage.sales.getSalesSummary('2024-01-01', '2024-01-31')

// Sync Queue
await storage.syncQueue.enqueue({ entity: 'sale', operation: 'CREATE', ... })
const pending = await storage.syncQueue.getPending(10)
const stats = await storage.syncQueue.getStats()

// Database operations
await storage.initialize()
await storage.close()
const size = await storage.getDatabaseSize()
await storage.vacuum() // Cleanup
```

## Repository Methods

### ProductRepository
- `getById(id)` - Get product by ID
- `getAll()` - Get all products
- `create(item)` - Create new product
- `update(id, item)` - Update product
- `delete(id)` - Delete product
- `search(query)` - Search by name or code
- `getByBarcode(barcode)` - Find by barcode
- `getByCategory(categoryId)` - Filter by category
- `getLowStock(threshold)` - Get low stock products
- `bulkUpsert(products)` - Bulk insert/update
- `getChangedSince(timestamp)` - Get changed records

### CategoryRepository
- `getById(id)` - Get category by ID
- `getAll()` - Get all categories
- `create(item)` - Create category
- `update(id, item)` - Update category
- `delete(id)` - Delete category
- `getByName(name)` - Find by name
- `bulkUpsert(categories)` - Bulk insert/update

### PartyRepository
- `getById(id)` - Get party by ID
- `getAll()` - Get all parties
- `create(item)` - Create party
- `update(id, item)` - Update party
- `delete(id)` - Delete party
- `search(query)` - Search by name or phone
- `getByPhone(phone)` - Find by phone
- `getCustomers()` - Get all customers
- `getSuppliers()` - Get all suppliers
- `getWithBalance()` - Get parties with due balance
- `bulkUpsert(parties)` - Bulk insert/update

### SaleRepository
- `getById(id)` - Get sale by ID
- `getAll()` - Get all sales
- `create(item)` - Create sale
- `update(id, item)` - Update sale
- `delete(id)` - Delete sale
- `createOffline(sale)` - Create offline sale
- `getOfflineSales()` - Get unsynced sales
- `markAsSynced(id, serverId)` - Mark as synced
- `getByInvoiceNumber(invoiceNo)` - Find by invoice
- `getByDateRange(start, end)` - Filter by date range
- `getTodaySales()` - Get today's sales
- `getSalesSummary(start, end)` - Get sales statistics

### SyncQueueRepository
- `getById(id)` - Get queue item by ID
- `getAll()` - Get all queue items
- `create(item)` - Add to queue
- `update(id, item)` - Update queue item
- `delete(id)` - Remove from queue
- `enqueue(item)` - Add new operation to queue
- `getPending(limit)` - Get pending operations
- `getFailed()` - Get failed operations
- `markAsProcessing(id)` - Mark as processing
- `markAsCompleted(id)` - Mark as completed
- `markAsFailed(id, error)` - Mark as failed
- `clearCompleted()` - Remove completed items
- `getStats()` - Get queue statistics

## Architecture

```
src/lib/storage/
├── index.ts           # Main export, factory function
├── interface.ts       # TypeScript interfaces
└── adapters/
    ├── indexeddb.adapter.ts  # IndexedDB (Dexie.js) implementation
    └── sqlite.adapter.ts     # SQLite placeholder (v2.0)
```

## Switching to SQLite (v2.0)

When ready to migrate:

1. Install dependencies:
   ```bash
   npm install better-sqlite3
   npm install @types/better-sqlite3 -D
   ```

2. Complete `sqlite.adapter.ts` implementation

3. Update `index.ts`:
   ```typescript
   // Change from:
   export const storage = new IndexedDBAdapter()
   
   // To:
   export const storage = new SQLiteAdapter()
   ```

4. Run data migration script

## Benefits of SQLite for POS

| Feature | IndexedDB | SQLite |
|---------|-----------|--------|
| Max Storage | ~2GB | Unlimited |
| Query Speed | Good | Excellent |
| Complex Queries | Limited | Full SQL |
| Transactions | Limited | ACID |
| Encryption | No | Yes (sqlcipher) |
| Data Integrity | Basic | Strong |

SQLite is recommended for v2.0 due to:
- Better performance with large datasets
- True ACID transactions
- SQL query capabilities
- Optional encryption
- Better reliability for POS operations
