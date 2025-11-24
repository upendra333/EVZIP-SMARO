import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface BookingSummary {
  airport: {
    total: number
    today: number
    upcoming: number
  }
  subscriptions: {
    total: number
    today: number
    upcoming: number
  }
  rentals: {
    total: number
    today: number
    upcoming: number
  }
  manual: {
    total: number
    today: number
    upcoming: number
  }
}

export function useBookingSummary() {
  return useQuery({
    queryKey: ['bookingSummary'],
    queryFn: async () => {
      // Get today's date string in YYYY-MM-DD format (local timezone)
      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      
      // Helper function to compare dates properly (ignoring time and timezone)
      const getDateOnly = (dateStr: string | Date): string => {
        if (!dateStr) return ''
        const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
        // Use local date components to avoid timezone issues
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      // Fetch ALL airport bookings (not filtered by date)
      const { data: airportData, error: airportError } = await supabase
        .from('airport_bookings')
        .select('pickup_at, status')
        .is('deleted_at', null)

      if (airportError) throw airportError

      // Fetch ALL subscription rides
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscription_rides')
        .select('date, status')
        .is('deleted_at', null)

      if (subscriptionError) throw subscriptionError

      // Fetch ALL rental bookings
      const { data: rentalData, error: rentalError } = await supabase
        .from('rental_bookings')
        .select('start_at, status')
        .is('deleted_at', null)

      if (rentalError) throw rentalError

      // Fetch ALL manual rides
      const { data: manualData, error: manualError } = await supabase
        .from('manual_rides')
        .select('pickup_at, status')
        .is('deleted_at', null)

      if (manualError) throw manualError

      // Process airport bookings
      const airportToday = airportData?.filter((b) => {
        if (!b.pickup_at) return false
        const bookingDate = getDateOnly(b.pickup_at)
        return bookingDate === todayStr
      }).length || 0

      const airportUpcoming = airportData?.filter((b) => {
        if (!b.pickup_at) return false
        const bookingDate = getDateOnly(b.pickup_at)
        return bookingDate > todayStr
      }).length || 0

      // Process subscription rides
      const subscriptionToday = subscriptionData?.filter((b) => {
        if (!b.date) return false
        return getDateOnly(b.date) === todayStr
      }).length || 0

      const subscriptionUpcoming = subscriptionData?.filter((b) => {
        if (!b.date) return false
        return getDateOnly(b.date) > todayStr
      }).length || 0

      // Process rental bookings
      const rentalToday = rentalData?.filter((b) => {
        if (!b.start_at) return false
        const bookingDate = getDateOnly(b.start_at)
        return bookingDate === todayStr
      }).length || 0

      const rentalUpcoming = rentalData?.filter((b) => {
        if (!b.start_at) return false
        const bookingDate = getDateOnly(b.start_at)
        return bookingDate > todayStr
      }).length || 0

      // Process manual rides
      const manualToday = manualData?.filter((b) => {
        if (!b.pickup_at) return false
        const bookingDate = getDateOnly(b.pickup_at)
        return bookingDate === todayStr
      }).length || 0

      const manualUpcoming = manualData?.filter((b) => {
        if (!b.pickup_at) return false
        const bookingDate = getDateOnly(b.pickup_at)
        return bookingDate > todayStr
      }).length || 0

      return {
        airport: {
          total: airportData?.length || 0,
          today: airportToday,
          upcoming: airportUpcoming,
        },
        subscriptions: {
          total: subscriptionData?.length || 0,
          today: subscriptionToday,
          upcoming: subscriptionUpcoming,
        },
        rentals: {
          total: rentalData?.length || 0,
          today: rentalToday,
          upcoming: rentalUpcoming,
        },
        manual: {
          total: manualData?.length || 0,
          today: manualToday,
          upcoming: manualUpcoming,
        },
      } as BookingSummary
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

