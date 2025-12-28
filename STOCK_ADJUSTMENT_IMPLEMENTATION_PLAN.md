# Stock Adjustment Implementation Plan

**Date:** December 26, 2025  
**Status:** Planning Phase  
**Priority:** High

## Overview

Stock adjustments are critical for maintaining accurate inventory levels. This document outlines the implementation plan for a comprehensive stock adjustment feature that works offline-first and syncs with the Laravel backend.

---

## 1. API Analysis

### Available Endpoints

#### Stock Management
```
POST   /v1/stocks
PUT    /v1/stocks/{id}
DELETE /v1/stocks/{id}
```

#### Stock-Related Product Data
From `/v1/products` endpoints:
- `stock_quantity` (integer)
- `stock_alert` (integer) - low stock threshold
- `batch_selection` (string) - FIFO, LIFO, FEFO for variant products
- Product type: `simple`, `variant`, `variable`

#### Batch Management (for Variant Products)
```
GET  /v1/products/{productId}/batches
POST /v1/products/{productId}/select-batches
GET  /v1/variants/{variantId}/batches
GET  /v1/batches/expiring?days=30
GET  /v1/batches/expired
GET  /v1/batches/{batchId}
GET  /v1/batches/{batchId}/movements
```

### Stock Adjustment Request Schema

Based on the API analysis:

```typescript
interface StockAdjustmentRequest {
  product_id: number;
  variant_id?: number;          // For variable products
  batch_id?: number;            // For variant (batch) products
  type: 'in' | 'out';           // Increase or decrease
  quantity: number;
  reason: string;               // Required explanation
  reference_number?: string;    // Optional reference
  notes?: string;
  adjusted_by: number;          // User ID
  adjustment_date: string;      // ISO 8601 format
}
```

---

## 2. Database Schema (IndexedDB)

### StockAdjustments Table

```typescript
interface StockAdjustment {
  id: string;                   // UUID for offline
  server_id?: number;           // ID from backend after sync
  product_id: number;
  variant_id?: number;
  batch_id?: number;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  reference_number?: string;
  notes?: string;
  adjusted_by: number;
  adjustment_date: string;
  
  // Offline sync fields
  sync_status: 'pending' | 'synced' | 'error';
  sync_error?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Audit trail
  old_quantity?: number;        // Stock before adjustment
  new_quantity?: number;        // Stock after adjustment
}
```

### IndexedDB Store Configuration

```typescript
// In src/lib/db/schema.ts
const STOCK_ADJUSTMENTS_STORE = {
  name: 'stock_adjustments',
  keyPath: 'id',
  indexes: [
    { name: 'product_id', keyPath: 'product_id' },
    { name: 'variant_id', keyPath: 'variant_id' },
    { name: 'batch_id', keyPath: 'batch_id' },
    { name: 'sync_status', keyPath: 'sync_status' },
    { name: 'adjustment_date', keyPath: 'adjustment_date' },
    { name: 'created_at', keyPath: 'created_at' },
  ],
};
```

---

## 3. Repository Pattern

### File: `src/lib/repositories/stockAdjustmentRepository.ts`

