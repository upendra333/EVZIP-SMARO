import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Footer } from './Footer'
import { useOperator } from '../../hooks/useOperator'
import { ROUTES } from '../../utils/constants'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { operator, isLoading, setOperator } = useOperator()
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check localStorage and update operator if needed
  useEffect(() => {
    if (!isLoading) {
      const currentUserJson = localStorage.getItem('currentUser')
      if (currentUserJson && !operator) {
        try {
          const user = JSON.parse(currentUserJson)
          setOperator(user.name, user.role)
        } catch {
          // Invalid user data
        }
      }
      setCheckingAuth(false)
    }
  }, [isLoading, operator, setOperator])

  // Show loading while checking authentication
  if (isLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  // Redirect to login if no operator is set (after loading)
  // This must be after all hooks
  if (!operator) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopBar />
        
        <main className="flex-1 mt-16 p-6 overflow-y-auto">
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  )
}

