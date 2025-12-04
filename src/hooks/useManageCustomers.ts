import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Customer } from './useCustomers'
import { useOperator } from './useOperator'

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: { name: string; phone?: string; email?: string; notes?: string }) => {
      const { data: result, error } = await supabase
        .from('customers')
        .insert([data])
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'customers',
        object_id: result.id,
        action: 'create',
        diff_json: { new: result },
      })

      return result as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; phone?: string; email?: string; notes?: string }) => {
      // Get old data for audit log
      const { data: oldData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      const { data: result, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'customers',
        object_id: id,
        action: 'update',
        diff_json: { old: oldData, new: result },
      })

      return result as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (id: string) => {
      // Get old data for audit log before deletion
      const { data: oldData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Create audit log entry
      if (oldData) {
        await supabase.from('audit_log').insert({
          actor_name: operator?.name || 'System',
          object: 'customers',
          object_id: id,
          action: 'delete',
          diff_json: { old: oldData },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

