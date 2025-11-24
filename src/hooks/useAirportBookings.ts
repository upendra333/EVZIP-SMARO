import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AirportBooking {
  id: string
  customer_id: string
  flight_no: string | null
  pickup_at: string
  pickup: string
  drop: string
  est_km: number | null
  fare: number | null
  status: string
  driver_id: string | null
  vehicle_id: string | null
  notes: string | null
  hub_id: string | null
  customer: {
    id: string
    name: string
    phone: string | null
    email: string | null
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
  hub: {
    id: string
    name: string
  } | null
  trip: {
    id: string
    status: string
  } | null
}

export function useAirportBookings(filters?: {
  dateFrom?: string
  dateTo?: string
  status?: string
  driver?: string
  vehicle?: string
  customer?: string
  hub?: string
}) {
  return useQuery({
    queryKey: ['airportBookings', filters],
    queryFn: async () => {
      let query = supabase
        .from('airport_bookings')
        .select(`
          id,
          customer_id,
          flight_no,
          pickup_at,
          pickup,
          drop,
          est_km,
          fare,
          status,
          driver_id,
          vehicle_id,
          notes,
          hub_id,
          customers(id, name, phone, email),
          drivers(id, name, phone),
          vehicles(id, reg_no),
          hubs(id, name),
          trips(id, status)
        `)
        .is('deleted_at', null)
        .order('pickup_at', { ascending: false })

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('pickup_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('pickup_at', filters.dateTo)
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
        query = query.eq('hub_id', filters.hub)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data: convert arrays to single objects
      const transformedBookings = (data || []).map((item: any) => ({
        ...item,
        customer: item.customers?.[0] || null,
        driver: item.drivers?.[0] || null,
        vehicle: item.vehicles?.[0] || null,
        hub: item.hubs?.[0] || null,
        trip: item.trips?.[0] || null,
      }))
      
      // Filter by customer name if provided (client-side)
      let bookings = transformedBookings as AirportBooking[]
      if (filters?.customer) {
        bookings = bookings.filter((booking) =>
          booking.customer?.name?.toLowerCase().includes(filters.customer!.toLowerCase())
        )
      }

      return bookings
    },
  })
}