```typescript
import { AppError, createAppError } from '@/lib/errors';
import { getDB } from '@/lib/db';
import type { StockAdjustment } from '@/types/stock';

export class StockAdjustmentRepository {
  private storeName = 'stock_adjustments';

  async create(adjustment: Omit<StockAdjustment, 'id'>): Promise<StockAdjustment> {
    const db = await getDB();
    const id = crypto.randomUUID();
    const newAdjustment: StockAdjustment = {
      ...adjustment,
      id,
      sync_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.put(this.storeName, newAdjustment);
    return newAdjustment;
  }

  async getById(id: string): Promise<StockAdjustment | undefined> {
    const db = await getDB();
    return db.get(this.storeName, id);
  }

  async getByProductId(productId: number): Promise<StockAdjustment[]> {
    const db = await getDB();
    return db.getAllFromIndex(this.storeName, 'product_id', productId);
  }

  async getPending(): Promise<StockAdjustment[]> {
    const db = await getDB();
    return db.getAllFromIndex(this.storeName, 'sync_status', 'pending');
  }

  async markAsSynced(id: string, serverId: number): Promise<void> {
    const db = await getDB();
    const adjustment = await this.getById(id);
    if (!adjustment) throw createAppError('Stock adjustment not found', 'NOT_FOUND');

    adjustment.server_id = serverId;
    adjustment.sync_status = 'synced';
    adjustment.updated_at = new Date().toISOString();
    
    await db.put(this.storeName, adjustment);
  }

  async markAsError(id: string, error: string): Promise<void> {
    const db = await getDB();
    const adjustment = await this.getById(id);
    if (!adjustment) throw createAppError('Stock adjustment not found', 'NOT_FOUND');

    adjustment.sync_status = 'error';
    adjustment.sync_error = error;
    adjustment.updated_at = new Date().toISOString();
    
    await db.put(this.storeName, adjustment);
  }

  async getAll(filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'in' | 'out';
  }): Promise<StockAdjustment[]> {
    const db = await getDB();
    let adjustments = await db.getAll(this.storeName);

    if (filters?.startDate) {
      adjustments = adjustments.filter(
        a => a.adjustment_date >= filters.startDate!
      );
    }

    if (filters?.endDate) {
      adjustments = adjustments.filter(
        a => a.adjustment_date <= filters.endDate!
      );
    }

    if (filters?.type) {
      adjustments = adjustments.filter(a => a.type === filters.type);
    }

    return adjustments.sort(
      (a, b) => new Date(b.adjustment_date).getTime() - new Date(a.adjustment_date).getTime()
    );
  }
}

export const stockAdjustmentRepository = new StockAdjustmentRepository();
```

---

## 4. API Service Layer

### File: `src/api/services/stockAdjustmentService.ts`

```typescript
import { apiClient } from '@/api/axios';
import type { StockAdjustment } from '@/types/stock';

export interface StockAdjustmentApiRequest {
  product_id: number;
  variant_id?: number;
  batch_id?: number;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  reference_number?: string;
  notes?: string;
  adjusted_by: number;
  adjustment_date: string;
}

export const stockAdjustmentService = {
  async create(data: StockAdjustmentApiRequest) {
    const response = await apiClient.post('/stocks', data);
    return response.data;
  },

  async update(id: number, data: Partial<StockAdjustmentApiRequest>) {
    const response = await apiClient.put(`/stocks/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/stocks/${id}`);
    return response.data;
  },

  // Get batch info for variant products
  async getProductBatches(productId: number) {
    const response = await apiClient.get(`/products/${productId}/batches`);
    return response.data;
  },

  async getVariantBatches(variantId: number) {
    const response = await apiClient.get(`/variants/${variantId}/batches`);
    return response.data;
  },

  async selectBatches(productId: number, quantity: number) {
    const response = await apiClient.post(`/products/${productId}/select-batches`, {
      quantity,
    });
    return response.data;
  },
};
```

---

## 5. Custom Hook

### File: `src/hooks/useStockAdjustment.ts`

