# Testing Offline Support

## ✅ What Was Fixed

1. **Offline Handler** - Intercepts API requests and queues them when offline
2. **Offline Sales Service** - Saves sales to IndexedDB when offline
3. **POS Integration** - Updated payment processing to use offline-aware service
4. **Auto-Sync** - Triggers sync automatically when connection restored

## 🧪 How to Test Offline Mode

### Method 1: Chrome DevTools Network Throttling

1. **Open DevTools** (F12 or Ctrl+Shift+I)
2. **Go to Network tab**
3. **Click throttling dropdown** (currently showing "No throttling" or "Offline")
4. **Select "Offline"**

### Method 2: Toggle Network in Electron

In your screenshot, you already have it set to "Offline" in the Network tab.

## 📝 Test Scenario: Create Offline Sale

### Step 1: Go Offline
- Set network throttling to "Offline" in DevTools
- App should continue to work

### Step 2: Create a Sale
1. Add products to cart
2. Click "Payment" button  
3. Select payment method (Cash/Card/etc.)
4. Enter amount paid
5. Click "Complete Payment"

### Expected Behavior:
✅ **Should see toast**: "Sale saved offline - will sync when online"
✅ **Sale should be saved to IndexedDB**
✅ **Cart should clear**
✅ **No network errors in console**
✅ **Invoice number should be like: `OFFLINE-1732650000000`**

### Step 3: Check Offline Data

Open browser console and run:
```javascript
// Check IndexedDB
const { db } = await import('/src/lib/db/schema.ts')

// Check offline sales
const offlineSales = await db.sales.where('isOffline').equals(1).toArray()
console.log('Offline sales:', offlineSales)

// Check sync queue
const pendingSync = await db.syncQueue.where('status').equals('pending').toArray()
console.log('Pending sync items:', pendingSync)
```

### Step 4: Go Back Online
1. Set network throttling back to "No throttling"
2. App should automatically trigger sync

### Expected Behavior:
✅ **Console should show**: `[App] Connection restored, starting sync...`
✅ **Sync should process queue items**
✅ **Sales should sync to server**
✅ **Toast notification**: "Sale completed successfully!" (on next sale)

## 🔍 What to Look For

### ✅ **Working Correctly:**
- No red network errors for sales requests
- Toast shows "Sale saved offline..."
- Invoice numbers are generated even offline
- Cart clears after payment
- Sync triggers automatically when online

### ❌ **Issues to Watch For:**
- If you still see `net::ERR_INTERNET_...` errors for sales:
  - Check that offline handler is initialized (`initializeOfflineHandling()` called)
  - Check browser console for any errors during offline handler setup

## 🐛 Debugging Commands

### Check Online Status
```javascript
const { useSyncStore } = await import('/src/stores/sync.store.ts')
console.log('Is online:', useSyncStore.getState().isOnline)
```

### Check Pending Sync Count
```javascript
const { useSyncStore } = await import('/src/stores/sync.store.ts')
const count = useSyncStore.getState().pendingSyncCount
console.log('Pending sync items:', count)
```

### Manually Trigger Sync
```javascript
const { useSyncStore } = await import('/src/stores/sync.store.ts')
await useSyncStore.getState().startQueueSync()
```

### View Database Stats
```javascript
const { getDatabaseStats } = await import('/src/lib/db/schema.ts')
const stats = await getDatabaseStats()
console.log('Database stats:', stats)
```

### Export All Data
```javascript
const { exportDatabase } = await import('/src/lib/db/schema.ts')
const data = await exportDatabase()
console.log('All database data:', data)
```

## 📊 Expected Console Output

### When Going Offline:
```
[Offline Handler] Initialized
[Offline Sales] Creating sale offline...
[Offline] Request queued for sync: POST /api/v1/sales
```

### When Going Back Online:
```
[App] Connection restored, starting sync...
[Sync Service] Processing 1 pending items...
[Sync Service] Item synced successfully
```

## 🎯 Common Issues & Solutions

### Issue: Still seeing network errors
**Solution**: Restart the dev server to ensure offline handler is initialized

### Issue: Sales not queuing offline  
**Solution**: Check that `initializeOfflineHandling()` is called in `main.tsx`

### Issue: Sync not triggering when online
**Solution**: Check browser console for errors, verify event listener is attached

### Issue: IndexedDB not saving
**Solution**: Check browser console for Dexie errors, verify database schema is correct

## ✨ What Changed

### Files Modified:
1. **`src/api/offlineHandler.ts`** - NEW: Request interceptor
2. **`src/api/services/offlineSales.service.ts`** - NEW: Offline-aware sales service
3. **`src/main.tsx`** - Initialize offline handler
4. **`src/App.tsx`** - Auto-sync on reconnection
5. **`src/pages/pos/POSPage.tsx`** - Use offline sales service
6. **`src/lib/db/schema.ts`** - Updated entity types

### How It Works:
1. **Before API Call**: Interceptor checks online status
2. **If Offline**: Saves to IndexedDB + adds to sync queue
3. **If Online**: Normal API call
4. **On Reconnect**: Auto-triggers sync from queue
5. **Sync Service**: Processes queue with retry logic

---

## 🚀 Next Steps

After confirming offline mode works:
1. Test with actual network disconnection (not just throttling)
2. Test sync after multiple offline sales
3. Test error scenarios (sync failures, conflicts)
4. Add UI indicators (online/offline badge, pending sync count)
