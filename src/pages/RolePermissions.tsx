import { useState, useEffect } from 'react'
import { ROLES } from '../utils/constants'
import { PERMISSION_LABELS, PERMISSION_CATEGORIES, ROLE_PERMISSIONS, type Permission } from '../utils/permissions'
import type { Role } from '../utils/types'
import { useRolePermissions, useUpdateRolePermissions } from '../hooks/useRolePermissions'

// Define role order
const ROLE_ORDER: Role[] = ['read_only', 'supervisor', 'manager', 'admin']

export function RolePermissions() {
  const [selectedRole, setSelectedRole] = useState<Role>('supervisor')
  const { data: dbPermissions, isLoading: isLoadingPermissions } = useRolePermissions()
  const updatePermissionsMutation = useUpdateRolePermissions()
  
  // Initialize with database permissions or fallback to hardcoded defaults
  const [rolePermissions, setRolePermissions] = useState<Record<Role, Permission[]>>(() => {
    const initial: Record<Role, Permission[]> = {} as Record<Role, Permission[]>
    for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      initial[role] = [...ROLE_PERMISSIONS[role]]
    }
    return initial
  })
  
  // Update permissions when database permissions are loaded
  useEffect(() => {
    if (dbPermissions) {
      setRolePermissions(dbPermissions)
    }
  }, [dbPermissions])

  const handleTogglePermission = (role: Role, permission: Permission) => {
    setRolePermissions((prev) => {
      const currentPerms = prev[role] || []
      const newPerms = currentPerms.includes(permission)
        ? currentPerms.filter((p) => p !== permission)
        : [...currentPerms, permission]
      
      return {
        ...prev,
        [role]: newPerms,
      }
    })
  }

  const handleSelectAll = (role: Role, category: string) => {
    const categoryPermsArray = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] || []
    const categoryPerms: Permission[] = [...categoryPermsArray]
    const currentPerms = rolePermissions[role] || []
    const allSelected = categoryPerms.length > 0 && categoryPerms.every((p) => currentPerms.includes(p))
    
    setRolePermissions((prev) => {
      const currentPerms = prev[role] || []
      const newPerms = allSelected
        ? currentPerms.filter((p) => !categoryPerms.includes(p))
        : [...new Set([...currentPerms, ...categoryPerms])]
      
      return {
        ...prev,
        [role]: newPerms,
      }
    })
  }

  const handleSave = async () => {
    try {
      // Save each role's permissions to the database
      const savePromises = Object.entries(rolePermissions).map(([role, permissions]) =>
        updatePermissionsMutation.mutateAsync({
          role: role as Role,
          permissions: permissions,
        })
      )
      
      await Promise.all(savePromises)
      alert('Permissions saved successfully to database!')
    } catch (error: any) {
      console.error('Error saving permissions:', error)
      const errorMessage = error?.message || 'Error saving permissions. Please try again.'
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default permissions?')) {
      const reset: Record<Role, Permission[]> = {} as Record<Role, Permission[]>
      for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
        reset[role] = [...ROLE_PERMISSIONS[role]]
      }
      setRolePermissions(reset)
    }
  }

  const currentPerms = rolePermissions[selectedRole] || []

  if (isLoadingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Role & Permissions</h1>
        <p className="text-gray-600 mt-1">Manage permissions for each user role</p>
        {!dbPermissions && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Database permissions not available. Using default permissions. 
              Please run the migration: <code className="bg-yellow-100 px-1 rounded">database/19_create_role_permissions_table.sql</code>
            </p>
          </div>
        )}
      </div>

      {/* Role Selector */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Role</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ROLE_ORDER.map((role) => {
            const roleKey = Object.keys(ROLES).find(key => ROLES[key as keyof typeof ROLES] === role) || role
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedRole === role
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {roleKey.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            )
          })}
        </div>
      </div>

      {/* Permissions by Category */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">
            Permissions for: <span className="text-primary">{selectedRole.replace('_', ' ').toUpperCase()}</span>
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              disabled={updatePermissionsMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Permissions'
              )}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
            const categoryPerms: Permission[] = [...perms]
            const selectedCount = categoryPerms.filter((p) => currentPerms.includes(p)).length
            const allSelected = categoryPerms.length > 0 && selectedCount === categoryPerms.length

            return (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{category}</h3>
                  <button
                    onClick={() => handleSelectAll(selectedRole, category)}
                    className="text-sm text-primary hover:underline"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryPerms.map((permission) => {
                    const isSelected = currentPerms.includes(permission)
                    return (
                      <label
                        key={permission}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePermission(selectedRole, permission)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">{PERMISSION_LABELS[permission]}</span>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {selectedCount} of {categoryPerms.length} permissions selected
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Permission Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ROLE_ORDER.map((role) => {
            const roleKey = Object.keys(ROLES).find(key => ROLES[key as keyof typeof ROLES] === role) || role
            const perms = rolePermissions[role] || []
            return (
              <div key={role} className="bg-white p-3 rounded border border-gray-200">
                <div className="font-medium text-sm text-gray-700 mb-1">
                  {roleKey.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </div>
                <div className="text-2xl font-bold text-primary">{perms.length}</div>
                <div className="text-xs text-gray-500">permissions</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

