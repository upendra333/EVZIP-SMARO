import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { User } from './useAuth'
import type { Role } from '../utils/types'
import { useOperator } from './useOperator'

export interface CreateUserData {
  name: string
  username: string
  password: string
  email?: string
  phone?: string
  role: Role
  hub_id?: string
  status?: string
}

export interface UpdateUserData {
  name?: string
  username?: string
  password?: string
  email?: string
  phone?: string
  role?: Role
  hub_id?: string
  status?: string
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      // For MVP: Store password as plain text (REPLACE WITH PROPER HASHING IN PRODUCTION!)
      const { data: result, error } = await supabase
        .from('users')
        .insert([
          {
            name: data.name,
            username: data.username,
            password_hash: data.password, // In production, hash this!
            email: data.email,
            phone: data.phone,
            role: data.role,
            hub_id: data.hub_id || null,
            status: data.status || 'active',
          },
        ])
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'users',
        object_id: result.id,
        action: 'create',
        diff_json: { new: { ...result, password_hash: '[REDACTED]' } },
      })

      return result as User
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & UpdateUserData) => {
      // Get old data for audit log
      const { data: oldData } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      // Prepare update data
      const updateData: any = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.username !== undefined) updateData.username = data.username
      if (data.password !== undefined) updateData.password_hash = data.password // In production, hash this!
      if (data.email !== undefined) updateData.email = data.email
      if (data.phone !== undefined) updateData.phone = data.phone
      if (data.role !== undefined) updateData.role = data.role
      if (data.hub_id !== undefined) updateData.hub_id = data.hub_id || null
      if (data.status !== undefined) updateData.status = data.status

      const { data: result, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      const oldDataForLog = { ...oldData }
      if (oldDataForLog.password_hash) {
        oldDataForLog.password_hash = '[REDACTED]'
      }
      const newDataForLog = { ...result }
      if (newDataForLog.password_hash) {
        newDataForLog.password_hash = '[REDACTED]'
      }

      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'users',
        object_id: id,
        action: 'update',
        diff_json: { old: oldDataForLog, new: newDataForLog },
      })

      return result as User
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (id: string) => {
      // Get old data for audit log before deletion
      const { data: oldData } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase.from('users').delete().eq('id', id)

      if (error) throw error

      // Create audit log entry
      if (oldData) {
        const oldDataForLog = { ...oldData }
        if (oldDataForLog.password_hash) {
          oldDataForLog.password_hash = '[REDACTED]'
        }
        await supabase.from('audit_log').insert({
          actor_name: operator?.name || 'System',
          object: 'users',
          object_id: id,
          action: 'delete',
          diff_json: { old: oldDataForLog },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

