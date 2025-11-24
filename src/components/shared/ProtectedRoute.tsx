import { Navigate } from 'react-router-dom'
import { useOperator } from '../../hooks/useOperator'
import type { Permission } from '../../utils/permissions'
import { ROUTES } from '../../utils/constants'

interface ProtectedRouteProps {
  children: React.ReactNode
  permission: Permission
  redirectTo?: string
}

export function ProtectedRoute({ children, permission, redirectTo = ROUTES.DASHBOARD }: ProtectedRouteProps) {
  const { operator, can, isLoading } = useOperator()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!operator) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  // Check permission
  if (!can(permission)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

