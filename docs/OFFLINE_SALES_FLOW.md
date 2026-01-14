# Offline Sale Flow - Complete Overview

## 1. What Happens When You Create a Sale Offline

When a user creates a sale on the POS screen while offline, here's the complete flow:

```
┌─────────────────────────────────────────────────────────────────┐
│ User Completes Sale on POS Screen                               │
│ (Click "Complete Sale" → Select Payment Method)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ POSPage.tsx - handleProcessPayment()                            │
│                                                                  │
│ Prepares sale data:                                             │
│ - products: JSON array of items in cart                         │
│ - invoiceNumber: Either user-entered or OFFLINE-{timestamp}    │
│ - party_id: Selected customer ID                               │
│ - payment_type_id: Selected payment method                      │
│ - totalAmount, discountAmount, paidAmount, etc.                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ offlineSalesService.create(saleData)                            │
│                                                                  │
│ 1. Checks if online via useSyncStore.getState().isOnline       │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
      ONLINE                          OFFLINE
         │                               │
         ▼                               ▼
    Try API call              ┌─────────────────────────┐
    /api/sales (POST)        │ SAVE TO INDEXEDDB       │
         │                    │                         │
    Success? ────No────────► Fall back to offline mode │
         │                    │                         │
        Yes                   └────────────┬────────────┘
         │                                 │
    Return:                                ▼
    {                        ┌──────────────────────────────────┐
      data: apiSale,        │ 1. Create Local Sale Record      │
      isOffline: false      │    (saleRepository.createOffline)│
    }                        │                                  │
                             │    Stores in IndexedDB:         │
                             │    - id: auto-generated         │
                             │    - invoiceNumber: OFFLINE-ts  │
                             │    - customerId, totalAmount    │
                             │    - isOffline: true            │
                             │    - isSynced: false            │
                             │    - tempId: unique ID          │
                             │                                  │
                             └────────────────┬─────────────────┘
                                              │
                                              ▼
                             ┌──────────────────────────────────┐
                             │ 2. Queue for Sync                │
                             │    (syncQueueRepository.enqueue) │
                             │                                  │
                             │    Creates sync queue item:      │
                             │    - operation: 'CREATE'         │
                             │    - entity: 'sale'              │
                             │    - entityId: localId           │
                             │    - endpoint: '/sales'          │
                             │    - method: 'POST'              │
                             │    - status: 'pending'           │
                             │    - data: saleData              │
                             │    - attempts: 0                 │
                             │    - maxAttempts: 5              │
                             │                                  │
                             └────────────────┬─────────────────┘
                                              │
                                              ▼
                             ┌──────────────────────────────────┐
                             │ 3. Return Mock Response          │
                             │                                  │
                             │    Return:                       │
                             │    {                             │
                             │      data: {                      │
                             │        id: localId,              │
                             │        invoiceNumber: temp-id,   │
                             │        totalAmount,              │
                             │        ...                       │
                             │      },                          │
                             │      isOffline: true             │
                             │    }                             │
                             │                                  │
                             └─────────────────────────────────┘
```

---

## 2. Storage Locations - Where Data Goes

### **Primary Storage: IndexedDB (Persistent)**

When a sale is created offline, it's stored in **two places simultaneously**:

#### **1. Sales Table (`db.sales`)**

```javascript
{
  id: 1,                                  // Auto-incremented local ID
  invoiceNumber: "OFFLINE-1732710524000", // Temporary invoice number
  customerId: 5,                          // Customer ID (if selected)
  saleDate: "2025-11-27T10:15:24Z",      // Sale timestamp
  totalAmount: 1000,                      // Total including VAT
  discountAmount: 50,                     // Discount applied
  paidAmount: 950,                        // Amount paid
  dueAmount: 0,                           // Due (if partial payment)
  paymentTypeId: 1,                       // Payment method ID
  note: "Special order",                  // Optional notes
  isOffline: true,                        // ✅ Marks as offline sale
  isSynced: false,                        // ✅ Not yet synced
  tempId: "offline_1732710524_abc123",   // Unique temp identifier
  createdAt: "2025-11-27T10:15:24Z",
  updatedAt: "2025-11-27T10:15:24Z",
  syncError: null                         // Sync error (if any)
}
```

