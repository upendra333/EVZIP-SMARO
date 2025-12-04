import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Vehicle } from './useVehicles'
import { useOperator } from './useOperator'

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: { reg_no: string; make?: string; model?: string; seats?: number; status?: string; current_hub_id?: string }) => {
      const { data: result, error } = await supabase
        .from('vehicles')
        .insert([{ ...data, seats: data.seats || 4, status: data.status || 'available' }])
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'vehicles',
        object_id: result.id,
        action: 'create',
        diff_json: { new: result },
      })

      return result as Vehicle
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allVehicles'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; reg_no?: string; make?: string; model?: string; seats?: number; status?: string; current_hub_id?: string }) => {
      // Get old data for audit log
      const { data: oldData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()

      const { data: result, error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'vehicles',
        object_id: id,
        action: 'update',
        diff_json: { old: oldData, new: result },
      })

      return result as Vehicle
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allVehicles'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (id: string) => {
      // Get old data for audit log before deletion
      const { data: oldData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Create audit log entry
      if (oldData) {
        await supabase.from('audit_log').insert({
          actor_name: operator?.name || 'System',
          object: 'vehicles',
          object_id: id,
          action: 'delete',
          diff_json: { old: oldData },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allVehicles'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

