# Supplier Management - Quick Brief

## Overview
Build supplier/vendor management screen for purchase orders.

## Offline Support: **View-Only** ⚠️

### ✅ Works Offline:
- View supplier list (cached)
- Search cached suppliers
- View supplier details

### ❌ Requires Internet:
- Create new supplier
- Edit supplier
- Delete supplier

**Why?** Suppliers are managed by admins during business hours with stable internet. Not needed at POS counter.

---

## What to Build

1. **List Page** - Table with search & filter
2. **Add/Edit Dialog** - Form with validation
3. **View Dialog** - Read-only details
4. **Delete** - Confirmation + soft delete

---

## Data Model

```typescript
interface Supplier {
  id: number
  name: string               // Required
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  tax_number?: string
  payment_terms?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

## Implementation Strategy

### 1. API Service (`src/api/services/suppliers.service.ts`)
```typescript
export const suppliersService = {
  getAll: () => apiClient.get('/suppliers'),
  getById: (id) => apiClient.get(`/suppliers/${id}`),
  create: (data) => apiClient.post('/suppliers', data),
  update: (id, data) => apiClient.put(`/suppliers/${id}`, data),
  delete: (id) => apiClient.delete(`/suppliers/${id}`),
}
```

### 2. Hook with Caching (`src/pages/suppliers/hooks/useSuppliers.ts`)
```typescript
export function useSuppliers() {
  const { isOnline } = useOnlineStatus()
  
  // Fetch with cache fallback
  const { data } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      if (isOnline) {
        const data = await suppliersService.getAll()
        await supplierCache.set('suppliers', data) // Cache it
        return data
      } else {
        return await supplierCache.get('suppliers') // Use cache
      }
    }
  })

  const createSupplier = (data) => {
    if (!isOnline) {
      toast.error('Internet required')
      return
    }
    // Create via API
  }
}
```

### 3. Components
```
src/pages/suppliers/
├── SuppliersPage.tsx
├── hooks/useSuppliers.ts
└── components/
    ├── SuppliersTable.tsx
    ├── SupplierFormDialog.tsx
    └── SupplierDetailsDialog.tsx
```

---

## Key Points to Explain

### 1. **Why No Full Offline?**
- Suppliers are managed by office staff
- Not used at POS counter
- Adding suppliers can wait for internet
- Simpler = faster development

### 2. **Caching Strategy**
- Cache supplier list for 24 hours
- Use cached data when offline for viewing
- Show "Viewing offline data" toast
- Disable edit/delete buttons when offline

### 3. **Validation**
- Name is required
- Email must be valid format
- Phone is optional but validated if provided

---

## Timeline

**Day 1:** API service + hook + types (4h)  
**Day 2:** Components + form + table (6h)  
**Day 3:** Search/filter + polish (4h)  

**Total: 14 hours = 2-3 days**

---

## Testing Checklist

**Online:**
- ✅ Create supplier
- ✅ Edit supplier
- ✅ Delete supplier
- ✅ Search/filter

**Offline:**
- ✅ View cached list
- ✅ Search cached data
- ❌ Create → "Internet required"
- ❌ Edit → "Internet required"
- ❌ Delete → "Internet required"

---

## Differences from Products/Sales

| Feature | Products/Sales | Suppliers |
|---------|---------------|-----------|
| Offline Create | ✅ Yes | ❌ No |
| Offline Edit | ✅ Yes | ❌ No |
| Sync Queue | ✅ Yes | ❌ No |
| Conflict Resolution | ✅ Yes | ❌ No |
| Cache | ✅ Full data | ✅ View only |

---

## Hand-off Message

> Hi! New assignment: **Supplier Management**
>
> **What to build:** CRUD for suppliers (vendor/supplier info)
>
> **Key difference:** This is **admin-only**, NOT POS feature.
> - ✅ View suppliers offline (cached)
> - ❌ Create/edit/delete requires internet
>
> **Why?** Suppliers are managed by office staff with stable internet. No need for complex offline sync.
>
> **Full details:** See `SUPPLIER-MANAGEMENT-ASSIGNMENT.md`
>
> **Timeline:** 2-3 days
>
> Let me know if you have questions!

---

## API Endpoints

```
GET    /api/suppliers           - List all
GET    /api/suppliers/:id       - Get one
POST   /api/suppliers           - Create
PUT    /api/suppliers/:id       - Update
DELETE /api/suppliers/:id       - Delete
```

---

## Reference Files

```
✅ Similar pattern:
   src/pages/categories/       - CRUD pattern
   src/hooks/useOnlineStatus.ts - Online check
   
✅ Use these:
   - shadcn/ui components
   - React Query
   - Zod validation
   - Sonner toasts
```

---

**Full guide:** `SUPPLIER-MANAGEMENT-ASSIGNMENT.md` 📄