```typescript
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stockAdjustmentRepository } from '@/lib/repositories/stockAdjustmentRepository';
import { stockAdjustmentService } from '@/api/services/stockAdjustmentService';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncStore } from '@/stores/syncStore';
import { toast } from 'sonner';
import type { StockAdjustment } from '@/types/stock';

export function useStockAdjustment() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const { addToQueue } = useSyncStore();

  // Create stock adjustment
  const createAdjustment = useMutation({
    mutationFn: async (data: Omit<StockAdjustment, 'id' | 'sync_status' | 'created_at' | 'updated_at'>) => {
      if (isOnline) {
        // Try to create online first
        try {
          const result = await stockAdjustmentService.create({
            product_id: data.product_id,
            variant_id: data.variant_id,
            batch_id: data.batch_id,
            type: data.type,
            quantity: data.quantity,
            reason: data.reason,
            reference_number: data.reference_number,
            notes: data.notes,
            adjusted_by: data.adjusted_by,
            adjustment_date: data.adjustment_date,
          });

          // Save to IndexedDB with synced status
          await stockAdjustmentRepository.create({
            ...data,
            server_id: result.data.id,
            sync_status: 'synced',
          });

          return result;
        } catch (error) {
          // If online fails, fall through to offline mode
          console.error('Online creation failed, switching to offline:', error);
        }
      }

      // Offline mode: save locally and queue for sync
      const adjustment = await stockAdjustmentRepository.create({
        ...data,
        sync_status: 'pending',
      });

      addToQueue({
        id: adjustment.id,
        type: 'stock_adjustment',
        operation: 'create',
        data: adjustment,
        timestamp: Date.now(),
      });

      return { data: adjustment };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock adjustment created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create stock adjustment');
    },
  });

  // Get adjustments for a product
  const useProductAdjustments = (productId: number) => {
    return useQuery({
      queryKey: ['stock-adjustments', 'product', productId],
      queryFn: () => stockAdjustmentRepository.getByProductId(productId),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  // Get all adjustments with filters
  const useAdjustments = (filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'in' | 'out';
  }) => {
    return useQuery({
      queryKey: ['stock-adjustments', filters],
      queryFn: () => stockAdjustmentRepository.getAll(filters),
      staleTime: 1000 * 60 * 5,
    });
  };

  // Get pending adjustments for sync
  const usePendingAdjustments = () => {
    return useQuery({
      queryKey: ['stock-adjustments', 'pending'],
      queryFn: () => stockAdjustmentRepository.getPending(),
      staleTime: 1000 * 30, // 30 seconds
    });
  };

  // Get product batches (for variant products)
  const useProductBatches = (productId: number, enabled = true) => {
    return useQuery({
      queryKey: ['product-batches', productId],
      queryFn: async () => {
        if (!isOnline) {
          throw new Error('Batch data requires online connection');
        }
        return stockAdjustmentService.getProductBatches(productId);
      },
      enabled: enabled && isOnline,
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  };

  return {
    createAdjustment,
    useProductAdjustments,
    useAdjustments,
    usePendingAdjustments,
    useProductBatches,
  };
}
```

---

## 6. UI Components

### 6.1 Stock Adjustment Form

**File:** `src/components/stock/StockAdjustmentForm.tsx`

**Features:**
- Product/Variant selection with search
- Batch selection for variant products (with FIFO/LIFO/FEFO display)
- Adjustment type (Stock In / Stock Out)
- Quantity input with validation
- Reason dropdown + custom input
- Reference number (optional)
- Notes (optional)
- Current stock display
- New stock preview
- Confirmation dialog

**Form Fields:**
```typescript
interface StockAdjustmentFormData {
  product_id: number;
  variant_id?: number;
  batch_id?: number;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  reference_number?: string;
  notes?: string;
}
```

**Reason Options:**
- Damaged/Expired
- Lost/Stolen
- Returned by Customer
- Found in Inventory Count
- Initial Stock
- Supplier Return
- Transfer In/Out
- Other (custom input)

### 6.2 Stock Adjustment List

**File:** `src/components/stock/StockAdjustmentList.tsx`

**Features:**
- Filterable table (by date range, type, product)
- Sort by date, quantity, type
- Sync status indicator (pending/synced/error)
- Bulk actions (for retry sync on errors)
- Export to CSV
- Print adjustment report

**Columns:**
- Date & Time
- Product/Variant Name
- Batch Number (if applicable)
- Type (In/Out badge)
- Quantity
- Reason
- Adjusted By (user name)
- Old Stock → New Stock
- Sync Status
- Actions (view details, retry sync)

### 6.3 Stock History Card

**File:** `src/components/stock/StockHistoryCard.tsx`

**Purpose:** Show stock adjustments for a specific product on the product detail page

**Features:**
- Compact timeline view
- Last 10 adjustments with "View All" button
- Quick stats (total in, total out, net change)
- Visual indicators for adjustment type

---

## 7. Page Components

### 7.1 Stock Adjustment Management Page

