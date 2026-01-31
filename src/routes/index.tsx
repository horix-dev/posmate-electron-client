import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Layout
import { AppShell } from '@/components/layout'

// Route guards
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'

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
const BanksPage = lazy(() => import('@/pages/finance/banks/BanksPage'))
const BankTransactionsPage = lazy(() => import('@/pages/finance/bank-transactions/BankTransactionsPage'))
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
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'pos',
        element: (
          <Suspense fallback={<PageLoader />}>
            <POSPage />
          </Suspense>
        ),
      },
      {
        path: 'products',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductsPage />
          </Suspense>
        ),
      },
      {
        path: 'products/create',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductFormPage />
          </Suspense>
        ),
      },
      {
        path: 'products/:id/edit',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductFormPage />
          </Suspense>
        ),
      },
      {
        path: 'sales',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SalesPage />
          </Suspense>
        ),
      },
      {
        path: 'purchases',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PurchasesPage />
          </Suspense>
        ),
      },
      {
        path: 'purchases/new',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NewPurchasePage />
          </Suspense>
        ),
      },
      {
        path: 'customers',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CustomersPage />
          </Suspense>
        ),
      },
      {
        path: 'suppliers',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SuppliersPage />
          </Suspense>
        ),
      },
      {
        path: 'finance',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FinancePage />
          </Suspense>
        ),
      },
      {
        path: 'finance/banks',
        element: (
          <Suspense fallback={<PageLoader />}>
            <BanksPage />
          </Suspense>
        ),
      },
      {
        path: 'finance/transactions',
        element: (
          <Suspense fallback={<PageLoader />}>
            <BankTransactionsPage />
          </Suspense>
        ),
      },
      {
        path: 'due',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DuePage />
          </Suspense>
        ),
      },
      {
        path: 'product-settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductSettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'warehouses',
        element: (
          <Suspense fallback={<PageLoader />}>
            <WarehousesPage />
          </Suspense>
        ),
      },
      {
        path: 'stocks',
        element: (
          <Suspense fallback={<PageLoader />}>
            <StocksPage />
          </Suspense>
        ),
      },
      {
        path: 'inventory/stock-adjustments',
        element: (
          <Suspense fallback={<PageLoader />}>
            <StockAdjustmentsPage />
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReportsPage />
          </Suspense>
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
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
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
