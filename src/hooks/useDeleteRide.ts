import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOperator } from './useOperator'

export function useDeleteRide() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async ({ rideId, rideType }: { rideId: string; rideType: 'subscription' | 'airport' | 'rental' | 'manual' }) => {
      let tableName = ''
      
      switch (rideType) {
        case 'subscription':
          tableName = 'subscription_rides'
          break
        case 'airport':
          tableName = 'airport_bookings'
          break
        case 'rental':
          tableName = 'rental_bookings'
          break
        case 'manual':
          tableName = 'manual_rides'
          break
        default:
          throw new Error('Invalid ride type')
      }

      // Get old data for audit log before deletion
      const { data: oldData } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', rideId)
        .is('deleted_at', null)
        .single()

      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', rideId)

      if (error) throw error

      // Create audit log entry
      if (oldData) {
        await supabase.from('audit_log').insert({
          actor_name: operator?.name || 'System',
          object: tableName,
          object_id: rideId,
          action: 'delete',
          diff_json: { old: oldData },
        })
      }
    },
    onSuccess: () => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['allBookings'] })
      queryClient.invalidateQueries({ queryKey: ['todayTrips'] })
      queryClient.invalidateQueries({ queryKey: ['bookingSummary'] })
      queryClient.invalidateQueries({ queryKey: ['todayMetrics'] }) // Dashboard overview cards
      queryClient.invalidateQueries({ queryKey: ['subscriptionRides'] })
      queryClient.invalidateQueries({ queryKey: ['airportBookings'] })
      queryClient.invalidateQueries({ queryKey: ['rentalBookings'] })
      queryClient.invalidateQueries({ queryKey: ['manualRides'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

