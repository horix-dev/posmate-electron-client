# Permission System - Implementation Guide

**Status:** ✅ Fully Implemented  
**Last Updated:** January 23, 2026

---

## Overview

Your Electron app now has **full permission control** matching the Laravel backend's visibility JSON system. This allows you to control:

- **Route access** - Block entire pages based on permissions
- **UI visibility** - Hide/show buttons, menus, and components
- **Price visibility** - Control access to sensitive pricing information
- **Feature access** - Enable/disable features based on user role

---

## Quick Start

### 1. Check Permissions in Components

```tsx
import { usePermissions } from '@/hooks/usePermissions'

function SalesPage() {
  const { hasPermission, canCreate, canViewPrice } = usePermissions()

  return (
    <div>
      <h1>Sales</h1>
      
      {/* Show create button only if user can create sales */}
      {canCreate('sales') && (
        <Button onClick={handleCreate}>Create Sale</Button>
      )}
      
      {/* Show price column only if user has price permission */}
      {canViewPrice('products') && (
        <TableColumn>Price</TableColumn>
      )}
    </div>
  )
}
```

### 2. Use Permission Gate Component

```tsx
import PermissionGate from '@/components/shared/PermissionGate'

function ProductList() {
  return (
    <div>
      {/* Show button only with permission */}
      <PermissionGate permission="products.create">
        <Button>Add Product</Button>
      </PermissionGate>
      
      {/* Hide price with fallback */}
      <PermissionGate 
        permission="products.price"
        fallback={<span className="text-muted-foreground">***</span>}
      >
        <span>${product.price}</span>
      </PermissionGate>
      
      {/* Require multiple permissions (ANY) */}
      <PermissionGate permission={['sales.create', 'sales.update']}>
        <Button>Create/Edit Sale</Button>
      </PermissionGate>
      
      {/* Require ALL permissions */}
      <PermissionGate 
        permission={['products.read', 'products.price']} 
        requireAll
      >
        <ProductPriceColumn />
      </PermissionGate>
    </div>
  )
}
```

### 3. Protect Routes

```tsx
import { ProtectedRoute } from '@/routes/ProtectedRoute'

function AppRoutes() {
  return (
    <Routes>
      {/* Basic authentication */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      
      {/* Require specific permission */}
      <Route path="/products" element={
        <ProtectedRoute permission="products.r">
          <ProductsPage />
        </ProtectedRoute>
      } />
      
      {/* Require multiple permissions (ANY) */}
      <Route path="/sales" element={
        <ProtectedRoute permission={['sales.r', 'sale-returns.r']}>
          <SalesPage />
        </ProtectedRoute>
      } />
      
      {/* Require ALL permissions */}
      <Route path="/reports/profit" element={
        <ProtectedRoute 
          permission={['sale-reports.r', 'sale-reports.price']} 
          requireAll
        >
          <ProfitReportPage />
        </ProtectedRoute>
      } />
    </Routes>
  )
}
```

### 4. Use Permission Store Methods

```tsx
import { useAuthStore } from '@/stores/auth.store'

function MenuComponent() {
  const authStore = useAuthStore()
  
  // Direct store access
  if (authStore.canCreate('products')) {
    // Show menu item
  }
  
  if (authStore.isShopOwner()) {
    // Show admin features
  }
  
  const accessibleModules = authStore.getAccessibleModules()
  // Filter menu based on accessible modules
}
```

---

## Permission Format

### Permission String Structure

**Format:** `module.action`

**Examples:**
```typescript
'sales.create'       // Can create sales
'products.read'      // Can view products
'products.price'     // Can view product prices
'categories.delete'  // Can delete categories
```

### Action Codes

| Code | Full Name | Purpose |
|------|-----------|---------|
| `r` | Read | View/list records |
| `c` | Create | Add new records |
| `u` | Update | Edit existing records |
| `d` | Delete | Remove records |
| `price` | Price Visibility | View pricing information |

---

## Available Modules

