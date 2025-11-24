import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { Imports } from './pages/Imports'
import { Audit } from './pages/Audit'
import { DataManagement } from './pages/DataManagement'
import { RolePermissions } from './pages/RolePermissions'
import { SupabaseError } from './components/shared/SupabaseError'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { ROUTES } from './utils/constants'
import { PERMISSIONS } from './utils/permissions'
import { isSupabaseConfigured } from './lib/supabase'

function App() {
  // Show error if Supabase is not configured
  if (!isSupabaseConfigured) {
    return <SupabaseError />
  }

  return (
    <BrowserRouter>
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
          {/* Legacy routes - kept for backward compatibility but redirect to dashboard */}
          <Route path={ROUTES.SUBSCRIPTIONS} element={<Dashboard />} />
          <Route path={ROUTES.AIRPORT} element={<Dashboard />} />
          <Route path={ROUTES.RENTALS} element={<Dashboard />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
