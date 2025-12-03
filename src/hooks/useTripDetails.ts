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
  customer_id: string | null
  notes: string | null
  fare: number | null
  est_km?: number | null
  actual_km?: number | null // Only for subscription rides
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
      // For subscription rides, we need to get customer_id from subscription
      let selectFields = ''
      if (tripType === TRIP_TYPES.SUBSCRIPTION) {
        selectFields = 'id, driver_id, vehicle_id, notes, status, fare, est_km, actual_km, subscription_id, subscriptions!inner(customer_id, hub_id)'
      } else {
        // All other booking types have hub_id and customer_id directly
        selectFields = 'id, driver_id, vehicle_id, hub_id, customer_id, notes, status, fare, est_km'
        if (tripType === TRIP_TYPES.AIRPORT || tripType === TRIP_TYPES.MANUAL) {
          selectFields += ', pickup_at'
        } else if (tripType === TRIP_TYPES.RENTAL) {
          selectFields += ', start_at, end_at'
        }
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', refId)
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned')

      const tripData = data as any
      
      // Extract customer_id and hub_id based on trip type
      let customerId: string | null = null
      let hubId: string | null = null
      
      if (tripType === TRIP_TYPES.SUBSCRIPTION) {
        // For subscription rides, get customer_id from subscription
        customerId = tripData.subscriptions?.customer_id || null
        hubId = tripData.subscriptions?.hub_id || null
      } else {
        // For other types, customer_id and hub_id are direct fields
        customerId = tripData.customer_id || null
        hubId = tripData.hub_id || null
      }
      
      return {
        id: tripId,
        type: tripType as any,
        ref_id: refId,
        status: tripData.status,
        driver_id: tripData.driver_id,
        vehicle_id: tripData.vehicle_id,
        hub_id: hubId,
        customer_id: customerId,
        notes: tripData.notes,
        fare: tripData.fare,
        est_km: tripData.est_km || null,
        actual_km: tripData.actual_km || null, // Only for subscription rides
        pickup_at: tripData.pickup_at || null,
        start_at: tripData.start_at || null,
        end_at: tripData.end_at || null,
        subscription_id: tripData.subscription_id || null,
      } as TripDetails
    },
    enabled: !!tripId && !!tripType && !!refId,
  })
}

