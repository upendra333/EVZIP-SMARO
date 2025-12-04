import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOperator } from './useOperator'

export function useDeleteRide() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async ({ rideId, rideType }: { rideId: string; rideType: 'subscription' | 'airport' | 'rental' | 'manual' }) => {
      let tableName = ''
      
      // Normalize rideType to lowercase
      const normalizedType = rideType.toLowerCase() as 'subscription' | 'airport' | 'rental' | 'manual'
      
      switch (normalizedType) {
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
          throw new Error(`Invalid ride type: ${rideType}`)
      }

      console.log('Deleting from table:', tableName, 'with ID:', rideId)

      // Get old data for audit log before deletion
      // Use .maybeSingle() instead of .single() to handle cases where ride doesn't exist
      const { data: oldData, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', rideId)
        .is('deleted_at', null)
        .maybeSingle()

      if (fetchError) {
        console.error('Error fetching ride data:', fetchError)
        throw new Error(`Failed to fetch ride: ${fetchError.message}`)
      }

      if (!oldData) {
        // Check if the ride exists but is already deleted
        const { data: deletedData } = await supabase
          .from(tableName)
          .select('id, deleted_at')
          .eq('id', rideId)
          .maybeSingle()
        
        if (deletedData) {
          if (deletedData.deleted_at) {
            throw new Error('Ride has already been deleted')
          } else {
            throw new Error('Ride not found (unexpected state)')
          }
        } else {
          throw new Error('Ride not found')
        }
      }

      // Soft delete by setting deleted_at
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', rideId)

      if (updateError) {
        console.error('Error updating ride:', updateError)
        throw new Error(`Failed to delete ride: ${updateError.message}`)
      }

      console.log('Ride soft deleted successfully')

      // Also update the corresponding trip status to cancelled if it exists
      try {
        const { error: tripUpdateError } = await supabase
          .from('trips')
          .update({ status: 'cancelled' })
          .eq('ref_id', rideId)
          .eq('type', normalizedType)

        if (tripUpdateError) {
          console.warn('Failed to update trip status:', tripUpdateError)
          // Don't throw - trip update failure shouldn't prevent ride deletion
        }
      } catch (tripError) {
        console.warn('Error updating trip:', tripError)
        // Don't throw - trip update failure shouldn't prevent ride deletion
      }

      // Create audit log entry
      try {
        await supabase.from('audit_log').insert({
          actor_name: operator?.name || 'System',
          object: tableName,
          object_id: rideId,
          action: 'delete',
          diff_json: { old: oldData },
        })
      } catch (auditError) {
        console.warn('Failed to create audit log:', auditError)
        // Don't throw - audit log failure shouldn't prevent deletion
      }
    },
    onSuccess: () => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['todayMetrics'], refetchType: 'active' }) // Dashboard overview cards
      queryClient.invalidateQueries({ queryKey: ['subscriptionRides'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['airportBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['rentalBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['manualRides'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

