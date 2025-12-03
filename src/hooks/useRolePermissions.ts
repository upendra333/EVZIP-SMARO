import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Role } from '../utils/types'
import type { Permission } from '../utils/permissions'

export interface RolePermissionsData {
  role: Role
  permissions: Permission[]
}

export function useRolePermissions() {
  return useQuery({
    queryKey: ['rolePermissions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_role_permissions')
      
      if (error) {
        // If function doesn't exist, return empty (fallback to hardcoded)
        if (error.code === '42883' || error.message?.includes('function')) {
          console.warn('get_all_role_permissions function not found, using hardcoded permissions')
          return null
        }
        throw error
      }
      
      if (!data || data.length === 0) {
        return null
      }
      
      // Transform database response to our format
      const permissionsMap: Record<Role, Permission[]> = {} as Record<Role, Permission[]>
      data.forEach((row: { role: string; permissions: string[] }) => {
        permissionsMap[row.role as Role] = row.permissions as Permission[]
      })
      
      return permissionsMap
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ role, permissions }: { role: Role; permissions: Permission[] }) => {
      const { data, error } = await supabase.rpc('update_role_permissions', {
        p_role: role,
        p_permissions: permissions,
      })
      
      if (error) {
        // If function doesn't exist, throw error
        if (error.code === '42883' || error.message?.includes('function')) {
          throw new Error('Database function not found. Please run the migration: database/19_create_role_permissions_table.sql')
        }
        throw error
      }
      
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch role permissions
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] })
    },
  })
}

export function useGetRolePermissions(role: Role) {
  return useQuery({
    queryKey: ['rolePermissions', role],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_role_permissions', {
        p_role: role,
      })
      
      if (error) {
        // If function doesn't exist, return null (fallback to hardcoded)
        if (error.code === '42883' || error.message?.includes('function')) {
          return null
        }
        throw error
      }
      
      // Data is JSONB array, parse it
      return (data || []) as Permission[]
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  })
}

