# Supplier Management CRUD - Task Assignment

**Assigned to:** [Team Member Name]  
**Task:** Implement Supplier Management Screen  
**Priority:** Medium  
**Estimated Time:** 2-3 days  
**Offline Support:** Read-only cache (NOT full offline CRUD)

---

## Overview

Build a complete **Supplier Management** screen for managing supplier/vendor information. This will be used when creating purchase orders and managing inventory suppliers.

**Important:** This is an **admin/management feature**, NOT a POS feature. Full offline support is NOT required. Users can view cached suppliers offline, but create/edit/delete requires internet connection.

---

## Data Model

**Supplier Object:**

```typescript
interface Supplier {
  id: number              // Server ID
  name: string            // Company name (required)
  contact_person?: string // Contact person name
  email?: string          // Email address
  phone?: string          // Phone number
  address?: string        // Physical address
  city?: string           // City
  state?: string          // State/Province
  zip_code?: string       // Postal code
  country?: string        // Country
  tax_number?: string     // Tax/VAT number
  payment_terms?: string  // e.g., "Net 30", "Due on receipt"
  notes?: string          // Additional notes
  is_active: boolean      // Active status
  created_at: string      // Timestamp
  updated_at: string      // Timestamp
}
```

---

## Features to Implement

### Feature 1: List View

**Display:**
- [ ] Table with columns:
  - Supplier Name
  - Contact Person
  - Phone
  - Email
  - Status badge (Active/Inactive)
  - Actions (View, Edit, Delete)

- [ ] Search box - filter by name, contact, phone
- [ ] Filter button - filter by status (active/inactive)
- [ ] Sort by name or created date
- [ ] Pagination (if > 50 suppliers)

**Example UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Supplier Name      | Contact    | Phone        | Status │
├─────────────────────────────────────────────────────────┤
│ ABC Wholesale Inc  | John Smith | 555-0100    | Active │
│ XYZ Distributors   | Jane Doe   | 555-0200    | Active │
│ Global Imports Ltd | Bob Wilson | 555-0300    | Inactive│
│ (View) (Edit) (Delete)                                  │
└─────────────────────────────────────────────────────────┘
```

### Feature 2: Add/Edit Dialog

**Form Fields:**
```
[ Supplier Name ]      Text input (required)
[ Contact Person ]     Text input (optional)
[ Email ]             Email input (optional, validate format)
[ Phone ]             Tel input (optional)

[ Address ]           Textarea (optional)
[ City ]              Text input (optional)
[ State/Province ]    Text input (optional)
[ ZIP/Postal Code ]   Text input (optional)
[ Country ]           Text input (optional)

[ Tax/VAT Number ]    Text input (optional)
[ Payment Terms ]     Select: Net 15, Net 30, Due on receipt, etc.
[ Notes ]             Textarea (optional)
[ Active ]            Switch (default: ON)

[Cancel] [Save]
```

### Feature 3: View Details Dialog

- [ ] Show all supplier information in read-only format
- [ ] Show creation and last updated dates
- [ ] Show purchase history summary (if time permits)
- [ ] Edit button to switch to edit mode

### Feature 4: Delete with Confirmation

- [ ] Click delete → Show confirmation dialog
- [ ] Warn if supplier has associated purchase orders
- [ ] Soft delete (set is_active = false) preferred over hard delete
- [ ] Show success toast after deletion

### Feature 5: Search & Filter

- [ ] Real-time search (debounced 300ms)
- [ ] Filter by active/inactive status
- [ ] Clear filters button

---

## Offline Support Strategy

### ⚠️ IMPORTANT: Limited Offline Support

**What works offline:**
- ✅ **View supplier list** (cached data from last sync)
- ✅ **Search cached suppliers** (local filter)
- ✅ **View supplier details** (cached data)

**What requires internet:**
- ❌ **Create new supplier** → Show message: "Please connect to internet"
- ❌ **Edit supplier** → Show message: "Please connect to internet"
- ❌ **Delete supplier** → Show message: "Please connect to internet"

### Implementation:

```typescript
// Check online status before edit/create/delete
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const { isOnline } = useOnlineStatus()

const handleCreate = () => {
  if (!isOnline) {
    toast.error('Internet connection required', {
      description: 'Creating suppliers requires an active internet connection.'
    })
    return
  }
  // Proceed with create
}
```

### Caching Strategy:

```typescript
// Cache suppliers for offline viewing
import { supplierCache } from '@/lib/cache'

// On successful fetch
const fetchSuppliers = async () => {
  if (isOnline) {
    const data = await api.suppliers.getAll()
    await supplierCache.set('suppliers', data, 24 * 60 * 60) // 24 hours
    return data
  } else {
    // Use cached data
    const cached = await supplierCache.get('suppliers')
    if (cached) return cached
    throw new Error('No cached data available')
  }
}
```

---

## Technical Implementation

### Step 1: Create API Service

**File:** `src/api/services/suppliers.service.ts`

```typescript
import { apiClient } from '../client'
import type { Supplier } from '@/types/api.types'

