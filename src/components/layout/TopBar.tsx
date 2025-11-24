import { useNavigate } from 'react-router-dom'
import { useOperator } from '../../hooks/useOperator'
import { useLogout } from '../../hooks/useAuth'
import { ROLES } from '../../utils/constants'
import { ROUTES } from '../../utils/constants'

export function TopBar() {
  const { operator, clearOperator } = useOperator()
  const logoutMutation = useLogout()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logoutMutation.mutateAsync()
      clearOperator()
      navigate(ROUTES.LOGIN)
    }
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case ROLES.ADMIN:
        return 'Admin'
      case ROLES.MANAGER:
        return 'Manager'
      case ROLES.SUPERVISOR:
        return 'Supervisor'
      case ROLES.READ_ONLY:
        return 'Read Only'
      default:
        return role
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 left-64 right-0 z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <span className="text-lg font-semibold text-text">Offline Bookings Management System</span>
      </div>

      <div className="flex items-center gap-4">
        {operator && (
          <>
            <div className="text-right">
              <div className="text-sm font-medium text-text">{operator.name}</div>
              <div className="text-xs text-gray-500">{getRoleDisplay(operator.role)}</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  )
}

