import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Driver } from './useDrivers'
import { useOperator } from './useOperator'

export function useCreateDriver() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: { name: string; phone: string; driver_id?: string; status?: string; hub_id?: string }) => {
      const { data: result, error } = await supabase
        .from('drivers')
        .insert([{ ...data, status: data.status || 'active' }])
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'drivers',
        object_id: result.id,
        action: 'create',
        diff_json: { new: result },
      })

      return result as Driver
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allDrivers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useUpdateDriver() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; phone?: string; driver_id?: string; status?: string; hub_id?: string }) => {
      // Get old data for audit log
      const { data: oldData } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .single()

      const { data: result, error } = await supabase
        .from('drivers')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'drivers',
        object_id: id,
        action: 'update',
        diff_json: { old: oldData, new: result },
      })

      return result as Driver
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allDrivers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useDeleteDriver() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (id: string) => {
      // Get old data for audit log before deletion
      const { data: oldData } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Create audit log entry
      if (oldData) {
        await supabase.from('audit_log').insert({
          actor_name: operator?.name || 'System',
          object: 'drivers',
          object_id: id,
          action: 'delete',
          diff_json: { old: oldData },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allDrivers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

