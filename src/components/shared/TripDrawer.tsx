import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { Drawer } from './Drawer'
import { StatusBadge } from './StatusBadge'
import { ManagerPasswordModal } from './ManagerPasswordModal'
import { useDrivers } from '../../hooks/useDrivers'
import { useVehicles } from '../../hooks/useVehicles'
import { useTripStatus } from '../../hooks/useTripStatus'
import { useManagerPassword } from '../../hooks/useManagerPassword'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useTripDetails } from '../../hooks/useTripDetails'
import { useOperator } from '../../hooks/useOperator'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { TripListItem } from '../../hooks/useTodayTrips'
import { TRIP_TYPES } from '../../utils/constants'

interface TripDrawerProps {
  trip: TripListItem | null
  isOpen: boolean
  onClose: () => void
}

export function TripDrawer({ trip, isOpen, onClose }: TripDrawerProps) {
  const { operator, isManager } = useOperator()
  const { getAvailableTransitions, advanceStatus } = useTripStatus()
  const { isAuthenticated, validatePassword, isValidating, clearAuthentication } = useManagerPassword()
  const queryClient = useQueryClient()

  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [cancelReason, setCancelReason] = useState('')
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

  // Get drivers and vehicles (filtered by hub if available)
  const { data: drivers } = useDrivers()
  const { data: vehicles } = useVehicles()

  // Get audit log for timeline (only if trip exists)
  const { data: auditLog } = useAuditLog(trip?.id || '', 'trips')

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
      queryClient.invalidateQueries({ queryKey: ['todayTrips'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['allBookings'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['bookingSummary'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['tripDetails'], refetchType: 'active' })
      
      // Explicitly refetch todayMetrics for all variations
      await queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'todayMetrics',
        type: 'active'
      })
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
        })
        setSelectedStatus('')
        setCancelReason('')
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
    }
  }

  const handleStatusSubmit = async (status?: string) => {
    const targetStatus = status || selectedStatus
    if (!targetStatus) return

    // Check if manager action required
    const isProtectedAction = trip.status === 'completed' && targetStatus !== trip.status
    if (isProtectedAction && isManager() && !isAuthenticated) {
      setPendingAction(() => () => advanceStatus.mutate({
        tripId: trip.id,
        newStatus: targetStatus,
        cancelReason: cancelReason || undefined,
      }))
      setShowManagerModal(true)
      setShowStatusModal(false)
      return
    }

    advanceStatus.mutate({
      tripId: trip.id,
      newStatus: targetStatus,
      cancelReason: cancelReason || undefined,
    })

    setShowStatusModal(false)
    setCancelReason('')
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
                <select
                  value={pendingDriverId}
                  onChange={(e) => {
                    setPendingDriverId(e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select driver...</option>
                  {drivers?.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.phone})
                    </option>
                  ))}
                </select>
                {trip.driver_name && (
                  <p className="mt-1 text-sm text-gray-600">Current: {trip.driver_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle
                </label>
                <select
                  value={pendingVehicleId}
                  onChange={(e) => {
                    setPendingVehicleId(e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select vehicle...</option>
                  {vehicles?.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.reg_no} {vehicle.make && vehicle.model && `(${vehicle.make} ${vehicle.model})`}
                    </option>
                  ))}
                </select>
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
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowStatusModal(false)
                      // Cancel reason is stored, will be submitted with other changes
                    }}
                    disabled={!cancelReason.trim()}
                    className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                  >
                    Save Reason
                  </button>
                  <button
                    onClick={() => {
                      setShowStatusModal(false)
                      setCancelReason('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