**Route:** `/inventory/stock-adjustments`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Stock Adjustments                    [+ New Adjustment] │
├─────────────────────────────────────────────────────────┤
│  Filters:                                                │
│  [Date Range] [Type: All/In/Out] [Product Search]       │
│  [Sync Status: All/Pending/Synced/Error]                │
├─────────────────────────────────────────────────────────┤
│  Summary Cards:                                          │
│  [Total In: 1,250] [Total Out: 340] [Net: +910]        │
│  [Pending Sync: 5]                                       │
├─────────────────────────────────────────────────────────┤
│  Adjustments Table                                       │
│  (Paginated list of adjustments)                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 New Stock Adjustment Dialog

**Trigger:** Button on management page or product detail page

**Flow:**
1. Select product (with search/scan barcode)
2. If variable product → select variant
3. If variant product → select batch (or auto-select based on FIFO/LIFO/FEFO)
4. Choose type (In/Out)
5. Enter quantity
6. Select/enter reason
7. Optional: reference number, notes
8. Preview current → new stock
9. Confirm

---

## 8. Offline Support & Sync Strategy

### 8.1 Offline Behavior

**When Creating Adjustment Offline:**
1. Save to IndexedDB with `sync_status: 'pending'`
2. Update local product stock immediately (optimistic update)
3. Add to sync queue
4. Show pending badge in UI

**Stock Updates:**
```typescript
// Update product stock locally
const product = await productRepository.getById(productId);
if (product) {
  if (type === 'in') {
    product.stock_quantity += quantity;
  } else {
    product.stock_quantity -= quantity;
  }
  await productRepository.update(product.id, product);
}
```

### 8.2 Sync Strategy

**Priority:** High (stock data is critical)

**Sync Order:**
1. Process stock adjustments before sales/purchases
2. Validate stock levels after sync
3. Resolve conflicts (server stock takes precedence)

**Sync Process:**
```typescript
// In syncService.ts
async function syncStockAdjustments() {
  const pending = await stockAdjustmentRepository.getPending();
  
  for (const adjustment of pending) {
    try {
      const result = await stockAdjustmentService.create({
        product_id: adjustment.product_id,
        variant_id: adjustment.variant_id,
        batch_id: adjustment.batch_id,
        type: adjustment.type,
        quantity: adjustment.quantity,
        reason: adjustment.reason,
        reference_number: adjustment.reference_number,
        notes: adjustment.notes,
        adjusted_by: adjustment.adjusted_by,
        adjustment_date: adjustment.adjustment_date,
      });
      
      await stockAdjustmentRepository.markAsSynced(
        adjustment.id,
        result.data.id
      );
    } catch (error) {
      await stockAdjustmentRepository.markAsError(
        adjustment.id,
        error.message
      );
    }
  }
}
```

### 8.3 Conflict Resolution

**Scenario:** Local stock adjustment conflicts with server stock level

**Resolution Strategy:**
1. Server stock is source of truth
2. If conflict detected:
   - Show warning to user
   - Display: Local Stock vs Server Stock
   - Options: Keep Local, Use Server, Manual Resolve
3. Log discrepancies for audit

---

## 9. Validation Rules

### Frontend Validation

```typescript
const adjustmentSchema = z.object({
  product_id: z.number().positive('Product is required'),
  variant_id: z.number().optional(),
  batch_id: z.number().optional(),
  type: z.enum(['in', 'out']),
  quantity: z.number().positive('Quantity must be greater than 0'),
  reason: z.string().min(3, 'Reason is required'),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});
```

### Business Rules

1. **Stock Out Validation:**
   - Cannot reduce stock below 0
   - Warn if adjustment brings stock below alert level
   - For batch products: validate batch has sufficient stock

2. **Batch Selection:**
   - Required for variant (batch) products
   - Must respect product's batch selection strategy (FIFO/LIFO/FEFO)
   - Warn if batch is expired or near expiry

3. **Quantity Limits:**
   - Minimum: 1
   - Maximum: 999,999
   - Decimal places: Based on product unit

4. **Date Validation:**
   - Adjustment date cannot be in the future
   - Warn if adjustment date is > 30 days old

---

## 10. Error Handling

### Error Types

```typescript
enum StockAdjustmentError {
  INSUFFICIENT_STOCK = 'insufficient_stock',
  INVALID_BATCH = 'invalid_batch',
  PRODUCT_NOT_FOUND = 'product_not_found',
  VARIANT_NOT_FOUND = 'variant_not_found',
  SYNC_FAILED = 'sync_failed',
  VALIDATION_ERROR = 'validation_error',
}
```

