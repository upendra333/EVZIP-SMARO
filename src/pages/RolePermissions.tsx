import { useState } from 'react'
import { ROLES } from '../utils/constants'
import { PERMISSION_LABELS, PERMISSION_CATEGORIES, ROLE_PERMISSIONS, type Permission } from '../utils/permissions'
import type { Role } from '../utils/types'

// Define role order
const ROLE_ORDER: Role[] = ['read_only', 'supervisor', 'manager', 'admin']

export function RolePermissions() {
  const [selectedRole, setSelectedRole] = useState<Role>('supervisor')
  const [rolePermissions, setRolePermissions] = useState<Record<Role, Permission[]>>(() => {
    const initial: Record<Role, Permission[]> = {} as Record<Role, Permission[]>
    for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      initial[role] = [...ROLE_PERMISSIONS[role]]
    }
    return initial
  })

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

  const handleSave = () => {
    // In a real application, this would save to the database
    // For now, we'll just show an alert
    alert('Permissions saved! (Note: This is a demo. In production, this would save to the database.)')
    // You could also store in localStorage for persistence:
    // localStorage.setItem('rolePermissions', JSON.stringify(rolePermissions))
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Role & Permissions</h1>
        <p className="text-gray-600 mt-1">Manage permissions for each user role</p>
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
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Save Permissions
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

