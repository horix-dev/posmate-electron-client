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
const SalesPage = lazy(() => import('@/pages/sales/SalesPage'))
const PurchasesPage = lazy(() => import('@/pages/purchases/PurchasesPage'))
const PartiesPage = lazy(() => import('@/pages/parties/PartiesPage'))
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage'))
const ProductSettingsPage = lazy(() => import('@/pages/product-settings/ProductSettingsPage'))
const WarehousesPage = lazy(() => import('@/pages/warehouses/WarehousesPage'))
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
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined
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
        path: 'parties',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PartiesPage />
          </Suspense>
        ),
      },
      {
        path: 'expenses',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ExpensesPage />
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