export const suppliersService = {
  // Get all suppliers
  getAll: async (): Promise<Supplier[]> => {
    const response = await apiClient.get('/suppliers')
    return response.data
  },

  // Get supplier by ID
  getById: async (id: number): Promise<Supplier> => {
    const response = await apiClient.get(`/suppliers/${id}`)
    return response.data
  },

  // Create supplier
  create: async (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
    const response = await apiClient.post('/suppliers', data)
    return response.data
  },

  // Update supplier
  update: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.put(`/suppliers/${id}`, data)
    return response.data
  },

  // Delete supplier (soft delete)
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`)
  },

  // Search suppliers
  search: async (query: string): Promise<Supplier[]> => {
    const response = await apiClient.get('/suppliers/search', { params: { q: query } })
    return response.data
  },
}
```

### Step 2: Create Custom Hook

**File:** `src/pages/suppliers/hooks/useSuppliers.ts`

```typescript
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suppliersService } from '@/api/services/suppliers.service'
import { supplierCache } from '@/lib/cache'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toast } from 'sonner'

export function useSuppliers() {
  const { isOnline } = useOnlineStatus()
  const queryClient = useQueryClient()

  // Fetch suppliers
  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      if (isOnline) {
        const data = await suppliersService.getAll()
        // Cache for offline use
        await supplierCache.set('suppliers', data, 24 * 60 * 60)
        return data
      } else {
        // Use cached data
        const cached = await supplierCache.get('suppliers')
        if (cached) {
          toast.info('Viewing offline data', {
            description: 'Showing cached supplier list'
          })
          return cached
        }
        throw new Error('No cached data available')
      }
    },
  })

  // Create supplier
  const createMutation = useMutation({
    mutationFn: suppliersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier created successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to create supplier', {
        description: error.message
      })
    }
  })

  // Update supplier
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Supplier> }) =>
      suppliersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier updated successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to update supplier', {
        description: error.message
      })
    }
  })

  // Delete supplier
  const deleteMutation = useMutation({
    mutationFn: suppliersService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deleted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to delete supplier', {
        description: error.message
      })
    }
  })

  const createSupplier = (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isOnline) {
      toast.error('Internet connection required', {
        description: 'Creating suppliers requires an active connection.'
      })
      return
    }
    createMutation.mutate(data)
  }

  const updateSupplier = (id: number, data: Partial<Supplier>) => {
    if (!isOnline) {
      toast.error('Internet connection required', {
        description: 'Updating suppliers requires an active connection.'
      })
      return
    }
    updateMutation.mutate({ id, data })
  }

  const deleteSupplier = (id: number) => {
    if (!isOnline) {
      toast.error('Internet connection required', {
        description: 'Deleting suppliers requires an active connection.'
      })
      return
    }
    deleteMutation.mutate(id)
  }

  return {
    suppliers: suppliers || [],
    isLoading,
    error,
    isOnline,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
```

### Step 3: Create Components

**File Structure:**
```
src/pages/suppliers/
├── SuppliersPage.tsx           (Main page)
├── hooks/
│   └── useSuppliers.ts
├── components/
│   ├── SuppliersTable.tsx       (List view)
│   ├── SupplierFormDialog.tsx   (Add/Edit form)
│   ├── SupplierDetailsDialog.tsx (View details)
│   └── SupplierFilters.tsx      (Search & filter)
└── types.ts                     (TypeScript types)
```

---

## Step-by-Step Development Guide

### Day 1: API & Hook (4 hours)

```powershell
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/supplier-management

# 2. Create API service
# File: src/api/services/suppliers.service.ts
# - Implement all CRUD operations
# - Export service object

# 3. Add to main services index
# File: src/api/services/index.ts
# - Export suppliersService

# 4. Create custom hook
# File: src/pages/suppliers/hooks/useSuppliers.ts
# - Implement with React Query
# - Add caching logic
# - Add online/offline checks
```

**Test:**
```powershell
npm run typecheck  # No type errors
npm run lint       # No lint errors
```

### Day 2: Components & UI (6 hours)

```powershell
# 1. Create main page
# File: src/pages/suppliers/SuppliersPage.tsx
# - Layout with header, search, table
# - Add/Edit buttons

# 2. Create table component
# File: src/pages/suppliers/components/SuppliersTable.tsx
# - Display suppliers in table
# - Add action buttons

# 3. Create form dialog
# File: src/pages/suppliers/components/SupplierFormDialog.tsx
# - Form with all fields
# - Validation with Zod
# - Online check before submit

# 4. Create details dialog
# File: src/pages/suppliers/components/SupplierDetailsDialog.tsx
# - Read-only view
# - Edit button
```

**Test:**
```powershell
npm run dev  # Manual testing
npm run test  # Unit tests
```

### Day 3: Features & Polish (4 hours)

```powershell
# 1. Add search functionality
# - Debounced search
# - Filter by status

# 2. Add delete confirmation
# - Confirmation modal
# - Soft delete

# 3. Add offline indicators
# - Show badge when viewing cached data
# - Disable buttons when offline

# 4. Final testing
npm run lint      # Code style
npm run typecheck # No type errors
npm run test      # All tests pass
```

