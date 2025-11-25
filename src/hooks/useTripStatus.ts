import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOperator } from './useOperator'

export interface StatusTransition {
  from: string
  to: string
  label: string
  requiresDriver?: boolean
  requiresVehicle?: boolean
  requiresReason?: boolean
}

export function useTripStatus() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  const getAvailableTransitions = (currentStatus: string, hasDriver: boolean, hasVehicle: boolean): StatusTransition[] => {
    const transitions: StatusTransition[] = []

    switch (currentStatus) {
      case 'created':
        transitions.push({
          from: 'created',
          to: 'assigned',
          label: 'Assign',
        })
        transitions.push({
          from: 'created',
          to: 'cancelled',
          label: 'Cancel',
          requiresReason: true,
        })
        break

      case 'assigned':
        if (hasDriver && hasVehicle) {
          transitions.push({
            from: 'assigned',
            to: 'enroute',
            label: 'Start Trip',
            requiresDriver: true,
            requiresVehicle: true,
          })
        }
        transitions.push({
          from: 'assigned',
          to: 'no_show',
          label: 'Mark No Show',
        })
        transitions.push({
          from: 'assigned',
          to: 'cancelled',
          label: 'Cancel',
          requiresReason: true,
        })
        break

      case 'enroute':
        transitions.push({
          from: 'enroute',
          to: 'completed',
          label: 'Complete',
        })
        transitions.push({
          from: 'enroute',
          to: 'cancelled',
          label: 'Cancel',
          requiresReason: true,
        })
        break

      default:
        // No transitions from completed, no_show, or cancelled
        break
    }

    return transitions
  }

  const advanceStatus = useMutation({
    mutationFn: async ({
      tripId,
      newStatus,
      cancelReason,
      carryForward,
    }: {
      tripId: string
      newStatus: string
      cancelReason?: string
      carryForward?: boolean
    }) => {
      const { data, error } = await supabase.rpc('advance_trip_status', {
        p_trip_id: tripId,
        p_new_status: newStatus,
        p_actor_id: null, // Will be set from operator context
        p_actor_name: operator?.name || 'Unknown',
        p_cancel_reason: cancelReason || null,
        p_carry_forward: carryForward || false,
      })

      if (error) throw error
      return data
    },
    onSuccess: async () => {
      // Invalidate relevant queries and refetch active ones immediately
      queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['tripDetails'], refetchType: 'active' })
      
      // Explicitly refetch todayMetrics for all variations
      await queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'todayMetrics',
        type: 'active'
      })
    },
  })

  return {
    getAvailableTransitions,
    advanceStatus,
  }
}

