import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated } = useAuthStore()

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default PublicRoute
