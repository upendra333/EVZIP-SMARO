import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { Drawer } from './Drawer'
import { StatusBadge } from './StatusBadge'
import { ManagerPasswordModal } from './ManagerPasswordModal'
import { useAllDrivers } from '../../hooks/useAllDrivers'
import { useAllVehicles } from '../../hooks/useAllVehicles'
import { DriverAutocomplete } from './DriverAutocomplete'
import { VehicleAutocomplete } from './VehicleAutocomplete'
import { useTripStatus } from '../../hooks/useTripStatus'
import { useManagerPassword } from '../../hooks/useManagerPassword'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useTripDetails } from '../../hooks/useTripDetails'
import { useOperator } from '../../hooks/useOperator'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { TripListItem } from '../../hooks/useTodayTrips'
import { TRIP_TYPES } from '../../utils/constants'

interface TripDrawerProps {
  trip: TripListItem | null
  isOpen: boolean
  onClose: () => void
}

export function TripDrawer({ trip, isOpen, onClose }: TripDrawerProps) {
  const { isManager } = useOperator()
  const { getAvailableTransitions, advanceStatus } = useTripStatus()
  const { isAuthenticated, validatePassword, isValidating, clearAuthentication } = useManagerPassword()
  const queryClient = useQueryClient()

  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [cancelReason, setCancelReason] = useState('')
  const [carryForward, setCarryForward] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showManagerModal, setShowManagerModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  
  // Pending changes state
  const [pendingDriverId, setPendingDriverId] = useState<string>('')
  const [pendingVehicleId, setPendingVehicleId] = useState<string>('')
  const [pendingNotes, setPendingNotes] = useState<string>('')
  const [pendingFare, setPendingFare] = useState<string>('')
  const [pendingPickupAt, setPendingPickupAt] = useState<string>('')
  const [pendingStartAt, setPendingStartAt] = useState<string>('')
  const [pendingEndAt, setPendingEndAt] = useState<string>('')
  const [hasPendingChanges, setHasPendingChanges] = useState(false)

  // Get full trip details with IDs (only if trip exists)
  const { data: tripDetails } = useTripDetails(
    trip?.id || '',
    trip?.type || '',
    trip?.ref_id || ''
  )

  // Get all drivers and vehicles for assignment
  const { data: allDrivers, error: driversError } = useAllDrivers()
  const { data: allVehicles, error: vehiclesError } = useAllVehicles()
  
  // Get the booking's hub_id to filter drivers and vehicles
  const bookingHubId = tripDetails?.hub_id || null
  
  // Filter to show only active drivers and available vehicles from the booking's hub
  // Handle various status formats (case-insensitive, trimmed, NULL/empty)
  // Note: Vehicles may use "active" status instead of "available" (for imported data compatibility)
  const drivers = (allDrivers || []).filter(driver => {
    const status = driver.status ? String(driver.status).trim().toLowerCase() : ''
    const isActive = status === 'active' || status === '' || driver.status === null
    // Filter by hub: if booking has a hub, only show drivers from that hub (or drivers with no hub)
    // If booking has no hub, show all active drivers
    const matchesHub = !bookingHubId || driver.hub_id === bookingHubId || !driver.hub_id
    return isActive && matchesHub
  })
  const vehicles = (allVehicles || []).filter(vehicle => {
    const status = vehicle.status ? String(vehicle.status).trim().toLowerCase() : ''
    // Accept both "available" (correct) and "active" (for imported data compatibility)
    const isAvailable = status === 'available' || status === 'active' || status === '' || vehicle.status === null
    // Filter by hub: if booking has a hub, only show vehicles from that hub (or vehicles with no hub)
    // If booking has no hub, show all available vehicles
    const matchesHub = !bookingHubId || vehicle.current_hub_id === bookingHubId || !vehicle.current_hub_id
    return isAvailable && matchesHub
  })
  
  // Debug: Log filtered results
  useEffect(() => {
    if (isOpen && allVehicles && allDrivers) {
      console.log('=== ASSIGNMENT FILTERING DEBUG ===')
      console.log('Booking Hub ID:', bookingHubId)
      console.log('Total drivers:', allDrivers.length)
      console.log('Total vehicles:', allVehicles.length)
      console.log('Filtered drivers:', drivers.length)
      console.log('Filtered vehicles:', vehicles.length)
      if (bookingHubId) {
        console.log(`Showing only drivers/vehicles from hub: ${bookingHubId}`)
      } else {
        console.log('No hub specified - showing all active drivers and available vehicles')
      }
    }
  }, [isOpen, allVehicles, allDrivers, drivers, vehicles, bookingHubId])
  
  // Debug: Log data for troubleshooting
  useEffect(() => {
    if (isOpen && allDrivers && allVehicles) {
      console.log('TripDrawer - All Drivers:', allDrivers.length)
      console.log('TripDrawer - Driver statuses:', [...new Set(allDrivers.map(d => d.status))])
      console.log('TripDrawer - Sample driver:', allDrivers[0])
      console.log('TripDrawer - Active Drivers:', drivers.length)
      console.log('TripDrawer - All Vehicles:', allVehicles.length)
      console.log('TripDrawer - Vehicle statuses:', [...new Set(allVehicles.map(v => v.status))])
      console.log('TripDrawer - Sample vehicle:', allVehicles[0])
      console.log('TripDrawer - Available Vehicles:', vehicles.length)
      if (driversError) console.error('Drivers error:', driversError)
      if (vehiclesError) console.error('Vehicles error:', vehiclesError)
    }
  }, [isOpen, allDrivers, allVehicles, drivers, vehicles, driversError, vehiclesError])

  // Get audit log for timeline (only if trip exists)
  const { data: auditLog } = useAuditLog(trip?.id || '', 'trips')

  // Get carried forward rides for this subscription (only for subscription trips)
  const { data: carriedForwardRides } = useQuery({
    queryKey: ['carriedForwardRides', tripDetails?.subscription_id],
    queryFn: async () => {
      if (!tripDetails?.subscription_id || trip?.type !== TRIP_TYPES.SUBSCRIPTION) {
        return []
      }

      const { data, error } = await supabase
        .from('subscription_rides')
        .select(`
          id,
          date,
          direction,
          status,
          notes,
          trips(id, status)
        `)
        .eq('subscription_id', tripDetails.subscription_id)
        .eq('carried_forward', true)
        .in('status', ['created', 'assigned'])
        .is('deleted_at', null)
        .order('date', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!tripDetails?.subscription_id && trip?.type === TRIP_TYPES.SUBSCRIPTION,
  })

  // Helper function to convert ISO string to datetime-local format
  const isoToDatetimeLocal = (isoString: string | null): string => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Compute current values safely
  const currentDriverId = tripDetails?.driver_id || ''
  const currentVehicleId = tripDetails?.vehicle_id || ''
  const currentNotes = tripDetails?.notes || ''
  const currentFare = tripDetails?.fare || null
  const currentPickupAt = tripDetails?.pickup_at || null
  const currentStartAt = tripDetails?.start_at || null
  const currentEndAt = tripDetails?.end_at || null

  // Initialize pending values when trip details load or trip changes
  useEffect(() => {
    if (trip?.id) {
      setPendingDriverId(currentDriverId)
      setPendingVehicleId(currentVehicleId)
      setPendingNotes(currentNotes)
      setPendingFare(currentFare !== null ? (currentFare / 100).toString() : '')
      setPendingPickupAt(isoToDatetimeLocal(currentPickupAt))
      setPendingStartAt(isoToDatetimeLocal(currentStartAt))
      setPendingEndAt(isoToDatetimeLocal(currentEndAt))
      setSelectedStatus('')
      setCancelReason('')
      setCarryForward(false)
      setHasPendingChanges(false)
    }
  }, [trip?.id, currentDriverId, currentVehicleId, currentNotes, currentFare, currentPickupAt, currentStartAt, currentEndAt])

  // Check if there are pending changes
  useEffect(() => {
    if (!trip?.id) return
    const driverChanged = pendingDriverId !== currentDriverId
    const vehicleChanged = pendingVehicleId !== currentVehicleId
    const notesChanged = pendingNotes !== currentNotes
    const fareChanged = pendingFare !== (currentFare !== null ? (currentFare / 100).toString() : '')
    const pickupAtChanged = pendingPickupAt !== isoToDatetimeLocal(currentPickupAt)
    const startAtChanged = pendingStartAt !== isoToDatetimeLocal(currentStartAt)
    const endAtChanged = pendingEndAt !== isoToDatetimeLocal(currentEndAt)
    const statusChanged = selectedStatus !== ''
    setHasPendingChanges(driverChanged || vehicleChanged || notesChanged || fareChanged || pickupAtChanged || startAtChanged || endAtChanged || statusChanged)
  }, [trip?.id, pendingDriverId, pendingVehicleId, pendingNotes, pendingFare, pendingPickupAt, pendingStartAt, pendingEndAt, selectedStatus, currentDriverId, currentVehicleId, currentNotes, currentFare, currentPickupAt, currentStartAt, currentEndAt])

  // Assignment mutations (must be before any conditional returns)
  const assignDriver = useMutation({
    mutationFn: async (driverId: string | null) => {
      if (!trip) throw new Error('No trip selected')

      const tableName = trip.type === TRIP_TYPES.SUBSCRIPTION
        ? 'subscription_rides'
        : trip.type === TRIP_TYPES.AIRPORT
        ? 'airport_bookings'
        : trip.type === TRIP_TYPES.RENTAL
        ? 'rental_bookings'
        : 'manual_rides'

      const { error } = await supabase
        .from(tableName)
        .update({ driver_id: driverId, updated_at: new Date().toISOString() })
        .eq('id', trip.ref_id)

      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ 
          queryKey: ['todayMetrics'],
          refetchType: 'active',
          exact: false 
        }),
        queryClient.invalidateQueries({ queryKey: ['tripDetails'], refetchType: 'active' }),
      ])
    },
  })

  const assignVehicle = useMutation({
    mutationFn: async (vehicleId: string | null) => {
      if (!trip) throw new Error('No trip selected')

      const tableName = trip.type === TRIP_TYPES.SUBSCRIPTION
        ? 'subscription_rides'
        : trip.type === TRIP_TYPES.AIRPORT
        ? 'airport_bookings'
        : trip.type === TRIP_TYPES.RENTAL
        ? 'rental_bookings'
        : 'manual_rides'

      const { error } = await supabase
        .from(tableName)
        .update({ vehicle_id: vehicleId, updated_at: new Date().toISOString() })
        .eq('id', trip.ref_id)

      if (error) throw error
    },
    onSuccess: async () => {
      // Invalidate and refetch queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ 
          queryKey: ['todayMetrics'],
          refetchType: 'active',
          exact: false 
        }),
        queryClient.invalidateQueries({ queryKey: ['tripDetails'], refetchType: 'active' }),
      ])
    },
  })

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      if (!trip) throw new Error('No trip selected')

      const tableName = trip.type === TRIP_TYPES.SUBSCRIPTION
        ? 'subscription_rides'
        : trip.type === TRIP_TYPES.AIRPORT
        ? 'airport_bookings'
        : trip.type === TRIP_TYPES.RENTAL
        ? 'rental_bookings'
        : 'manual_rides'

      const { error } = await supabase
        .from(tableName)
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', trip.ref_id)

      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ 
          queryKey: ['todayMetrics'],
          refetchType: 'active',
          exact: false 
        }),
        queryClient.invalidateQueries({ queryKey: ['tripDetails'], refetchType: 'active' }),
      ])
    },
  })

  const updateFare = useMutation({
    mutationFn: async (fare: number | null) => {
      if (!trip) throw new Error('No trip selected')

      const tableName = trip.type === TRIP_TYPES.SUBSCRIPTION
        ? 'subscription_rides'
        : trip.type === TRIP_TYPES.AIRPORT
        ? 'airport_bookings'
        : trip.type === TRIP_TYPES.RENTAL
        ? 'rental_bookings'
        : 'manual_rides'

      const { error } = await supabase
        .from(tableName)
        .update({ fare: fare ? fare * 100 : null, updated_at: new Date().toISOString() })
        .eq('id', trip.ref_id)

      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ 
          queryKey: ['todayMetrics'],
          refetchType: 'active',
          exact: false 
        }),
        queryClient.invalidateQueries({ queryKey: ['tripDetails'], refetchType: 'active' }),
      ])
    },
  })

  // Helper function to convert datetime-local to ISO string
  const datetimeLocalToISO = (datetimeLocal: string): string => {
    if (!datetimeLocal) return ''
    const [datePart, timePart] = datetimeLocal.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)
    const localDate = new Date(year, month - 1, day, hours, minutes)
    return localDate.toISOString()
  }

  const updatePickupAt = useMutation({
    mutationFn: async (pickupAt: string) => {
      if (!trip) throw new Error('No trip selected')

      const tableName = trip.type === TRIP_TYPES.AIRPORT
        ? 'airport_bookings'
        : 'manual_rides'

      const pickupAtISO = datetimeLocalToISO(pickupAt)

      const { error } = await supabase
        .from(tableName)
        .update({ pickup_at: pickupAtISO, updated_at: new Date().toISOString() })
        .eq('id', trip.ref_id)

      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ 
          queryKey: ['todayMetrics'],
          refetchType: 'active',
          exact: false 
        }),
        queryClient.invalidateQueries({ queryKey: ['tripDetails'], refetchType: 'active' }),
      ])
    },
  })

  const updateRentalTiming = useMutation({
    mutationFn: async (data: { startAt: string; endAt: string }) => {
      if (!trip) throw new Error('No trip selected')

      const startAtISO = datetimeLocalToISO(data.startAt)
      const endAtISO = datetimeLocalToISO(data.endAt)

      const { error } = await supabase
        .from('rental_bookings')
        .update({ 
          start_at: startAtISO, 
          end_at: endAtISO, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', trip.ref_id)

      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' }),
        queryClient.invalidateQueries({ 
          queryKey: ['todayMetrics'],
          refetchType: 'active',
          exact: false 
        }),
        queryClient.invalidateQueries({ queryKey: ['tripDetails'], refetchType: 'active' }),
      ])
    },
  })

  // Early return if no trip (after all hooks are called)
  if (!trip) return null

  const hasDriver = !!(tripDetails?.driver_id || trip.driver_name)
  const hasVehicle = !!(tripDetails?.vehicle_id || trip.vehicle_reg)
  const availableTransitions = getAvailableTransitions(trip.status, hasDriver, hasVehicle)

  const handleStatusChange = (newStatus: string, requiresReason: boolean) => {
    setSelectedStatus(newStatus)
    if (requiresReason) {
      setShowStatusModal(true)
    }
  }

  const handleSubmitAllChanges = async () => {
    if (!trip) return

    try {
      // Submit driver change
      if (pendingDriverId !== currentDriverId) {
        await assignDriver.mutateAsync(pendingDriverId || null)
      }

      // Submit vehicle change
      if (pendingVehicleId !== currentVehicleId) {
        await assignVehicle.mutateAsync(pendingVehicleId || null)
      }

      // Submit notes change
      if (pendingNotes !== currentNotes) {
        await updateNotes.mutateAsync(pendingNotes)
      }

      // Submit fare change
      const fareChanged = pendingFare !== (currentFare !== null ? (currentFare / 100).toString() : '')
      if (fareChanged) {
        const fareValue = pendingFare.trim() === '' ? null : parseFloat(pendingFare)
        if (fareValue !== null && (isNaN(fareValue) || fareValue < 0)) {
          alert('Please enter a valid fare amount')
          return
        }
        await updateFare.mutateAsync(fareValue)
      }

      // Submit timing changes
      if (trip.type === TRIP_TYPES.AIRPORT || trip.type === TRIP_TYPES.MANUAL) {
        const pickupAtChanged = pendingPickupAt !== isoToDatetimeLocal(currentPickupAt)
        if (pickupAtChanged && pendingPickupAt) {
          await updatePickupAt.mutateAsync(pendingPickupAt)
        }
      } else if (trip.type === TRIP_TYPES.RENTAL) {
        const startAtChanged = pendingStartAt !== isoToDatetimeLocal(currentStartAt)
        const endAtChanged = pendingEndAt !== isoToDatetimeLocal(currentEndAt)
        if ((startAtChanged || endAtChanged) && pendingStartAt && pendingEndAt) {
          await updateRentalTiming.mutateAsync({
            startAt: pendingStartAt,
            endAt: pendingEndAt,
          })
        }
      }

      // Submit status change
      if (selectedStatus) {
        const requiresReason = selectedStatus === 'cancelled'
        if (requiresReason && !cancelReason.trim()) {
          setShowStatusModal(true)
          return
        }

        // Check if manager action required
        const isProtectedAction = trip.status === 'completed' && selectedStatus !== trip.status
        if (isProtectedAction && isManager() && !isAuthenticated) {
          setPendingAction(() => () => handleSubmitAllChanges())
          setShowManagerModal(true)
          return
        }

        await advanceStatus.mutateAsync({
          tripId: trip.id,
          newStatus: selectedStatus,
          cancelReason: cancelReason || undefined,
          carryForward: trip.type === TRIP_TYPES.SUBSCRIPTION && selectedStatus === 'cancelled' ? carryForward : undefined,
        })
        setSelectedStatus('')
        setCancelReason('')
        setCarryForward(false)
      }

      // Reset pending changes
      setPendingDriverId(currentDriverId)
      setPendingVehicleId(currentVehicleId)
      setPendingNotes(currentNotes)
      setPendingFare(currentFare !== null ? (currentFare / 100).toString() : '')
      setPendingPickupAt(isoToDatetimeLocal(currentPickupAt))
      setPendingStartAt(isoToDatetimeLocal(currentStartAt))
      setPendingEndAt(isoToDatetimeLocal(currentEndAt))
      setHasPendingChanges(false)
      
      // Close the drawer after successful submission
      onClose()
    } catch (error) {
      console.error('Error submitting changes:', error)
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while submitting changes'
      alert(`Error: ${errorMessage}`)
    }
  }


  const handleManagerAuthSuccess = async () => {
    setShowManagerModal(false)
    if (pendingAction) {
      await pendingAction()
      setPendingAction(null)
      // The drawer will be closed by handleSubmitAllChanges after successful submission
    }
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    try {
      const date = new Date(timeStr)
      return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return timeStr
    }
  }

  const formatFare = (fare: number | null) => {
    if (fare === null) return '-'
    return `₹${(fare / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={() => {
          onClose()
          clearAuthentication()
          setCancelReason('')
          setCarryForward(false)
          setShowStatusModal(false)
          // Reset pending changes when drawer closes - values will be reset by useEffect when trip changes
        }}
        title={`Trip Details - ${trip.type.charAt(0).toUpperCase() + trip.type.slice(1)}`}
      >
        <div className="space-y-6">
          {/* Trip Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Trip ID</label>
              <p className="text-text font-mono text-sm">{trip.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <StatusBadge status={trip.status} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="text-text">{trip.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                {trip.type === TRIP_TYPES.RENTAL ? 'Start & End Time' : 'Pickup Time'}
              </label>
              {(trip.type === TRIP_TYPES.AIRPORT || trip.type === TRIP_TYPES.MANUAL) && (
                <input
                  type="datetime-local"
                  value={pendingPickupAt}
                  onChange={(e) => setPendingPickupAt(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text"
                />
              )}
              {trip.type === TRIP_TYPES.RENTAL && (
                <div className="space-y-2 mt-1">
                  <input
                    type="datetime-local"
                    value={pendingStartAt}
                    onChange={(e) => setPendingStartAt(e.target.value)}
                    placeholder="Start Date & Time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text"
                  />
                  <input
                    type="datetime-local"
                    value={pendingEndAt}
                    onChange={(e) => setPendingEndAt(e.target.value)}
                    placeholder="End Date & Time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text"
                  />
                </div>
              )}
              {trip.type === TRIP_TYPES.SUBSCRIPTION && (
                <p className="text-text">{formatTime(trip.start_time)}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Customer</label>
              <p className="text-text">{trip.customer_name || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Fare (₹)</label>
              <input
                type="number"
                step="0.01"
                value={pendingFare}
                onChange={(e) => setPendingFare(e.target.value)}
                placeholder="Enter fare"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text font-semibold"
              />
              {currentFare !== null && (
                <p className="mt-1 text-xs text-gray-500">Current: {formatFare(currentFare)}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Hub/Route</label>
              <p className="text-text">{trip.hub_route || '-'}</p>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-text mb-4">Assignment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver
                </label>
                <DriverAutocomplete
                  value={pendingDriverId}
                  onChange={(driverId) => {
                    setPendingDriverId(driverId)
                  }}
                  placeholder="Type to search driver..."
                  activeOnly={true}
                  hubId={bookingHubId}
                />
                {driversError && (
                  <p className="mt-1 text-sm text-red-600">Error loading drivers: {driversError.message}</p>
                )}
                {trip.driver_name && (
                  <p className="mt-1 text-sm text-gray-600">Current: {trip.driver_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle
                </label>
                <VehicleAutocomplete
                  value={pendingVehicleId}
                  onChange={(vehicleId) => {
                    setPendingVehicleId(vehicleId)
                  }}
                  placeholder="Type to search vehicle..."
                  availableOnly={true}
                  hubId={bookingHubId}
                />
                {vehiclesError && (
                  <p className="mt-1 text-sm text-red-600">Error loading vehicles: {vehiclesError.message}</p>
                )}
                {trip.vehicle_reg && (
                  <p className="mt-1 text-sm text-gray-600">Current: {trip.vehicle_reg}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status Changes */}
          {availableTransitions.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-text mb-4">Status Actions</h3>
              <div className="flex flex-wrap gap-2">
                {availableTransitions.map((transition) => (
                  <button
                    key={transition.to}
                    onClick={() => handleStatusChange(transition.to, transition.requiresReason || false)}
                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      selectedStatus === transition.to
                        ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {transition.label}
                    {selectedStatus === transition.to && ' ✓'}
                  </button>
                ))}
              </div>
              {selectedStatus && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {availableTransitions.find(t => t.to === selectedStatus)?.label}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          {hasPendingChanges && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-medium mb-2">You have pending changes</p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {pendingDriverId !== currentDriverId && (
                    <li>• Driver assignment will be updated</li>
                  )}
                  {pendingVehicleId !== currentVehicleId && (
                    <li>• Vehicle assignment will be updated</li>
                  )}
                  {pendingNotes !== currentNotes && (
                    <li>• Notes will be updated</li>
                  )}
                  {selectedStatus && (
                    <li>• Status will change to: {availableTransitions.find(t => t.to === selectedStatus)?.label}</li>
                  )}
                </ul>
              </div>
              <button
                onClick={handleSubmitAllChanges}
                disabled={assignDriver.isPending || assignVehicle.isPending || updateNotes.isPending || updateFare.isPending || updatePickupAt.isPending || updateRentalTiming.isPending || advanceStatus.isPending}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(assignDriver.isPending || assignVehicle.isPending || updateNotes.isPending || updateFare.isPending || updatePickupAt.isPending || updateRentalTiming.isPending || advanceStatus.isPending) ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit All Changes'
                )}
              </button>
            </div>
          )}

          {/* Notes Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-text mb-4">Notes</h3>
            <textarea
              value={pendingNotes}
              onChange={(e) => setPendingNotes(e.target.value)}
              placeholder="Add notes about this trip..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
            />
          </div>

          {/* Carried Forward Rides - Only for subscription trips */}
          {trip?.type === TRIP_TYPES.SUBSCRIPTION && carriedForwardRides && carriedForwardRides.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-text mb-4">Carried Forward Rides</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  These rides were carried forward from cancelled rides and are available for use.
                </p>
              </div>
              <div className="space-y-3">
                {carriedForwardRides.map((ride: any) => (
                  <div
                    key={ride.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text">
                          {formatTime(ride.date ? `${ride.date}T09:00:00` : null)}
                        </span>
                        <StatusBadge status={ride.status} size="sm" />
                        <span className="text-xs text-gray-500">
                          {ride.direction === 'to_office' ? 'To Office' : 'From Office'}
                        </span>
                      </div>
                      {ride.notes && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ride.notes}</p>
                      )}
                    </div>
                    {ride.trips && Array.isArray(ride.trips) && ride.trips.length > 0 && ride.trips[0]?.id && (
                      <button
                        onClick={() => {
                          // Close current drawer and open the carried forward ride
                          onClose()
                          // Note: This would need to be handled by parent component
                          // For now, we'll just show the trip ID
                          console.log('Open carried forward trip:', ride.trips[0].id)
                        }}
                        className="ml-4 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        View Trip
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {auditLog && auditLog.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-text mb-4">Timeline</h3>
              <div className="space-y-4">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text">
                          {entry.action.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(entry.at)}
                        </span>
                      </div>
                      {entry.actor_name && (
                        <p className="text-xs text-gray-600">By: {entry.actor_name}</p>
                      )}
                      {entry.diff_json?.old_status && entry.diff_json?.new_status && (
                        <p className="text-xs text-gray-600 mt-1">
                          Status: {entry.diff_json.old_status} → {entry.diff_json.new_status}
                        </p>
                      )}
                      {entry.diff_json?.carry_forward && (
                        <p className="text-xs text-blue-600 mt-1">
                          ✓ Ride was carried forward
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* Status Change Modal (for cancel reason) */}
      {showStatusModal && (
        <Dialog open={showStatusModal} onClose={() => setShowStatusModal(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl p-6">
              <Dialog.Title className="text-xl font-bold text-text mb-4">
                Cancel Reason Required
              </Dialog.Title>
              <div className="space-y-4">
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter cancellation reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                />
                {/* Carry Forward Option - Only for subscription rides */}
                {trip?.type === TRIP_TYPES.SUBSCRIPTION && selectedStatus === 'cancelled' && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="carryForward"
                      checked={carryForward}
                      onChange={(e) => setCarryForward(e.target.checked)}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="carryForward" className="flex-1 text-sm text-gray-700 cursor-pointer">
                      <span className="font-medium">Carry Forward This Ride</span>
                      <p className="text-xs text-gray-600 mt-1">
                        This ride will be available in the trip drawer for later use. Useful for subscriptions charged by total trips.
                      </p>
                    </label>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (!cancelReason.trim()) return
                      setShowStatusModal(false)
                      // Automatically submit the cancellation with carry forward option
                      try {
                        await advanceStatus.mutateAsync({
                          tripId: trip!.id,
                          newStatus: selectedStatus,
                          cancelReason: cancelReason || undefined,
                          carryForward: trip!.type === TRIP_TYPES.SUBSCRIPTION && selectedStatus === 'cancelled' ? carryForward : undefined,
                        })
                        setSelectedStatus('')
                        setCancelReason('')
                        setCarryForward(false)
                        setHasPendingChanges(false)
                        onClose()
                      } catch (error: any) {
                        console.error('Error cancelling trip:', error)
                        const errorMessage = error?.message || error?.error?.message || 'Failed to cancel trip. Please try again.'
                        alert(`Error: ${errorMessage}`)
                        // Re-open modal so user can try again
                        setShowStatusModal(true)
                      }
                    }}
                    disabled={!cancelReason.trim() || advanceStatus.isPending}
                    className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {advanceStatus.isPending ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cancelling...
                      </>
                    ) : (
                      'Cancel Trip'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowStatusModal(false)
                      setCancelReason('')
                      setCarryForward(false)
                      setSelectedStatus('')
                    }}
                    disabled={advanceStatus.isPending}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Manager Password Modal */}
      <ManagerPasswordModal
        isOpen={showManagerModal}
        onClose={() => {
          setShowManagerModal(false)
          setPendingAction(null)
        }}
        onSuccess={handleManagerAuthSuccess}
        onValidate={validatePassword}
        isValidating={isValidating}
      />
    </>
  )
}

