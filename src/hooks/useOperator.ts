import { useState, useEffect, useRef } from 'react'
import type { Operator, Role } from '../utils/types'
import { hasPermission as checkPermission, getRolePermissions, checkPermissionWithDB, type Permission } from '../utils/permissions'
import type { User } from './useAuth'
import { useRolePermissions } from './useRolePermissions'

const STORAGE_KEY_CURRENT_USER = 'currentUser'
const STORAGE_KEY_OPERATOR_NAME = 'operatorName'
const STORAGE_KEY_ROLE = 'role'

export function useOperator() {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const operatorRef = useRef<Operator | null>(null)
  
  // Fetch database-backed permissions
  const { data: dbPermissions } = useRolePermissions()

  // Update ref when operator changes
  useEffect(() => {
    operatorRef.current = operator
  }, [operator])

  // Load operator from localStorage on mount and when storage changes
  useEffect(() => {
    const loadOperator = () => {
      const currentUserJson = localStorage.getItem(STORAGE_KEY_CURRENT_USER)
      if (currentUserJson) {
        try {
          const currentUser = JSON.parse(currentUserJson) as User
          const newOperator = { name: currentUser.name, role: currentUser.role }
          // Only update if different
          if (!operatorRef.current || operatorRef.current.name !== newOperator.name || operatorRef.current.role !== newOperator.role) {
            setOperator(newOperator)
          }
        } catch {
          // Invalid JSON, try old format
          const name = localStorage.getItem(STORAGE_KEY_OPERATOR_NAME)
          const role = localStorage.getItem(STORAGE_KEY_ROLE) as Role | null
          if (name && role) {
            const newOperator = { name, role }
            if (!operatorRef.current || operatorRef.current.name !== newOperator.name || operatorRef.current.role !== newOperator.role) {
              setOperator(newOperator)
            }
          }
        }
      } else {
        // Fallback to old format for backward compatibility
        const name = localStorage.getItem(STORAGE_KEY_OPERATOR_NAME)
        const role = localStorage.getItem(STORAGE_KEY_ROLE) as Role | null
        if (name && role) {
          const newOperator = { name, role }
          if (!operatorRef.current || operatorRef.current.name !== newOperator.name || operatorRef.current.role !== newOperator.role) {
            setOperator(newOperator)
          }
        } else if (operatorRef.current) {
          // Clear operator if no data in localStorage
          setOperator(null)
        }
      }
      setIsLoading(false)
    }

    // Load on mount
    loadOperator()

    // Listen for storage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_CURRENT_USER || e.key === STORAGE_KEY_OPERATOR_NAME || e.key === STORAGE_KEY_ROLE) {
        loadOperator()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Also check periodically (for same-tab updates) - use ref to avoid dependency
    const interval = setInterval(() => {
      const currentUserJson = localStorage.getItem(STORAGE_KEY_CURRENT_USER)
      if (currentUserJson) {
        try {
          const currentUser = JSON.parse(currentUserJson) as User
          const newOperator = { name: currentUser.name, role: currentUser.role }
          if (!operatorRef.current || operatorRef.current.name !== newOperator.name || operatorRef.current.role !== newOperator.role) {
            setOperator(newOperator)
            setIsLoading(false)
          }
        } catch {
          // Invalid JSON
        }
      } else {
        const name = localStorage.getItem(STORAGE_KEY_OPERATOR_NAME)
        const role = localStorage.getItem(STORAGE_KEY_ROLE) as Role | null
        if (name && role) {
          const newOperator = { name, role }
          if (!operatorRef.current || operatorRef.current.name !== newOperator.name || operatorRef.current.role !== newOperator.role) {
            setOperator(newOperator)
            setIsLoading(false)
          }
        } else if (operatorRef.current) {
          setOperator(null)
          setIsLoading(false)
        }
      }
    }, 500) // Check every 500ms instead of 100ms to reduce overhead

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, []) // Empty dependency array - only run on mount

  const setOperatorData = (name: string, role: Role) => {
    // Store in both formats for compatibility
    localStorage.setItem(STORAGE_KEY_OPERATOR_NAME, name)
    localStorage.setItem(STORAGE_KEY_ROLE, role)
    setOperator({ name, role })
  }

  const clearOperator = () => {
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER)
    localStorage.removeItem(STORAGE_KEY_OPERATOR_NAME)
    localStorage.removeItem(STORAGE_KEY_ROLE)
    setOperator(null)
  }

  // Check if user has a specific permission (uses database permissions if available)
  const can = (permission: Permission): boolean => {
    if (!operator) return false
    return checkPermissionWithDB(operator.role, permission, dbPermissions || undefined)
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

  // Get all permissions for current user (uses database permissions if available)
  const permissions = (): Permission[] => {
    if (!operator) return []
    // Use database permissions if available, otherwise fallback to hardcoded
    if (dbPermissions && dbPermissions[operator.role]) {
      return dbPermissions[operator.role]
    }
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