**Location in IndexedDB:**
```
POSDatabase (IndexedDB)
├── sales table (primary location)
│   ├── indexes: id, invoiceNumber, tempId, isOffline, isSynced
│   └── [Above record stored here]
```

#### **2. Sync Queue Table (`db.syncQueue`)**

```javascript
{
  id: 1,                                  // Queue item ID
  operation: "CREATE",                    // Operation type
  entity: "sale",                         // Entity type
  entityId: 1,                            // References local sale ID
  endpoint: "/sales",                     // API endpoint
  method: "POST",                         // HTTP method
  data: {                                 // Original sale data to send
    products: "[{stock_id: 1, ...}]",
    totalAmount: 1000,
    discountAmount: 50,
    paidAmount: 950,
    // ... all sale fields
  },
  status: "pending",                      // ✅ Waiting to sync
  attempts: 0,                            // No attempts yet
  maxAttempts: 5,                         // Retry up to 5 times
  createdAt: "2025-11-27T10:15:24Z",
  lastAttemptAt: null,                    // No attempts yet
  error: null                             // No error yet
}
```

**Location in IndexedDB:**
```
POSDatabase (IndexedDB)
├── syncQueue table (backup location)
│   ├── indexes: id, entity, status, createdAt
│   └── [Above record stored here]
```

### **Secondary Storage: localStorage (For Backward Compatibility)**

The cart data (held carts) is ALSO stored in localStorage:

```javascript
// localStorage key: "held-carts"
[
  {
    id: "hold-1732710524000",
    items: [
      {
        id: "1-1732710524000",
        product: { ... },
        stock: { ... },
        quantity: 2,
        unitPrice: 100,
        total: 200
      }
    ],
    customer: { ... },
    paymentType: { ... },
    subtotal: 1000,
    discountAmount: 50,
    totalAmount: 950,
    timestamp: 1732710524000
  }
]
```

---

## 3. Step-by-Step: Creating an Offline Sale

### **Step 1: User Initiates Sale Creation**

File: `src/pages/pos/POSPage.tsx` (line ~300)

```typescript
const handleProcessPayment = useCallback(
  async (amountPaid: number) => {
    // Prepare cart items
    const productsForApi = cartItems.map((item) => ({
      stock_id: item.stock.id,
      product_name: item.product.productName,
      quantities: item.quantity,
      price: item.unitPrice,
      lossProfit: 0,
    }))

    // Create sale request
    const saleData = {
      products: JSON.stringify(productsForApi),
      invoiceNumber: invoiceNumber || undefined,
      party_id: customer?.id,
      payment_type_id: paymentType.id,
      totalAmount,
      discountAmount,
      paidAmount: amountPaid,
      // ... more fields
    }

    // Send to offline service
    const result = await offlineSalesService.create(saleData)
  }
)
```

### **Step 2: Offline Sales Service Checks Connection**

File: `src/api/services/offlineSales.service.ts` (line ~15)

```typescript
export const offlineSalesService = {
  async create(saleData: CreateSaleRequest) {
    const syncStore = useSyncStore.getState()
    const isOnline = syncStore.isOnline  // ✅ Check online status

    // Try online first if we think we're online
    if (isOnline) {
      try {
        const response = await salesService.create(saleData)
        return { data: response.data, isOffline: false }
      } catch (error) {
        // If offline error, fall through to offline handling
        if (!isOfflineQueuedError(error)) {
          throw error
        }
      }
    }

    // OFFLINE: Save locally...
```

### **Step 3: Save to IndexedDB - Sales Table**

File: `src/lib/db/repositories/sale.repository.ts`

```typescript
// Create local sale record
const localSale: Omit<LocalSale, 'id' | 'isOffline' | 'isSynced'> = {
  invoiceNumber: `OFFLINE-${Date.now()}`,  // Temp invoice
  customerId: saleData.party_id || null,
  totalAmount: saleData.totalAmount,
  discountAmount: saleData.discountAmount || 0,
  paidAmount: saleData.paidAmount,
  // ... other fields
  isOffline: true,    // ✅ Mark as offline
  isSynced: false,    // ✅ Not synced yet
  tempId: `offline_${Date.now()}_${randomId}`  // Unique ID
}

// Save to IndexedDB
const localId = await saleRepository.createOffline(localSale)
// ✅ Returns: 1 (first sale ID)
```

