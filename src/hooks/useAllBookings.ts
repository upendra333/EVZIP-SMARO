import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TripListItem } from './useTodayTrips'
import { TRIP_STATUSES } from '../utils/constants'

export function useAllBookings(filters?: {
  type?: string
  status?: string
  hub?: string
  driver?: string
  vehicle?: string
  dateFrom?: string
  dateTo?: string
  dueNext60Min?: boolean
  dueToday?: boolean
  dueTomorrow?: boolean
  includePastIncomplete?: boolean // For managers/admins to see incomplete past trips older than 1 day
  includeYesterdayIncomplete?: boolean // Show incomplete trips from yesterday (default: true for Dashboard)
}) {
  return useQuery({
    queryKey: ['allBookings', filters],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      // Only allow viewing past incomplete trips (older than 1 day) if explicitly requested
      // Managers/admins can still access this via Data Management with the toggle
      const canViewPastIncomplete = filters?.includePastIncomplete === true
      // Default to showing yesterday's incomplete trips unless explicitly disabled
      const showYesterdayIncomplete = filters?.includeYesterdayIncomplete !== false
      
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
                  customers(name, phone),
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
                customers(name, phone),
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
                pickup,
                drop,
                fare,
                est_km,
                drivers(name),
                vehicles(reg_no),
                customers(name, phone),
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
                customers(name, phone),
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
              customer_phone: sr.subscriptions?.customers?.phone || null,
              driver_name: sr.drivers?.name || null,
              vehicle_reg: sr.vehicles?.reg_no || null,
              status: trip.status,
              fare: sr.fare,
              ref_id: trip.ref_id,
              // Use est_km from subscription_rides, fallback to subscription distance_km only if est_km is null/undefined
              est_km: sr.est_km ?? sr.subscriptions?.distance_km ?? null,
              actual_km: sr.actual_km ?? null,
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
              customer_phone: ab.customers?.phone || null,
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
            const route = (rb.pickup && rb.drop) ? `${rb.pickup} → ${rb.drop}` : null
            return {
              id: trip.id,
              type: 'rental',
              created_at: trip.created_at,
              start_time: rb.start_at,
              hub_route: hubName || route, // Keep for backward compatibility
              hub_name: hubName,
              route: route,
              customer_name: rb.customers?.name || null,
              customer_phone: rb.customers?.phone || null,
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
              customer_phone: mr.customers?.phone || null,
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
          customer_phone: null,
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
      // Exception: Show incomplete trips from yesterday for all users (1 day old only)
      // Exception: Trips older than 1 day are only shown if includePastIncomplete is explicitly set to true
      if (!filters?.dateFrom && !filters?.dateTo) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        filteredTrips = filteredTrips.filter((t) => {
          if (!t.start_time) return false
          const tripDate = new Date(t.start_time).toISOString().split('T')[0]
          
          // If trip is today or future, always show
          if (tripDate >= today) {
            return true
          }
          
          // If trip is from yesterday
          if (tripDate === yesterdayStr) {
            // Show incomplete trips from yesterday if enabled (default: true for Dashboard)
            if (showYesterdayIncomplete) {
              const incompleteStatuses = [
                TRIP_STATUSES.CREATED,
                TRIP_STATUSES.ASSIGNED,
                TRIP_STATUSES.ENROUTE
              ]
              return incompleteStatuses.includes(t.status as any)
            }
            return false
          }
          
          // If trip is older than yesterday
          if (tripDate < yesterdayStr) {
            // Only show if manager/admin and includePastIncomplete is true
            if (canViewPastIncomplete) {
              const incompleteStatuses = [
                TRIP_STATUSES.CREATED,
                TRIP_STATUSES.ASSIGNED,
                TRIP_STATUSES.ENROUTE
              ]
              return incompleteStatuses.includes(t.status as any)
            }
            return false
          }
          
          return false
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
      
      // Filter by "Due Next 60 Min" - show trips with start_time within next 60 minutes
      if (filters?.dueNext60Min) {
        const now = new Date()
        const next60Min = new Date(now.getTime() + 60 * 60 * 1000) // 60 minutes from now
        
        filteredTrips = filteredTrips.filter((t) => {
          if (!t.start_time) return false
          const startTime = new Date(t.start_time)
          // Include trips that start between now and next 60 minutes
          return startTime >= now && startTime <= next60Min
        })
      }
      
      // Filter by "Due Today" - show trips which are created (not started) and have start time today
      if (filters?.dueToday) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStart = new Date(today)
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)
        
        filteredTrips = filteredTrips.filter((t) => {
          if (!t.start_time) return false
          // Must be created status (not started yet)
          if (t.status !== TRIP_STATUSES.CREATED) return false
          const startTime = new Date(t.start_time)
          // Start time must be today
          return startTime >= todayStart && startTime <= todayEnd
        })
      }
      
      // Filter by "Due Tomorrow" - show all trips which have start time tomorrow (regardless of status, excluding cancelled/no-show)
      if (filters?.dueTomorrow) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        const tomorrowStart = new Date(tomorrow)
        const tomorrowEnd = new Date(tomorrow)
        tomorrowEnd.setHours(23, 59, 59, 999)
        
        filteredTrips = filteredTrips.filter((t) => {
          if (!t.start_time) return false
          // Exclude cancelled/no-show trips
          if (t.status === TRIP_STATUSES.CANCELLED || t.status === TRIP_STATUSES.NO_SHOW) return false
          const startTime = new Date(t.start_time)
          // Start time must be tomorrow
          return startTime >= tomorrowStart && startTime <= tomorrowEnd
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

