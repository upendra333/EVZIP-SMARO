import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOperator } from '../../hooks/useOperator'
import { useLogout } from '../../hooks/useAuth'
import { useSidebar } from '../../hooks/useSidebar'
import { ROLES } from '../../utils/constants'
import { ROUTES } from '../../utils/constants'
import { NotificationSoundSelector } from '../shared/NotificationSoundSelector'
import { ChangePasswordModal } from '../shared/ChangePasswordModal'
import { useChangePassword } from '../../hooks/useChangePassword'

export function TopBar() {
  const { operator, clearOperator } = useOperator()
  const { isVisible: isSidebarVisible, toggle: toggleSidebar } = useSidebar()
  const logoutMutation = useLogout()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const changePasswordMutation = useChangePassword()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])


  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logoutMutation.mutateAsync()
      clearOperator()
      navigate(ROUTES.LOGIN)
    }
  }

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    // Get user ID from localStorage
    const currentUserJson = localStorage.getItem('currentUser')
    if (!currentUserJson) {
      throw new Error('User not found')
    }
    const currentUser = JSON.parse(currentUserJson)
    if (!currentUser?.id) {
      throw new Error('User ID not found')
    }
    await changePasswordMutation.mutateAsync({
      userId: currentUser.id,
      newPassword,
      oldPassword,
      requireOldPassword: true,
    })
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
    <header className={`h-16 bg-white border-b border-gray-200 fixed top-0 right-0 z-20 flex items-center justify-between px-6 transition-all duration-300 ${
      isSidebarVisible ? 'left-0 lg:left-64' : 'left-0'
    }`}>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isSidebarVisible ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <button
          onClick={toggleSidebar}
          className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
          title={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isSidebarVisible ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>
        <span className="text-lg font-semibold text-text">SMARO - Smart Rides Operations</span>
      </div>

      <div className="flex items-center gap-4">
        {operator && (
          <>
            <NotificationSoundSelector />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="text-right">
                  <div className="text-sm font-medium text-text">{operator.name}</div>
                  <div className="text-xs text-gray-500">{getRoleDisplay(operator.role)}</div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowChangePasswordModal(true)
                      setShowUserMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      handleLogout()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handleChangePassword}
        requireOldPassword={true}
        isLoading={changePasswordMutation.isPending}
      />
    </header>
  )
}

