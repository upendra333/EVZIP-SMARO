import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOperator } from './useOperator'

// Helper function to get or create customer
async function getOrCreateCustomer(name: string, phone?: string): Promise<string> {
  // First, try to find existing customer by phone if provided
  if (phone && phone.trim()) {
    const { data: existingByPhone } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone.trim())
      .maybeSingle()

    if (existingByPhone) {
      return existingByPhone.id
    }
  }

  // Try to find by name and phone combination
  if (phone && phone.trim()) {
    const { data: existingByNamePhone } = await supabase
      .from('customers')
      .select('id')
      .eq('name', name.trim())
      .eq('phone', phone.trim())
      .maybeSingle()

    if (existingByNamePhone) {
      return existingByNamePhone.id
    }
  }

  // Try to find by name only (if no phone provided)
  if (!phone || !phone.trim()) {
    const { data: existingByName } = await supabase
      .from('customers')
      .select('id')
      .eq('name', name.trim())
      .is('phone', null)
      .maybeSingle()

    if (existingByName) {
      return existingByName.id
    }
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      name: name.trim(),
      phone: phone?.trim() || null,
    })
    .select('id')
    .single()

  if (error) throw error
  if (!newCustomer) throw new Error('Failed to create customer')
  return newCustomer.id
}

export function useCreateSubscriptionRide() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: {
      subscription_id: string
      date: string
      direction: string
      est_km?: number
      fare?: number
      notes?: string
    }) => {
      const { data: ride, error } = await supabase
        .from('subscription_rides')
        .insert({
          subscription_id: data.subscription_id,
          date: data.date,
          direction: data.direction,
          est_km: data.est_km,
          fare: data.fare ? data.fare * 100 : null, // Convert to paise
          status: 'created',
          notes: data.notes,
        })
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'subscription_rides',
        object_id: ride.id,
        action: 'create',
        diff_json: { ...data },
      })

      return ride
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionRides'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' })
      
      // Explicitly refetch todayMetrics for all variations
      await queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'todayMetrics',
        type: 'active'
      })
    },
  })
}

export function useCreateAirportBooking() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: {
      customer_name: string
      customer_phone?: string
      pickup_at: string
      pickup: string
      drop: string
      flight_no?: string
      est_km?: number
      fare?: number
      notes?: string
      hub_id?: string
    }) => {
      // Get or create customer
      const customerId = await getOrCreateCustomer(data.customer_name, data.customer_phone)

      const { data: booking, error } = await supabase
        .from('airport_bookings')
        .insert({
          customer_id: customerId,
          pickup_at: data.pickup_at,
          pickup: data.pickup,
          drop: data.drop,
          flight_no: data.flight_no,
          est_km: data.est_km,
          fare: data.fare ? data.fare * 100 : null, // Convert to paise
          status: 'created',
          notes: data.notes,
          hub_id: data.hub_id || null,
        })
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'airport_bookings',
        object_id: booking.id,
        action: 'create',
        diff_json: { ...data },
      })

      return booking
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['airportBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' })
      
      // Explicitly refetch todayMetrics for all variations
      await queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'todayMetrics',
        type: 'active'
      })
    },
  })
}

export function useCreateRentalBooking() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: {
      customer_name: string
      customer_phone?: string
      start_at: string
      end_at: string
      package_hours: number
      package_km: number
      est_km?: number
      extra_km_rate?: number
      per_hour_rate?: number
      fare?: number
      notes?: string
      hub_id?: string
    }) => {
      // Get or create customer
      const customerId = await getOrCreateCustomer(data.customer_name, data.customer_phone)

      const { data: booking, error } = await supabase
        .from('rental_bookings')
        .insert({
          customer_id: customerId,
          start_at: data.start_at,
          end_at: data.end_at,
          package_hours: data.package_hours,
          package_km: data.package_km,
          est_km: data.est_km,
          extra_km_rate: data.extra_km_rate ? data.extra_km_rate * 100 : null, // Convert to paise
          per_hour_rate: data.per_hour_rate ? data.per_hour_rate * 100 : null, // Convert to paise
          fare: data.fare ? data.fare * 100 : null, // Convert to paise
          status: 'created',
          notes: data.notes,
          hub_id: data.hub_id || null,
        })
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'rental_bookings',
        object_id: booking.id,
        action: 'create',
        diff_json: { ...data },
      })

      return booking
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['rentalBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' })
      
      // Explicitly refetch todayMetrics for all variations
      await queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'todayMetrics',
        type: 'active'
      })
    },
  })
}

export function useCreateManualRide() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: {
      customer_name: string
      customer_phone?: string
      pickup_at: string
      pickup: string
      drop: string
      est_km?: number
      fare?: number
      notes?: string
      hub_id?: string
    }) => {
      // Get or create customer
      const customerId = await getOrCreateCustomer(data.customer_name, data.customer_phone)

      const { data: ride, error } = await supabase
        .from('manual_rides')
        .insert({
          customer_id: customerId,
          pickup_at: data.pickup_at,
          pickup: data.pickup,
          drop: data.drop,
          est_km: data.est_km,
          fare: data.fare ? data.fare * 100 : null, // Convert to paise
          status: 'created',
          notes: data.notes,
          hub_id: data.hub_id || null,
        })
        .select()
        .single()

      if (error) throw error

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'manual_rides',
        object_id: ride.id,
        action: 'create',
        diff_json: { ...data },
      })

      return ride
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['manualRides'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' })
      
      // Explicitly refetch todayMetrics for all variations
      await queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'todayMetrics',
        type: 'active'
      })
    },
  })
}