### Error Messages

```typescript
const errorMessages = {
  insufficient_stock: 'Cannot reduce stock below 0. Current stock: {current}',
  invalid_batch: 'Selected batch is invalid or expired',
  product_not_found: 'Product not found. Please refresh and try again.',
  variant_not_found: 'Product variant not found',
  sync_failed: 'Failed to sync with server. Adjustment saved locally.',
  validation_error: 'Please check all required fields',
};
```

### User Feedback

1. **Success:**
   - Toast: "Stock adjusted successfully"
   - Update UI immediately
   - Show sync status if offline

2. **Warning:**
   - Low stock alert
   - Batch expiry warning
   - Old adjustment date

3. **Error:**
   - Toast with specific error message
   - Show retry button for sync errors
   - Log error for support

---

## 11. Testing Strategy

### Unit Tests

**Test Files:**
- `stockAdjustmentRepository.test.ts`
- `useStockAdjustment.test.ts`
- `StockAdjustmentForm.test.tsx`

**Test Cases:**
1. Create adjustment with valid data
2. Validate insufficient stock prevention
3. Test batch selection for variant products
4. Verify offline storage
5. Test sync queue addition
6. Validate form inputs

### Integration Tests

1. **Offline → Online Flow:**
   - Create adjustment offline
   - Come back online
   - Verify sync completion

2. **Product Stock Update:**
   - Create adjustment
   - Verify product stock updated
   - Check in product detail page

3. **Batch Product Flow:**
   - Select variant product
   - Choose batch
   - Verify batch stock updated

### E2E Tests

```typescript
// Test scenario: Create stock adjustment
describe('Stock Adjustment E2E', () => {
  it('should create stock adjustment for simple product', async () => {
    // Navigate to stock adjustments
    // Click New Adjustment
    // Search and select product
    // Enter quantity and reason
    // Submit
    // Verify in list
  });

  it('should handle offline adjustment creation', async () => {
    // Go offline
    // Create adjustment
    // Verify pending status
    // Go online
    // Wait for sync
    // Verify synced status
  });
});
```

---

## 12. Performance Considerations

### Optimization Strategies

1. **Lazy Loading:**
   - Load batches only when needed
   - Paginate adjustment history

2. **Caching:**
   - Cache product data (5 minutes)
   - Cache batch data (2 minutes)
   - Invalidate on adjustment creation

3. **Debouncing:**
   - Product search: 300ms
   - Quantity input: 500ms

4. **Virtual Scrolling:**
   - For large adjustment lists (>1000 items)
   - For batch selection dropdown (>100 batches)

5. **Background Sync:**
   - Process sync queue in background
   - Max 5 concurrent requests
   - Retry with exponential backoff

---

## 13. Security Considerations

### Permissions

```typescript
// Required permissions
enum StockPermission {
  CREATE_ADJUSTMENT = 'stock.adjustment.create',
  VIEW_ADJUSTMENT = 'stock.adjustment.view',
  VIEW_HISTORY = 'stock.adjustment.history',
}
```

### Audit Trail

- Log all adjustments with user info
- Track who created, when, and why
- Store IP address and device info
- Cannot delete adjustments (soft delete only)

### Data Validation

- Sanitize all inputs
- Validate user permissions before save
- Check product ownership (multi-tenant)
- Verify batch belongs to product/variant

---

## 14. Implementation Timeline

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create IndexedDB schema
- [ ] Implement repository layer
- [ ] Create API service layer
- [ ] Build custom hook
- [ ] Add to sync service

### Phase 2: UI Components (Week 2)
- [ ] Stock adjustment form
- [ ] Product/variant/batch selectors
- [ ] Adjustment list table
- [ ] Filters and search
- [ ] Stock history card

### Phase 3: Pages & Integration (Week 3)
- [ ] Stock adjustments page
- [ ] Integrate with product detail page
- [ ] Add to dashboard stats
- [ ] Implement batch auto-selection
- [ ] Add validation and error handling