---

## Testing Checklist

Before submitting PR, verify:

```typescript
// ✅ Online functionality
- Create supplier with all fields
- Update supplier information
- Delete supplier (with confirmation)
- Search suppliers by name
- Filter by active/inactive

// ✅ Offline behavior
- View cached supplier list (after going offline)
- Search cached suppliers locally
- Try to create → See "Internet required" message
- Try to edit → See "Internet required" message
- Try to delete → See "Internet required" message

// ✅ Validation
- Required fields (name)
- Email format validation
- Phone format validation (optional)
- Duplicate supplier name warning

// ✅ UI/UX
- Loading states
- Error messages
- Success toasts
- Confirmation dialogs
- Empty states
```

---

## Code Style Requirements

Follow project patterns:

```typescript
// ✅ Use custom hooks for state
export function useSuppliers() { }

// ✅ Separate concerns
// hooks/ - Business logic & API calls
// components/ - UI components
// types.ts - TypeScript interfaces

// ✅ Use existing patterns
// - shadcn/ui components (Dialog, Table, etc.)
// - React Query for data fetching
// - Sonner for toasts
// - Zod for form validation

// ✅ Error handling
try {
  await createSupplier(data)
  toast.success('Supplier created')
} catch (err) {
  toast.error(err.message)
}

// ✅ Online checks
if (!isOnline) {
  toast.error('Internet connection required')
  return
}
```

---

## Validation Schema

```typescript
import { z } from 'zod'

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(100),
  contact_person: z.string().max(100).optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(20).optional(),
  country: z.string().max(50).optional(),
  tax_number: z.string().max(50).optional(),
  payment_terms: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  is_active: z.boolean().default(true),
})

export type SupplierFormData = z.infer<typeof supplierSchema>
```

---

## Commit Messages

Use Conventional Commits format:

```powershell
git commit -m "feat: implement supplier management CRUD

- Create SuppliersPage with table and search
- Add SupplierFormDialog for create/edit
- Implement useSuppliers hook with online/offline logic
- Add caching for offline viewing
- Add delete confirmation with soft delete
- Restrict create/edit/delete to online only"
```

---

## Resources & References

Check these files for patterns:

```
✅ Similar screens:
   src/pages/categories/ - Similar CRUD pattern
   src/pages/parties/ - Similar list/form structure

✅ Hooks to reference:
   src/hooks/useOnlineStatus.ts - Online/offline detection
   src/hooks/useCategories.ts - Similar API pattern

✅ Components to use:
   src/components/ui/ - All UI components
   src/components/common/ - Common components

✅ API pattern:
   src/api/services/categories.service.ts - Similar service pattern
```

---

## Submission Checklist

Before creating PR:

- [ ] Feature branch created: `feature/supplier-management`
- [ ] All CRUD operations working
- [ ] TypeScript types defined
- [ ] Components created and tested
- [ ] Online/offline logic implemented
- [ ] Search and filter working
- [ ] Delete confirmation working
- [ ] Validation working (Zod schema)
- [ ] Cache works offline (view-only)
- [ ] Unit tests written
- [ ] Code follows style guide
- [ ] No console errors or warnings
- [ ] ESLint passes: `npm run lint`
- [ ] TypeScript passes: `npm run typecheck`
- [ ] DEVELOPMENT_LOG.md updated

---

## API Endpoints to Use

Reference backend API:

```
GET    /api/suppliers           - Get all suppliers
GET    /api/suppliers/:id       - Get supplier by ID
POST   /api/suppliers           - Create new supplier
PUT    /api/suppliers/:id       - Update supplier
DELETE /api/suppliers/:id       - Delete supplier
GET    /api/suppliers/search    - Search suppliers
```

---

## Questions?

Ask these before starting:
- Should suppliers be soft-deleted or hard-deleted?
- Any specific payment terms options needed?
- Should we show purchase order count per supplier?
- Any required fields besides supplier name?

---

## Timeline

**Day 1 (4 hours):**
- API service complete
- Hook implemented
- Types defined

**Day 2 (6 hours):**
- Components built
- Form with validation
- Table with actions

**Day 3 (4 hours):**
- Search & filters
- Offline handling
- Polish & refinement
- PR submission

**Total: ~14 hours = 2-3 days** ✅

---

## Important Notes

### ⚠️ Key Differences from Products/Sales:

1. **No Full Offline CRUD** ❌
   - Products/Sales: Full offline create/edit/delete
   - Suppliers: View only offline, edit requires internet

2. **Simpler Caching** ✅
   - Just cache supplier list for viewing
   - No sync queue needed
   - No conflict resolution needed

3. **Admin Feature** 👤
   - Used by managers, not cashiers
   - Not time-critical like sales
   - Stable internet expected

### Why This Approach?

- ✅ **Simpler** - Less code to maintain
- ✅ **Safer** - No offline data conflicts
- ✅ **Practical** - Suppliers rarely added during offline periods
- ✅ **Faster** - Implement in 2-3 days vs 5-7 days for full offline

---

Good luck! Let me know if you have questions 🚀
