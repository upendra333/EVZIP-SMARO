import { useState, useEffect } from 'react'
import type { Operator, Role } from '../utils/types'
import { hasPermission as checkPermission, getRolePermissions, type Permission } from '../utils/permissions'

const STORAGE_KEY_OPERATOR_NAME = 'operatorName'
const STORAGE_KEY_ROLE = 'role'

export function useOperator() {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load operator from localStorage on mount
    const name = localStorage.getItem(STORAGE_KEY_OPERATOR_NAME)
    const role = localStorage.getItem(STORAGE_KEY_ROLE) as Role | null

    if (name && role) {
      setOperator({ name, role })
    }
    setIsLoading(false)
  }, [])

  const setOperatorData = (name: string, role: Role) => {
    localStorage.setItem(STORAGE_KEY_OPERATOR_NAME, name)
    localStorage.setItem(STORAGE_KEY_ROLE, role)
    setOperator({ name, role })
  }

  const clearOperator = () => {
    localStorage.removeItem(STORAGE_KEY_OPERATOR_NAME)
    localStorage.removeItem(STORAGE_KEY_ROLE)
    setOperator(null)
  }

  // Check if user has a specific permission
  const can = (permission: Permission): boolean => {
    if (!operator) return false
    return checkPermission(operator.role, permission)
  }

  // Legacy method for role hierarchy (kept for backward compatibility)
  const hasPermission = (requiredRole: Role): boolean => {
    if (!operator) return false
    
    const roleHierarchy: Record<Role, number> = {
      read_only: 1,
      supervisor: 2,
      manager: 3,
      admin: 4,
    }

    return roleHierarchy[operator.role] >= roleHierarchy[requiredRole]
  }

  // Get all permissions for current user
  const permissions = (): Permission[] => {
    if (!operator) return []
    return getRolePermissions(operator.role)
  }

  const isManager = () => {
    return operator?.role === 'manager' || operator?.role === 'admin'
  }

  const isSupervisor = () => {
    return operator?.role === 'supervisor' || operator?.role === 'manager' || operator?.role === 'admin'
  }

  const isAdmin = () => {
    return operator?.role === 'admin'
  }

  return {
    operator,
    isLoading,
    setOperator: setOperatorData,
    clearOperator,
    can,
    hasPermission,
    permissions,
    isManager,
    isSupervisor,
    isAdmin,
  }
}

