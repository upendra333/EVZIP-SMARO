import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface TripListItem {
  id: string
  type: 'subscription' | 'airport' | 'rental' | 'manual'
  created_at: string | null // Booking creation time
  start_time: string | null
  hub_route: string | null // Keep for backward compatibility
  hub_name: string | null // New: separate hub name
  route: string | null // New: separate route (pickup → drop)
  customer_name: string | null
  customer_phone: string | null
  driver_name: string | null
  vehicle_reg: string | null
  status: string
  fare: number | null
  ref_id: string
  est_km?: number | null
  actual_km?: number | null
}

export function useTodayTrips(filters?: {
  type?: string
  status?: string
  hub?: string
  driver?: string
  vehicle?: string
}) {
  return useQuery({
    queryKey: ['todayTrips', filters],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]

      // Fetch trips for today with left joins
      let query = supabase
        .from('trips')
        .select(`
          id,
          type,
          ref_id,
          status,
          created_at,
          subscription_rides(
            date,
            direction,
            fare,
            drivers(name),
            vehicles(reg_no),
            subscriptions(
              customers(name, phone),
              pickup,
              drop,
              hub_id,
              hubs(name)
            )
          ),
          airport_bookings(
            pickup_at,
            fare,
            drivers(name),
            vehicles(reg_no),
            customers(name, phone),
            pickup,
            drop,
            hub_id,
            hubs(name)
          ),
          rental_bookings(
            start_at,
            fare,
            drivers(name),
            vehicles(reg_no),
            customers(name, phone),
            hub_id,
            hubs(name)
          )
        `)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data to unified format
      const trips: TripListItem[] = (data || []).map((trip: any) => {
        if (trip.type === 'subscription' && trip.subscription_rides && trip.subscription_rides.length > 0) {
          const sr = trip.subscription_rides[0] // Get first match
          const hubName = sr.subscriptions?.hubs?.name || null
          const route = sr.subscriptions ? `${sr.subscriptions.pickup} → ${sr.subscriptions.drop}` : null
          return {
            id: trip.id,
            type: 'subscription',
            created_at: trip.created_at,
            start_time: sr.date ? `${sr.date}T09:00:00` : null,
            hub_route: hubName || route, // Keep for backward compatibility
            hub_name: hubName,
            route: route,
            customer_name: sr.subscriptions?.customers?.name || null,
            customer_phone: sr.subscriptions?.customers?.phone || null,
            driver_name: sr.drivers?.name || null,
            vehicle_reg: sr.vehicles?.reg_no || null,
            status: trip.status,
            fare: sr.fare,
            ref_id: trip.ref_id,
          }
        } else if (trip.type === 'airport' && trip.airport_bookings && trip.airport_bookings.length > 0) {
          const ab = trip.airport_bookings[0] // Get first match
          const hubName = ab.hubs?.name || null
          const route = (ab.pickup && ab.drop) ? `${ab.pickup} → ${ab.drop}` : null
          return {
            id: trip.id,
            type: 'airport',
            created_at: trip.created_at,
            start_time: ab.pickup_at,
            hub_route: hubName || route, // Keep for backward compatibility
            hub_name: hubName,
            route: route,
            customer_name: ab.customers?.name || null,
            customer_phone: ab.customers?.phone || null,
            driver_name: ab.drivers?.name || null,
            vehicle_reg: ab.vehicles?.reg_no || null,
            status: trip.status,
            fare: ab.fare,
            ref_id: trip.ref_id,
          }
        } else if (trip.type === 'rental' && trip.rental_bookings && trip.rental_bookings.length > 0) {
          const rb = trip.rental_bookings[0] // Get first match
          const hubName = rb.hubs?.name || null
          return {
            id: trip.id,
            type: 'rental',
            created_at: trip.created_at,
            start_time: rb.start_at,
            hub_route: hubName, // Keep for backward compatibility
            hub_name: hubName,
            route: null, // Rentals don't have pickup/drop route
            customer_name: rb.customers?.name || null,
            customer_phone: rb.customers?.phone || null,
            driver_name: rb.drivers?.name || null,
            vehicle_reg: rb.vehicles?.reg_no || null,
            status: trip.status,
            fare: rb.fare,
            ref_id: trip.ref_id,
          }
        }
        return {
          id: trip.id,
          type: trip.type as any,
          created_at: trip.created_at,
          start_time: null,
          hub_route: null,
          hub_name: null,
          route: null,
          customer_name: null,
          customer_phone: null,
          driver_name: null,
          vehicle_reg: null,
          status: trip.status,
          fare: null,
          ref_id: trip.ref_id,
        }
      })

      // Apply additional filters that require checking nested data
      let filteredTrips = trips
      if (filters?.driver) {
        filteredTrips = filteredTrips.filter((t) => 
          t.driver_name?.toLowerCase().includes(filters.driver!.toLowerCase())
        )
      }
      if (filters?.vehicle) {
        filteredTrips = filteredTrips.filter((t) => 
          t.vehicle_reg?.toLowerCase().includes(filters.vehicle!.toLowerCase())
        )
      }

      return filteredTrips
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