### **Step 4: Queue for Sync**

File: `src/api/services/offlineSales.service.ts` (line ~45)

```typescript
// Add to sync queue
await syncQueueRepository.enqueue({
  operation: 'CREATE',
  entity: 'sale',
  entityId: localId,  // References the local sale
  data: saleData,
  endpoint: '/sales',
  method: 'POST',
  maxAttempts: 5,
  attempts: 0,
  createdAt: new Date().toISOString(),
  status: 'pending'   // ✅ Waiting to sync
})

// Update sync count in store
await syncStore.updatePendingSyncCount()
```

### **Step 5: Return to User**

```typescript
// Return mock response so UI thinks sale completed
return {
  data: mockSale,      // Mock Sale object
  isOffline: true      // ✅ Tell UI it was offline
}
```

---

## 4. Database Structure Diagram

```
POSDatabase (IndexedDB)
│
├── 📊 Master Data Tables (from API)
│   ├── products (productCode, productName, categoryId)
│   ├── categories (categoryName)
│   ├── parties (partyType, phoneNo)
│   ├── paymentTypes (name)
│   └── vats (vatName)
│
├── 💾 Transaction Tables (local + server)
│   ├── sales ⭐ (WHERE OFFLINE SALES STORED)
│   │   ├── Indexes: id, invoiceNumber, tempId, isOffline, isSynced
│   │   └── Indexes: [status+createdAt] for queries
│   │
│   └── heldCarts (cartId, customerId, createdAt)
│       └── Linked to localStorage via "held-carts" key
│
├── 🔄 Sync Infrastructure
│   ├── syncQueue ⭐ (WHERE PENDING SYNCS STORED)
│   │   ├── Indexes: id, entity, status, createdAt
│   │   ├── Indexes: [status+createdAt] for batch processing
│   │   └── Fields: status (pending/processing/failed/completed)
│   │
│   └── metadata (key-value storage)
│       ├── lastSync_sale
│       ├── lastSync_product
│       └── etc.
```

---

## 5. What Happens When App Goes Back Online

### **A. Automatic Detection**

```typescript
// src/api/offlineHandler.ts
const handleRequest = async (config) => {
  // Check online status
  if (!navigator.onLine) {
    // Queue mutation instead
    await queueForSync(config)
    return cachedResponse
  }
  
  // Proceed with normal API call
  return api(config)
}
```

### **B. Auto-Sync on Reconnection**

File: `src/App.tsx`

```typescript
// Listen for online event
window.addEventListener('online', async () => {
  toast.info('Back online - syncing data...')
  
  // Start sync service
  const result = await syncService.start()
  
  if (result.processed > 0) {
    toast.success(`Synced ${result.processed} sales`)
  }
})
```

### **C. Sync Process**

```
1. Fetch all PENDING items from syncQueue table
   └─ Status = "pending"
   
2. For each item:
   a. Mark as PROCESSING
   b. Retry with exponential backoff:
      - Attempt 1: immediate
      - Attempt 2: 2 seconds
      - Attempt 3: 4 seconds
      - Attempt 4: 8 seconds
      - Attempt 5: 16 seconds (max 30s)
   
   c. If success:
      - Mark local sale as isSynced: true
      - Update with server-generated ID
      - Delete from syncQueue
   
   d. If failure:
      - Increment attempts counter
      - If attempts < maxAttempts:
        - Mark as PENDING again (will retry)
      - If attempts >= maxAttempts:
        - Mark as FAILED
        - Move to failed items list

3. Clean up completed items
4. Report results to UI
```

---

## 6. File Dependencies - The Complete Chain

