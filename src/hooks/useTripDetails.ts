import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TRIP_TYPES } from '../utils/constants'

export interface TripDetails {
  id: string
  type: 'subscription' | 'airport' | 'rental' | 'manual'
  ref_id: string
  status: string
  driver_id: string | null
  vehicle_id: string | null
  hub_id: string | null
  notes: string | null
  fare: number | null
  pickup_at?: string | null // For airport and manual
  start_at?: string | null // For rental
  end_at?: string | null // For rental
  subscription_id?: string | null // For subscription rides
}

export function useTripDetails(tripId: string, tripType: string, refId: string) {
  return useQuery({
    queryKey: ['tripDetails', tripId],
    queryFn: async () => {
      let tableName = ''
      if (tripType === TRIP_TYPES.SUBSCRIPTION) {
        tableName = 'subscription_rides'
      } else if (tripType === TRIP_TYPES.AIRPORT) {
        tableName = 'airport_bookings'
      } else if (tripType === TRIP_TYPES.RENTAL) {
        tableName = 'rental_bookings'
      } else if (tripType === TRIP_TYPES.MANUAL) {
        tableName = 'manual_rides'
      } else {
        throw new Error('Invalid trip type')
      }

      // Select fields based on trip type
      // All booking types have hub_id
      let selectFields = 'id, driver_id, vehicle_id, hub_id, notes, status, fare'
      if (tripType === TRIP_TYPES.SUBSCRIPTION) {
        selectFields += ', subscription_id'
      } else if (tripType === TRIP_TYPES.AIRPORT || tripType === TRIP_TYPES.MANUAL) {
        selectFields += ', pickup_at'
      } else if (tripType === TRIP_TYPES.RENTAL) {
        selectFields += ', start_at, end_at'
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', refId)
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned')

      const tripData = data as any
      return {
        id: tripId,
        type: tripType as any,
        ref_id: refId,
        status: tripData.status,
        driver_id: tripData.driver_id,
        vehicle_id: tripData.vehicle_id,
        hub_id: tripData.hub_id || null,
        notes: tripData.notes,
        fare: tripData.fare,
        pickup_at: tripData.pickup_at || null,
        start_at: tripData.start_at || null,
        end_at: tripData.end_at || null,
        subscription_id: tripData.subscription_id || null,
      } as TripDetails
    },
    enabled: !!tripId && !!tripType && !!refId,
  })
}

