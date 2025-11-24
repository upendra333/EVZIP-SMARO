import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Hub } from './useHubs'
import { useOperator } from './useOperator'

export function useCreateHub() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: { name: string; city?: string; lat?: number; lng?: number }) => {
      const { data: result, error } = await supabase
        .from('hubs')
        .insert([data])
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'hubs',
        object_id: result.id,
        action: 'create',
        diff_json: { new: result },
      })

      return result as Hub
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useUpdateHub() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; city?: string; lat?: number; lng?: number }) => {
      // Get old data for audit log
      const { data: oldData } = await supabase
        .from('hubs')
        .select('*')
        .eq('id', id)
        .single()

      const { data: result, error } = await supabase
        .from('hubs')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'hubs',
        object_id: id,
        action: 'update',
        diff_json: { old: oldData, new: result },
      })

      return result as Hub
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useDeleteHub() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (id: string) => {
      // Get old data for audit log before deletion
      const { data: oldData } = await supabase
        .from('hubs')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('hubs')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Create audit log entry
      if (oldData) {
        await supabase.from('audit_log').insert({
          actor_name: operator?.name || 'System',
          object: 'hubs',
          object_id: id,
          action: 'delete',
          diff_json: { old: oldData },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