### Phase 4: Offline & Sync (Week 4)
- [ ] Offline detection and queue
- [ ] Sync strategy implementation
- [ ] Conflict resolution
- [ ] Retry logic
- [ ] Status indicators

### Phase 5: Testing & Polish (Week 5)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Documentation
- [ ] User acceptance testing

---

## 15. Future Enhancements

### v1.1 Features
- [ ] Bulk stock adjustments (CSV import)
- [ ] Scheduled adjustments
- [ ] Approval workflow for large adjustments
- [ ] Stock transfer between warehouses
- [ ] Automated stock counts integration

### v1.2 Features
- [ ] Mobile barcode scanner for stock counts
- [ ] Stock adjustment reports and analytics
- [ ] AI-powered stock prediction
- [ ] Integration with supplier systems
- [ ] Photo evidence attachment

---

## 16. Related Documentation

- [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) - Project progress
- [OFFLINE_SUPPORT_ARCHITECTURE.md](./OFFLINE_SUPPORT_ARCHITECTURE.md) - Offline patterns
- [API_ALIGNMENT_ANALYSIS.md](./API_ALIGNMENT_ANALYSIS.md) - API integration
- Backend API: `/v1/stocks` endpoints

---

## 17. Questions & Decisions

### Open Questions

1. **Should we allow backdated adjustments?**
   - Recommendation: Yes, but with validation (max 30 days back)

2. **Should we support bulk adjustments?**
   - Recommendation: Phase 2 feature

3. **How to handle negative stock scenarios?**
   - Recommendation: Prevent by default, allow with admin override

4. **Batch auto-selection strategy priority?**
   - Recommendation: Follow product's batch_selection setting

### Design Decisions

1. ✅ **UUID for offline IDs** - Prevents conflicts
2. ✅ **Optimistic updates** - Better UX, rollback on error
3. ✅ **Server as source of truth** - For conflict resolution
4. ✅ **Immutable adjustments** - Cannot edit, only view/void

---

## Appendix A: Type Definitions

```typescript
// src/types/stock.ts

export interface StockAdjustment {
  id: string;
  server_id?: number;
  product_id: number;
  variant_id?: number;
  batch_id?: number;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  reference_number?: string;
  notes?: string;
  adjusted_by: number;
  adjustment_date: string;
  sync_status: 'pending' | 'synced' | 'error';
  sync_error?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  old_quantity?: number;
  new_quantity?: number;
}

export interface Batch {
  id: number;
  batch_number: string;
  product_id: number;
  variant_id?: number;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  manufactured_date?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchMovement {
  id: number;
  batch_id: number;
  type: 'in' | 'out';
  quantity: number;
  reference_type: string; // purchase, sale, adjustment
  reference_id: number;
  created_at: string;
}

export interface StockAdjustmentFilters {
  startDate?: string;
  endDate?: string;
  type?: 'in' | 'out';
  product_id?: number;
  sync_status?: 'pending' | 'synced' | 'error';
}

export interface StockAdjustmentSummary {
  total_in: number;
  total_out: number;
  net_change: number;
  pending_count: number;
}
```

---

## Appendix B: Component Props

```typescript
// StockAdjustmentForm.tsx
export interface StockAdjustmentFormProps {
  productId?: number;        // Pre-select product
  onSuccess?: () => void;
  onCancel?: () => void;
}

// StockAdjustmentList.tsx
export interface StockAdjustmentListProps {
  filters?: StockAdjustmentFilters;
  productId?: number;        // Filter by product
  limit?: number;            // For pagination
}

// StockHistoryCard.tsx
export interface StockHistoryCardProps {
  productId: number;
  limit?: number;            // Default: 10
  showSummary?: boolean;     // Show stats
}
```

---

## Sign-off

- [ ] **Technical Review** - Lead Developer
- [ ] **Backend API Verification** - Backend Team
- [ ] **UX Review** - Design Team
- [ ] **Security Review** - Security Team
- [ ] **Stakeholder Approval** - Product Owner

---

**Document Version:** 1.0  
**Last Updated:** December 26, 2025  
**Author:** Development Team  
**Status:** Ready for Implementation
