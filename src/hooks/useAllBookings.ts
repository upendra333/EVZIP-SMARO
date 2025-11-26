import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TripListItem } from './useTodayTrips'

export function useAllBookings(filters?: {
  type?: string
  status?: string
  hub?: string
  driver?: string
  vehicle?: string
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: ['allBookings', filters],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      
      // Build base query - fetch trips first without nested joins
      let tripsQuery = supabase
        .from('trips')
        .select('id, type, ref_id, status, created_at')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.type) {
        tripsQuery = tripsQuery.eq('type', filters.type)
      }
      if (filters?.status) {
        tripsQuery = tripsQuery.eq('status', filters.status)
      }

      const { data: tripsData, error: tripsError } = await tripsQuery

      if (tripsError) {
        console.error('Error fetching trips:', tripsError)
        throw tripsError
      }

      if (!tripsData || tripsData.length === 0) {
        return []
      }

      // Group trips by type to fetch related data efficiently
      const subscriptionTripIds = tripsData.filter(t => t.type === 'subscription').map(t => t.ref_id)
      const airportTripIds = tripsData.filter(t => t.type === 'airport').map(t => t.ref_id)
      const rentalTripIds = tripsData.filter(t => t.type === 'rental').map(t => t.ref_id)
      const manualTripIds = tripsData.filter(t => t.type === 'manual').map(t => t.ref_id)

      // Fetch related data for each type
      const [subscriptionData, airportData, rentalData, manualData] = await Promise.all([
        subscriptionTripIds.length > 0
          ? supabase
              .from('subscription_rides')
              .select(`
                id,
                date,
                direction,
                fare,
                est_km,
                actual_km,
                drivers(name),
                vehicles(reg_no),
                subscriptions(
                  customers(name),
                  pickup,
                  drop,
                  hub_id,
                  hubs(name),
                  distance_km
                )
              `)
              .in('id', subscriptionTripIds)
              .is('deleted_at', null)
          : Promise.resolve({ data: [], error: null }),
        airportTripIds.length > 0
          ? supabase
              .from('airport_bookings')
              .select(`
                id,
                pickup_at,
                fare,
                est_km,
                drivers(name),
                vehicles(reg_no),
                customers(name),
                pickup,
                drop,
                hub_id,
                hubs(name)
              `)
              .in('id', airportTripIds)
              .is('deleted_at', null)
          : Promise.resolve({ data: [], error: null }),
        rentalTripIds.length > 0
          ? supabase
              .from('rental_bookings')
              .select(`
                id,
                start_at,
                fare,
                est_km,
                drivers(name),
                vehicles(reg_no),
                customers(name),
                hub_id,
                hubs(name)
              `)
              .in('id', rentalTripIds)
              .is('deleted_at', null)
          : Promise.resolve({ data: [], error: null }),
        manualTripIds.length > 0
          ? supabase
              .from('manual_rides')
              .select(`
                id,
                pickup_at,
                fare,
                est_km,
                pickup,
                drop,
                drivers(name),
                vehicles(reg_no),
                customers(name),
                hub_id,
                hubs(name)
              `)
              .in('id', manualTripIds)
              .is('deleted_at', null)
          : Promise.resolve({ data: [], error: null }),
      ])

      // Log errors if any
      if (subscriptionData.error) {
        console.error('Error fetching subscription rides:', subscriptionData.error)
      }
      if (airportData.error) {
        console.error('Error fetching airport bookings:', airportData.error)
      }
      if (rentalData.error) {
        console.error('Error fetching rental bookings:', rentalData.error)
      }
      if (manualData.error) {
        console.error('Error fetching manual rides:', manualData.error)
      }

      // Log missing bookings
      const foundSubscriptionIds = new Set((subscriptionData.data || []).map((sr: any) => sr.id))
      const foundAirportIds = new Set((airportData.data || []).map((ab: any) => ab.id))
      const foundRentalIds = new Set((rentalData.data || []).map((rb: any) => rb.id))
      const foundManualIds = new Set((manualData.data || []).map((mr: any) => mr.id))
      
      const missingSubscriptionIds = subscriptionTripIds.filter(id => !foundSubscriptionIds.has(id))
      const missingAirportIds = airportTripIds.filter(id => !foundAirportIds.has(id))
      const missingRentalIds = rentalTripIds.filter(id => !foundRentalIds.has(id))
      const missingManualIds = manualTripIds.filter(id => !foundManualIds.has(id))
      
      if (missingSubscriptionIds.length > 0) {
        console.warn(`Missing subscription rides data for trip ref_ids:`, missingSubscriptionIds)
      }
      if (missingAirportIds.length > 0) {
        console.warn(`Missing airport bookings data for trip ref_ids:`, missingAirportIds)
      }
      if (missingRentalIds.length > 0) {
        console.warn(`Missing rental bookings data for trip ref_ids:`, missingRentalIds)
      }
      if (missingManualIds.length > 0) {
        console.warn(`Missing manual rides data for trip ref_ids:`, missingManualIds)
      }

      // Create lookup maps
      const subscriptionMap = (subscriptionData.data || []).reduce((acc: Record<string, any>, sr: any) => {
        acc[sr.id] = sr
        return acc
      }, {})
      const airportMap = (airportData.data || []).reduce((acc: Record<string, any>, ab: any) => {
        acc[ab.id] = ab
        return acc
      }, {})
      const rentalMap = (rentalData.data || []).reduce((acc: Record<string, any>, rb: any) => {
        acc[rb.id] = rb
        return acc
      }, {})
      const manualMap = (manualData.data || []).reduce((acc: Record<string, any>, mr: any) => {
        acc[mr.id] = mr
        return acc
      }, {})

      const data = tripsData

      // Transform data to unified format
      const trips: TripListItem[] = data.map((trip: any) => {
        if (trip.type === 'subscription') {
          const sr = subscriptionMap[trip.ref_id]
          if (sr) {
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
              driver_name: sr.drivers?.name || null,
              vehicle_reg: sr.vehicles?.reg_no || null,
              status: trip.status,
              fare: sr.fare,
              ref_id: trip.ref_id,
              est_km: sr.est_km || sr.subscriptions?.distance_km || null,
              actual_km: sr.actual_km || null,
            }
          }
        } else if (trip.type === 'airport') {
          const ab = airportMap[trip.ref_id]
          if (ab) {
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
              driver_name: ab.drivers?.name || null,
              vehicle_reg: ab.vehicles?.reg_no || null,
              status: trip.status,
              fare: ab.fare,
              ref_id: trip.ref_id,
              est_km: ab.est_km || null,
              actual_km: null, // airport_bookings doesn't have actual_km
            }
          }
        } else if (trip.type === 'rental') {
          const rb = rentalMap[trip.ref_id]
          if (rb) {
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
              driver_name: rb.drivers?.name || null,
              vehicle_reg: rb.vehicles?.reg_no || null,
              status: trip.status,
              fare: rb.fare,
              ref_id: trip.ref_id,
              est_km: rb.est_km || null,
              actual_km: null, // rental_bookings doesn't have actual_km
            }
          }
        } else if (trip.type === 'manual') {
          const mr = manualMap[trip.ref_id]
          if (mr) {
            const hubName = mr.hubs?.name || null
            const route = (mr.pickup && mr.drop) ? `${mr.pickup} → ${mr.drop}` : null
            return {
              id: trip.id,
              type: 'manual',
              created_at: trip.created_at,
              start_time: mr.pickup_at,
              hub_route: hubName || route, // Keep for backward compatibility
              hub_name: hubName,
              route: route,
              customer_name: mr.customers?.name || null,
              driver_name: mr.drivers?.name || null,
              vehicle_reg: mr.vehicles?.reg_no || null,
              status: trip.status,
              fare: mr.fare,
              ref_id: trip.ref_id,
              est_km: mr.est_km || null,
              actual_km: null, // manual_rides doesn't have actual_km
            }
          }
        }
        // Fallback for missing data
        return {
          id: trip.id,
          type: trip.type as any,
          created_at: trip.created_at,
          start_time: null,
          hub_route: null,
          hub_name: null,
          route: null,
          customer_name: null,
          driver_name: null,
          vehicle_reg: null,
          status: trip.status,
          fare: null,
          ref_id: trip.ref_id,
          est_km: null,
          actual_km: null,
        }
      })

      // Apply additional filters that require checking nested data
      let filteredTrips = trips
      
      // Filter by booking date (today and future) if no date range specified
      if (!filters?.dateFrom && !filters?.dateTo) {
        filteredTrips = filteredTrips.filter((t) => {
          if (!t.start_time) return false
          const tripDate = new Date(t.start_time).toISOString().split('T')[0]
          return tripDate >= today
        })
      }
      
      // Filter by date range if provided
      if (filters?.dateFrom || filters?.dateTo) {
        filteredTrips = filteredTrips.filter((t) => {
          if (!t.start_time) return false
          const tripDate = new Date(t.start_time).toISOString().split('T')[0]
          if (filters.dateFrom && tripDate < filters.dateFrom) return false
          if (filters.dateTo && tripDate > filters.dateTo) return false
          return true
        })
      }
      
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
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}

