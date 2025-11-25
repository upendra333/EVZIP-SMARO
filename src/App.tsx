import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { Imports } from './pages/Imports'
import { Audit } from './pages/Audit'
import { DataManagement } from './pages/DataManagement'
import { RolePermissions } from './pages/RolePermissions'
import { UserManagement } from './pages/UserManagement'
import { Login } from './pages/Login'
import { SupabaseError } from './components/shared/SupabaseError'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { SidebarProvider } from './contexts/SidebarContext'
import { ROUTES } from './utils/constants'
import { PERMISSIONS } from './utils/permissions'
import { isSupabaseConfigured } from './lib/supabase'

function App() {
  // Show error if Supabase is not configured
  if (!isSupabaseConfigured) {
    return <SupabaseError />
  }

  return (
    <SidebarProvider>
      <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
          <Route 
            path={ROUTES.DASHBOARD} 
            element={
              <ProtectedRoute permission={PERMISSIONS.VIEW_DASHBOARD}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path={ROUTES.REPORTS} 
            element={
              <ProtectedRoute permission={PERMISSIONS.VIEW_REPORTS}>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path={ROUTES.DATA_MANAGEMENT} 
            element={
              <ProtectedRoute permission={PERMISSIONS.VIEW_CUSTOMERS}>
                <DataManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path={ROUTES.IMPORTS} 
            element={
              <ProtectedRoute permission={PERMISSIONS.VIEW_IMPORTS}>
                <Imports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path={ROUTES.AUDIT} 
            element={
              <ProtectedRoute permission={PERMISSIONS.VIEW_AUDIT}>
                <Audit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path={ROUTES.ROLE_PERMISSIONS} 
            element={
              <ProtectedRoute permission={PERMISSIONS.MANAGE_PERMISSIONS}>
                <RolePermissions />
              </ProtectedRoute>
            } 
          />
          <Route 
            path={ROUTES.USER_MANAGEMENT} 
            element={
              <ProtectedRoute permission={PERMISSIONS.MANAGE_USERS}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          {/* Legacy routes - kept for backward compatibility but redirect to dashboard */}
          <Route path={ROUTES.SUBSCRIPTIONS} element={<Dashboard />} />
          <Route path={ROUTES.AIRPORT} element={<Dashboard />} />
          <Route path={ROUTES.RENTALS} element={<Dashboard />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
    </SidebarProvider>
  )
}

export default App
