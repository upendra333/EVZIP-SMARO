import { Navigate } from 'react-router-dom'
import { useOperator } from '../../hooks/useOperator'
import type { Permission } from '../../utils/permissions'

interface ProtectedRouteProps {
  children: React.ReactNode
  permission: Permission
  redirectTo?: string
}

export function ProtectedRoute({ children, permission, redirectTo = '/' }: ProtectedRouteProps) {
  const { can, isLoading } = useOperator()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!can(permission)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

