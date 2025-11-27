import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isSetupComplete } = useAuthStore()

  // If authenticated, redirect to appropriate page
  if (isAuthenticated) {
    // If setup is not complete, redirect to setup page
    if (!isSetupComplete) {
      return <Navigate to="/setup" replace />
    }
    // Otherwise redirect to dashboard
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default PublicRoute
