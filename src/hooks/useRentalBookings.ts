import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface RentalBooking {
  id: string
  customer_id: string
  package_hours: number
  package_km: number
  start_at: string
  end_at: string
  est_km: number | null
  extra_km_rate: number | null
  per_hour_rate: number | null
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

export function useRentalBookings(filters?: {
  dateFrom?: string
  dateTo?: string
  status?: string
  driver?: string
  vehicle?: string
  customer?: string
  hub?: string
}) {
  return useQuery({
    queryKey: ['rentalBookings', filters],
    queryFn: async () => {
      let query = supabase
        .from('rental_bookings')
        .select(`
          id,
          customer_id,
          package_hours,
          package_km,
          start_at,
          end_at,
          est_km,
          extra_km_rate,
          per_hour_rate,
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
        .order('start_at', { ascending: false })

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('start_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('start_at', filters.dateTo)
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

      // Filter by customer name if provided (client-side)
      let bookings = (data || []) as RentalBooking[]
      if (filters?.customer) {
        bookings = bookings.filter((booking) =>
          booking.customer?.name?.toLowerCase().includes(filters.customer!.toLowerCase())
        )
      }

      return bookings
    },
  })
}

