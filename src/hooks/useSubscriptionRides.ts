import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface SubscriptionRide {
  id: string
  subscription_id: string
  date: string
  direction: string
  driver_id: string | null
  vehicle_id: string | null
  est_km: number | null
  actual_km: number | null
  fare: number | null
  status: string
  notes: string | null
  carried_forward?: boolean
  carried_forward_from_ride_id?: string | null
  subscription: {
    id: string
    customer_id: string
    pickup: string
    drop: string
    distance_km: number | null
    hub_id: string | null
    customer: {
      id: string
      name: string
      phone: string | null
    } | null
    hub: {
      id: string
      name: string
    } | null
    plan: {
      id: string
      name: string
      kind: string
    } | null
  } | null
  driver: {
    id: string
    name: string
    phone: string
  } | null
  vehicle: {
    id: string
    reg_no: string
  } | null
  trip: {
    id: string
    status: string
  } | null
}

export function useSubscriptionRides(filters?: {
  dateFrom?: string
  dateTo?: string
  status?: string
  driver?: string
  vehicle?: string
  customer?: string
  hub?: string
}) {
  return useQuery({
    queryKey: ['subscriptionRides', filters],
    queryFn: async () => {
      let query = supabase
        .from('subscription_rides')
        .select(`
          id,
          subscription_id,
          date,
          direction,
          driver_id,
          vehicle_id,
          est_km,
          actual_km,
          fare,
          status,
          notes,
          carried_forward,
          carried_forward_from_ride_id,
          subscriptions!inner(
            id,
            customer_id,
            pickup,
            drop,
            distance_km,
            hub_id,
            customers(id, name, phone),
            hubs(id, name),
            plans(id, name, kind)
          ),
          drivers(id, name, phone),
          vehicles(id, reg_no),
          trips(id, status)
        `)
        .is('deleted_at', null)
        .order('date', { ascending: false })

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.driver) {
        query = query.eq('driver_id', filters.driver)
      }
      if (filters?.vehicle) {
        query = query.eq('vehicle_id', filters.vehicle)
      }
      if (filters?.hub) {
        query = query.eq('subscriptions.hub_id', filters.hub)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data: convert arrays to single objects
      const transformedRides = (data || []).map((item: any) => ({
        ...item,
        subscription: item.subscriptions?.[0] ? {
          ...item.subscriptions[0],
          customer: item.subscriptions[0].customers?.[0] || null,
          hub: item.subscriptions[0].hubs?.[0] || null,
          plan: item.subscriptions[0].plans?.[0] || null,
        } : null,
        driver: item.drivers?.[0] || null,
        vehicle: item.vehicles?.[0] || null,
        trip: item.trips?.[0] || null,
      }))
      
      // Filter by customer name if provided (client-side)
      let rides = transformedRides as SubscriptionRide[]
      if (filters?.customer) {
        rides = rides.filter((ride) =>
          ride.subscription?.customer?.name?.toLowerCase().includes(filters.customer!.toLowerCase())
        )
      }

      return rides
    },
  })
}

