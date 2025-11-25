import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Subscription } from './useSubscriptions'
import { useOperator } from './useOperator'

export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Subscription> & { id: string }) => {
      // Get old data for audit log
      const { data: oldData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single()

      const { data: result, error } = await supabase
        .from('subscriptions')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'subscriptions',
        object_id: id,
        action: 'update',
        diff_json: { old: oldData, new: result },
      })

      return result as Subscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (id: string) => {
      // Get old data for audit log
      const { data: oldData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single()

      // Soft delete by setting status to 'cancelled'
      const { data: result, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'subscriptions',
        object_id: id,
        action: 'update',
        diff_json: { old: oldData, new: result },
      })

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (id: string) => {
      // Get old data for audit log
      const { data: oldData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single()

      // Hard delete - this will cascade delete subscription_rides due to ON DELETE CASCADE
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'subscriptions',
        object_id: id,
        action: 'delete',
        diff_json: { old: oldData },
      })

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptionRides'] })
      queryClient.invalidateQueries({ queryKey: ['todayTrips'] })
      queryClient.invalidateQueries({ queryKey: ['allBookings'] })
    },
  })
}

