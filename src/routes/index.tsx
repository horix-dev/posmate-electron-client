import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Layout
import { AppShell } from '@/components/layout'

// Route guards
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { PermissionRoute } from './PermissionRoute'

// Lazy load pages for better performance
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const SignUpPage = lazy(() => import('@/pages/auth/SignUpPage'))
const OtpPage = lazy(() => import('@/pages/auth/OtpPage'))

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const POSPage = lazy(() => import('@/pages/pos/POSPage'))
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage'))
const ProductFormPage = lazy(() => import('@/pages/products/ProductFormPage'))
const SalesPage = lazy(() => import('@/pages/sales/SalesPage'))
const PurchasesPage = lazy(() => import('@/pages/purchases/PurchasesPage'))
const NewPurchasePage = lazy(() => import('@/pages/purchases/NewPurchasePage'))
const FinancePage = lazy(() => import('@/pages/finance/FinancePage'))
const DuePage = lazy(() => import('@/pages/Due/DuePage'))
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage'))
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage'))
const ProductSettingsPage = lazy(() => import('@/pages/product-settings/ProductSettingsPage'))
const WarehousesPage = lazy(() => import('@/pages/warehouses/WarehousesPage'))
const StocksPage = lazy(() => import('@/pages/stocks/StocksPage'))
const StockAdjustmentsPage = lazy(() => import('@/pages/inventory/StockAdjustmentsPage'))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'))
const InvoicesPage = lazy(() => import('@/pages/invoices/InvoicesPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

// Router configuration
// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const isElectron =
  typeof window !== 'undefined' &&
  (window as unknown as Record<string, unknown>).electronAPI !== undefined
const routerCreator = isElectron ? createHashRouter : createBrowserRouter

const router = routerCreator([
  // Public routes (auth)
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Suspense fallback={<PageLoader />}>
          <LoginPage />
        </Suspense>
      </PublicRoute>
    ),
  },
  {
    path: '/signup',
    element: (
      <PublicRoute>
        <Suspense fallback={<PageLoader />}>
          <SignUpPage />
        </Suspense>
      </PublicRoute>
    ),
  },
  {
    path: '/otp',
    element: (
      <Suspense fallback={<PageLoader />}>
        <OtpPage />
      </Suspense>
    ),
  },

  // Protected routes with layout
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <PermissionRoute permission="dashboard.r">
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'pos',
        element: (
          <PermissionRoute permission="sales.c">
            <Suspense fallback={<PageLoader />}>
              <POSPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'products',
        element: (
          <PermissionRoute permission="products.r">
            <Suspense fallback={<PageLoader />}>
              <ProductsPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'products/create',
        element: (
          <PermissionRoute permission="products.c">
            <Suspense fallback={<PageLoader />}>
              <ProductFormPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'products/:id/edit',
        element: (
          <PermissionRoute permission="products.u">
            <Suspense fallback={<PageLoader />}>
              <ProductFormPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'sales',
        element: (
          <PermissionRoute permission={['sales.r', 'sales.c', 'sale-returns.r', 'sale-returns.c']}>
            <Suspense fallback={<PageLoader />}>
              <SalesPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'purchases',
        element: (
          <PermissionRoute permission="purchases.r">
            <Suspense fallback={<PageLoader />}>
              <PurchasesPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'purchases/new',
        element: (
          <PermissionRoute permission="purchases.c">
            <Suspense fallback={<PageLoader />}>
              <NewPurchasePage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'customers',
        element: (
          <PermissionRoute permission="parties.r">
            <Suspense fallback={<PageLoader />}>
              <CustomersPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'suppliers',
        element: (
          <PermissionRoute permission="parties.r">
            <Suspense fallback={<PageLoader />}>
              <SuppliersPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'finance',
        element: (
          <PermissionRoute permission="incomes.r">
            <Suspense fallback={<PageLoader />}>
              <FinancePage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'due',
        element: (
          <PermissionRoute permission="dues.r">
            <Suspense fallback={<PageLoader />}>
              <DuePage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'product-settings',
        element: (
          <PermissionRoute permission="categories.r">
            <Suspense fallback={<PageLoader />}>
              <ProductSettingsPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'warehouses',
        element: (
          <PermissionRoute permission="warehouses.r">
            <Suspense fallback={<PageLoader />}>
              <WarehousesPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'stocks',
        element: (
          <PermissionRoute permission="stocks.r">
            <Suspense fallback={<PageLoader />}>
              <StocksPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'inventory/stock-adjustments',
        element: (
          <PermissionRoute permission="inventory.r">
            <Suspense fallback={<PageLoader />}>
              <StockAdjustmentsPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <PermissionRoute permission="sale-reports.r">
            <Suspense fallback={<PageLoader />}>
              <ReportsPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'invoices',
        element: (
          <Suspense fallback={<PageLoader />}>
            <InvoicesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <PermissionRoute permission="manage-settings.r">
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
    ],
  },

  // 404 Not Found
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

export default AppRouter