### Core POS Modules

- `dashboard` - Dashboard access
- `sales` - Sales operations (r, c, u, d)
- `inventory` - Stock adjustments (r, c)
- `sale-returns` - Customer returns (r, c)
- `purchases` - Purchase orders (r, c, u, d, price)
- `purchase-returns` - Supplier returns (r, c, price)

### Product Management

- `products` - Product catalog (r, c, u, d, price)
- `categories` - Product categories (r, c, u, d)
- `brands` - Brand management (r, c, u, d)
- `units` - Units of measurement (r, c, u, d)
- `stocks` - Inventory viewing (r, price)

### Customer/Supplier

- `parties` - Customers and suppliers (r, c, u, d)
- `dues` - Due payment tracking (r)

### Financial

- `incomes` - Income entries (r, c, u, d)
- `expenses` - Expense entries (r, c, u, d)
- `vats` - Tax/VAT management (r, c, u, d)
- `payment-types` - Payment methods (r, c, u, d)

### Reports

- `sale-reports` - Sales analytics (r)
- `purchase-reports` - Purchase analytics (r)
- `stock-reports` - Inventory reports (r)
- `loss-profit-reports` - P&L summary (r)

### Settings

- `roles` - Staff role management (r, c, u, d)
- `manage-settings` - Business settings (r, u)

---

## API Reference

### usePermissions Hook

```tsx
const {
  // Check single permission
  hasPermission,           // (permission: string) => boolean
  
  // Check multiple permissions
  hasAnyPermission,        // (permissions: string[]) => boolean
  hasAllPermissions,       // (permissions: string[]) => boolean
  
  // Convenience methods
  canRead,                 // (module: string) => boolean
  canCreate,               // (module: string) => boolean
  canUpdate,               // (module: string) => boolean
  canDelete,               // (module: string) => boolean
  canViewPrice,            // (module: string) => boolean
  
  // Role checks
  isShopOwner,             // () => boolean
  
  // Utilities
  canPerformAction,        // (module: string, action: string) => boolean
  getAccessibleModules,    // () => string[]
  getPermissionCount,      // () => number
  
  // Current user
  user,                    // User | null
} = usePermissions()
```

### Permission Utility Functions

```tsx
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canRead,
  canCreate,
  canUpdate,
  canDelete,
  canViewPrice,
  isShopOwner,
  parseVisibility,
  checkPermissionDetailed,
  countActivePermissions,
  getAccessibleModules,
  filterByPermission,
} from '@/lib/permissions'

// All functions take user as first parameter
hasPermission(user, 'sales.create')
canCreate(user, 'products')
```

---

## Real-World Examples

### Example 1: Product List with Conditional Features

```tsx
import { usePermissions } from '@/hooks/usePermissions'
import PermissionGate from '@/components/shared/PermissionGate'

function ProductListPage() {
  const { canCreate, canUpdate, canDelete, canViewPrice } = usePermissions()
  
  return (
    <div>
      <div className="flex justify-between">
        <h1>Products</h1>
        
        {/* Show create button only if user can create */}
        <PermissionGate permission="products.c">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </PermissionGate>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            
            {/* Show price column conditionally */}
            {canViewPrice('products') && (
              <TableHead>Price</TableHead>
            )}
            
            {/* Show actions if user can update or delete */}
            {(canUpdate('products') || canDelete('products')) && (
              <TableHead>Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {products.map(product => (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.category?.name}</TableCell>
              
              {/* Hide price from staff without permission */}
              {canViewPrice('products') ? (
                <TableCell>{formatCurrency(product.price)}</TableCell>
              ) : (
                <TableCell className="text-muted-foreground">***</TableCell>
              )}
              
              <TableCell>
                <div className="flex gap-2">
                  <PermissionGate permission="products.u">
                    <Button size="sm" onClick={() => handleEdit(product)}>
                      Edit
                    </Button>
                  </PermissionGate>
                  
                  <PermissionGate permission="products.d">
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(product)}>
                      Delete
                    </Button>
                  </PermissionGate>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Example 2: Sidebar Menu with Permission Filtering

```tsx
import { usePermissions } from '@/hooks/usePermissions'

interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType
  permission?: string
}

function Sidebar() {
  const { hasPermission } = usePermissions()
  
  const menuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, permission: 'dashboard.r' },
    { label: 'Sales', href: '/sales', icon: ShoppingCart, permission: 'sales.r' },
    { label: 'Products', href: '/products', icon: Package, permission: 'products.r' },
    { label: 'Customers', href: '/parties', icon: Users, permission: 'parties.r' },
    { label: 'Reports', href: '/reports', icon: BarChart, permission: 'sale-reports.r' },
    { label: 'Settings', href: '/settings', icon: Settings, permission: 'manage-settings.r' },
  ]
  
  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  )
  
  return (
    <nav>
      {visibleMenuItems.map(item => (
        <Link key={item.href} to={item.href}>
          <item.icon />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

### Example 3: Sales Page with Multi-Permission Checks

```tsx
import { usePermissions } from '@/hooks/usePermissions'
import PermissionGate from '@/components/shared/PermissionGate'

function SalesPage() {
  const { 
    canCreate, 
    canUpdate, 
    canDelete, 
    hasAnyPermission,
    isShopOwner 
  } = usePermissions()
  
  return (
    <div>
      {/* Header with conditional actions */}
      <div className="flex justify-between">
        <h1>Sales</h1>
        
        <div className="flex gap-2">
          <PermissionGate permission="sales.c">
            <Button onClick={handleCreateSale}>Create Sale</Button>
          </PermissionGate>
          
          {/* Show export button if user can view reports */}
          <PermissionGate permission="sale-reports.r">
            <Button variant="outline" onClick={handleExport}>
              Export
            </Button>
          </PermissionGate>
        </div>
      </div>
      
      {/* Sales list */}
      <SalesList />
      
      {/* Show bulk actions only if user can delete */}
      <PermissionGate permission="sales.d">
        <BulkDeleteButton />
      </PermissionGate>
      
      {/* Admin-only section */}
      {isShopOwner() && (
        <div className="mt-4">
          <h2>Admin Tools</h2>
          <AdminSalesTools />
        </div>
      )}
    </div>
  )
}
```

### Example 4: Invoice with Price Hiding

```tsx
import PermissionGate from '@/components/shared/PermissionGate'

function InvoiceView({ sale }: { sale: Sale }) {
  return (
    <div>
      <h1>Invoice #{sale.invoiceNumber}</h1>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Qty</TableHead>
            
            <PermissionGate permission="sales.price">
              <TableHead>Unit Price</TableHead>
              <TableHead>Discount</TableHead>
            </PermissionGate>
            
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {sale.items.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.product_name}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              
              {/* Hide price details from cashiers */}
              <PermissionGate 
                permission="sales.price"
                fallback={
                  <>
                    <TableCell>***</TableCell>
                    <TableCell>***</TableCell>
                  </>
                }
              >
                <TableCell>{formatCurrency(item.price)}</TableCell>
                <TableCell>{formatCurrency(item.discount)}</TableCell>
              </PermissionGate>
              
              <TableCell>{formatCurrency(item.subtotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Summary with conditional price visibility */}
      <div className="mt-4">
        <div>Total: {formatCurrency(sale.total)}</div>
        
        <PermissionGate permission="sales.price">
          <div>Discount: {formatCurrency(sale.discount)}</div>
          <div>Profit: {formatCurrency(sale.profit)}</div>
        </PermissionGate>
      </div>
    </div>
  )
}
```

---

## Permission System Architecture

```
┌─────────────────────────────────────────────┐
│        Laravel Backend (API)                │
│                                             │
│  User Model:                                │
│  ├─ role: 'shop-owner' | 'staff'          │
│  └─ visibility: JSON {                     │
│       "sales": {"r": "1", "c": "1"},      │
│       "products": {"r": "1", "price": "0"} │
│     }                                       │
└──────────────┬──────────────────────────────┘
               │
               │ API Response
               │
               ▼
┌─────────────────────────────────────────────┐
│     Electron App (Frontend)                 │
│                                             │
│  Auth Store:                                │
│  ├─ user.role                              │
│  ├─ user.visibility (JSON string)          │
│  └─ Permission methods                      │
│                                             │
│  Permission Layer:                          │
│  ├─ lib/permissions.ts (utilities)         │
│  ├─ hooks/usePermissions.ts (React hook)   │
│  ├─ components/PermissionGate.tsx          │
│  └─ routes/ProtectedRoute.tsx              │
│                                             │
│  Components:                                │
│  ├─ Check permissions before render        │
│  ├─ Hide/show UI elements                  │
│  └─ Block route access                     │
└─────────────────────────────────────────────┘
```

---

## Special Cases

### Shop Owner Bypass

Shop owners automatically have **all permissions**:

```tsx
// Shop owners bypass all permission checks
if (user.role === 'shop-owner') {
  return true // Always allowed
}
```

### Price Visibility

Control access to sensitive pricing:

```tsx
<PermissionGate 
  permission="products.price"
  fallback={<span>***</span>}
>
  <span>${product.cost}</span>
</PermissionGate>
```

### Multi-Branch Access

Staff with `branch_id` can only see data from their branch:

```tsx
// Backend filters automatically
// Frontend shows single-branch UI for staff
if (user.role === 'staff' && user.branch_id) {
  // Show branch-specific data
}
```

---

## Testing Permissions

### Test as Different Users

```tsx
// In development, you can test with different user roles
const testUser: User = {
  id: 1,
  name: 'Test Staff',
  email: 'staff@test.com',
  role: 'staff',
  visibility: JSON.stringify({
    sales: { r: '1', c: '1', u: '0', d: '0' },
    products: { r: '1', c: '0', u: '0', d: '0', price: '0' },
  }),
}

// Temporarily set user in auth store
authStore.setUser(testUser)
```

### Permission Check Console

```tsx
// Debug permission checks
import { checkPermissionDetailed } from '@/lib/permissions'

const result = checkPermissionDetailed(user, 'sales.create')
console.log(result)
// { allowed: false, reason: 'Permission denied for sales.create' }
```

---

## Files Created

| File | Purpose |
|------|---------|
| `src/types/permission.types.ts` | TypeScript types for permissions |
| `src/lib/permissions.ts` | Permission utility functions |
| `src/hooks/usePermissions.ts` | React hook for permissions |
| `src/components/shared/PermissionGate.tsx` | Permission gate component |
| `src/routes/ProtectedRoute.tsx` | Updated with permission support |
| `src/stores/auth.store.ts` | Updated with permission methods |

---

## Next Steps

1. **Update your routes** - Add permission requirements to routes
2. **Wrap sensitive UI** - Use `<PermissionGate>` for buttons/actions
3. **Filter menus** - Hide menu items based on permissions
4. **Test with staff users** - Verify permissions work correctly
5. **Document your permissions** - Keep track of what permissions control what

---

## FAQ

**Q: What if a user has no visibility data?**  
A: Staff without visibility JSON will have no permissions. Shop owners always have full access.

**Q: Can I add custom permissions?**  
A: Yes! Add them to the backend visibility JSON and use the same `module.action` format.

**Q: How do I debug permission issues?**  
A: Use `checkPermissionDetailed()` to get detailed error messages.

**Q: Do permissions work offline?**  
A: Yes! Permissions are cached with user data and work offline.

**Q: Can I check permissions in the backend?**  
A: The backend already enforces permissions via middleware. Frontend checks are for UI only.

---

**Status:** ✅ Ready to Use  
**Related Documentation:** `USER_PERMISSIONS_DOCUMENTATION.md` (backend reference)