```
POS Sale Creation
│
├─ src/pages/pos/POSPage.tsx
│   └─ Calls: offlineSalesService.create()
│
├─ src/api/services/offlineSales.service.ts ⭐
│   ├─ Checks: useSyncStore.getState().isOnline
│   ├─ Saves: saleRepository.createOffline()
│   ├─ Queues: syncQueueRepository.enqueue()
│   └─ Calls: syncStore.updatePendingSyncCount()
│
├─ src/lib/db/repositories/sale.repository.ts
│   ├─ Extends: BaseRepository<LocalSale>
│   ├─ Uses: db.sales table
│   └─ Stores: LocalSale with isOffline=true, isSynced=false
│
├─ src/lib/db/repositories/syncQueue.repository.ts
│   ├─ Extends: BaseRepository<SyncQueueItem>
│   ├─ Uses: db.syncQueue table
│   └─ Stores: SyncQueueItem with status="pending"
│
├─ src/lib/db/schema.ts
│   ├─ Defines: POSDatabase (Dexie instance)
│   ├─ Tables:
│   │   ├─ sales (stores offline sales)
│   │   └─ syncQueue (stores pending operations)
│   └─ Methods: clearMasterData(), getDatabaseStats()
│
├─ src/stores/sync.store.ts
│   ├─ Tracks: isOnline, pendingSyncCount
│   ├─ Methods: updatePendingSyncCount()
│   └─ Auto-syncs on reconnection
│
└─ When Back Online:
   └─ src/lib/db/services/sync.service.ts
      ├─ Fetches: pending items from syncQueue
      ├─ Retries: with exponential backoff
      ├─ Updates: sales records with server IDs
      └─ Reports: success/failure
```

---

## 7. Key Files to Understand

| File | Purpose | Key Function |
|------|---------|--------------|
| `src/pages/pos/POSPage.tsx` | POS UI entry point | `handleProcessPayment()` → creates sale |
| `src/api/services/offlineSales.service.ts` | Offline wrapper | `create()` → routes to online or offline |
| `src/lib/db/repositories/sale.repository.ts` | Database access | `createOffline()` → saves to sales table |
| `src/lib/db/repositories/syncQueue.repository.ts` | Sync queueing | `enqueue()` → queues for later sync |
| `src/lib/db/schema.ts` | Database schema | Defines `sales` and `syncQueue` tables |
| `src/stores/sync.store.ts` | Global state | Tracks online/offline status |
| `src/lib/db/services/sync.service.ts` | Sync engine | `start()` → processes sync queue |
| `src/api/offlineHandler.ts` | Request interceptor | Intercepts failed requests |
| `src/App.tsx` | App entry | Initializes offline support + auto-sync |

---

## 8. Example: Creating a 2000 Sale While Offline

**User Actions:**
1. Add 2 items to cart (costs 2000 total)
2. Click "Complete Sale"
3. Select "Cash" payment
4. Pay 2000

**Backend Magic (Offline):**

```
1. IndexedDB saves:
   sales {
     id: 1,
     invoiceNumber: "OFFLINE-1732710524000",
     totalAmount: 2000,
     paidAmount: 2000,
     isOffline: true,
     isSynced: false
   }

2. syncQueue saves:
   {
     id: 1,
     operation: "CREATE",
     entity: "sale",
     entityId: 1,
     endpoint: "/sales",
     data: { products: "...", totalAmount: 2000, ... },
     status: "pending",
     attempts: 0
   }

3. UI shows: "✅ Sale saved offline - will sync when online"
```

**When Back Online:**

```
1. App detects: navigator.onLine = true
2. Triggers: syncService.start()
3. Fetches: syncQueue items with status="pending"
4. Makes API call: POST /sales with cart data
5. If success:
   - Updates local sale: isSynced=true, id=999 (server ID)
   - Deletes from syncQueue
   - Shows: "✅ Synced 1 sale"
6. If failure:
   - Increments attempts
   - Retries with backoff
   - Shows: "⚠️ Sync failed, will retry..."
```

---

## Summary

- **When Offline:** Sales stored in `db.sales` + queued in `db.syncQueue`
- **Storage:** IndexedDB (persistent), not memory
- **Backup:** localStorage for held carts only
- **Sync Trigger:** Automatic when back online
- **Retry Logic:** Exponential backoff (5 attempts max)
- **Invoice Number:** Temporary until synced (OFFLINE-timestamp format)
