import { useState, useEffect, useRef, useMemo } from 'react'
import { useTodayMetrics } from '../hooks/useTodayMetrics'
import { useAllBookings } from '../hooks/useAllBookings'
import { type TripListItem } from '../hooks/useTodayTrips'
import { MetricCard } from '../components/shared/MetricCard'
import { TripsTable } from '../components/shared/TripsTable'
import { FiltersBar, type Filters } from '../components/shared/FiltersBar'
import { TripDrawer } from '../components/shared/TripDrawer'
import { CreateAirportBookingModal } from '../components/shared/CreateAirportBookingModal'
import { CreateSubscriptionModal } from '../components/shared/CreateSubscriptionModal'
import { CreateRentalBookingModal } from '../components/shared/CreateRentalBookingModal'
import { CreateManualRideModal } from '../components/shared/CreateManualRideModal'
import { TRIP_STATUSES } from '../utils/constants'
import { useOperator } from '../hooks/useOperator'
import { PERMISSIONS } from '../utils/permissions'

export function Dashboard() {
  const [filters, setFilters] = useState<Filters>({})
  const [selectedTrip, setSelectedTrip] = useState<TripListItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [createModalType, setCreateModalType] = useState<'airport' | 'subscription_booking' | 'rental' | 'manual' | null>(null)

  const { can } = useOperator()
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useTodayMetrics()
  const { data: bookings, isLoading: bookingsLoading } = useAllBookings({
    type: filters.type,
    status: filters.status,
    driver: filters.driver,
    vehicle: filters.vehicle,
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddDropdown(false)
      }
    }

    if (showAddDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddDropdown])

  const handleCardClick = (filterType: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType] === value ? undefined : value,
    }))
  }

  const handleRowClick = (trip: TripListItem) => {
    setSelectedTrip(trip)
    setDrawerOpen(true)
  }

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  // Helper function to get date only (YYYY-MM-DD) from a date string
  const getDateOnly = (dateStr: string | null): string => {
    if (!dateStr) return ''
    // Try to extract date directly from ISO string (YYYY-MM-DDTHH:mm:ss...)
    const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
    if (isoMatch) {
      return isoMatch[1]
    }
    // Fallback to parsing with UTC methods to avoid timezone issues
    const d = new Date(dateStr)
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calculate "Due Next 60 Min" and "Due Today" from bookings data
  const calculatedMetrics = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return { dueNext60Min: 0, dueToday: 0 }
    }

    const now = new Date()
    const next60Min = new Date(now.getTime() + 60 * 60 * 1000) // 60 minutes from now
    
    // Get today's start and end times
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = new Date(today)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    let dueNext60Min = 0
    let dueToday = 0

    bookings.forEach((booking) => {
      if (!booking.start_time) return

      // Parse the start_time (could be ISO string or date string)
      const startTime = new Date(booking.start_time)
      if (isNaN(startTime.getTime())) return

      // Only count bookings with status 'created' or 'assigned'
      const isPending = booking.status === TRIP_STATUSES.CREATED || booking.status === TRIP_STATUSES.ASSIGNED

      if (!isPending) return

      // Check if due in next 60 minutes
      if (startTime >= now && startTime <= next60Min) {
        dueNext60Min++
      }

      // Check if due today
      if (startTime >= todayStart && startTime <= todayEnd) {
        dueToday++
      }
    })

    return { dueNext60Min, dueToday }
  }, [bookings])

  // Calculate booking summary from bookings data
  const bookingSummary = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return {
        airport: { today: 0, upcoming: 0 },
        subscriptions: { today: 0, upcoming: 0 },
        rentals: { today: 0, upcoming: 0 },
        manual: { today: 0, upcoming: 0 },
      }
    }

    // Calculate today's date using LOCAL timezone, not UTC
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const airport = bookings.filter(b => b.type === 'airport')
    const subscriptions = bookings.filter(b => b.type === 'subscription')
    const rentals = bookings.filter(b => b.type === 'rental')
    const manual = bookings.filter(b => b.type === 'manual')

    const calculateTodayAndUpcoming = (bookingList: TripListItem[]) => {
      const today = bookingList.filter(b => {
        if (!b.start_time) return false
        return getDateOnly(b.start_time) === todayStr
      }).length

      const upcoming = bookingList.filter(b => {
        if (!b.start_time) return false
        return getDateOnly(b.start_time) > todayStr
      }).length

      return { today, upcoming }
    }

    return {
      airport: calculateTodayAndUpcoming(airport),
      subscriptions: calculateTodayAndUpcoming(subscriptions),
      rentals: calculateTodayAndUpcoming(rentals),
      manual: calculateTodayAndUpcoming(manual),
    }
  }, [bookings])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview and all bookings</p>
        </div>
        {can(PERMISSIONS.CREATE_BOOKING) && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
            >
              <span>+</span> Add Booking
            </button>
            {showAddDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <button
                onClick={() => {
                  setCreateModalType('airport')
                  setShowAddDropdown(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-lg"
              >
                ✈️ Airport Booking
              </button>
              <button
                onClick={() => {
                  setCreateModalType('subscription_booking')
                  setShowAddDropdown(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50"
              >
                📅 Subscription Booking
              </button>
              <button
                onClick={() => {
                  setCreateModalType('rental')
                  setShowAddDropdown(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50"
              >
                🚕 Rental Booking
              </button>
              <button
                onClick={() => {
                  setCreateModalType('manual')
                  setShowAddDropdown(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg"
              >
                🚖 Manual Ride
              </button>
            </div>
            )}
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      {metricsError ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-yellow-800 font-medium mb-2">Database Setup Required</p>
              <p className="text-yellow-700 text-sm mb-2">
                {metricsError.message || 'Error loading metrics. Please check your Supabase connection.'}
              </p>
              <div className="text-sm text-yellow-600 mt-2">
                <p className="font-medium mb-1">To fix this:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to your Supabase Dashboard → SQL Editor</li>
                  <li>Run the migration files in order:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><code className="bg-yellow-100 px-1 rounded">database/01_schema.sql</code></li>
                      <li><code className="bg-yellow-100 px-1 rounded">database/02_functions.sql</code></li>
                      <li><code className="bg-yellow-100 px-1 rounded">database/03_triggers.sql</code></li>
                    </ul>
                  </li>
                  <li>Refresh this page after running migrations</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Active Trips"
            value={metricsLoading ? '...' : metrics?.active_trips || 0}
            icon="🚗"
            variant="primary"
            onClick={() => handleCardClick('status', TRIP_STATUSES.ASSIGNED)}
          />
          <MetricCard
            title="Due Next 60 Min"
            value={bookingsLoading ? '...' : calculatedMetrics.dueNext60Min}
            icon="⏰"
            variant="warning"
            onClick={() => handleCardClick('status', TRIP_STATUSES.CREATED)}
          />
          <MetricCard
            title="Due Today"
            value={bookingsLoading ? '...' : calculatedMetrics.dueToday}
            icon="📅"
            variant="info"
            onClick={() => handleCardClick('status', TRIP_STATUSES.CREATED)}
          />
          <MetricCard
            title="Due Tomorrow"
            value={metricsLoading ? '...' : metrics?.due_tomorrow || 0}
            icon="📆"
            variant="info"
          />
          <MetricCard
            title="Cancelled/No-Show"
            value={metricsLoading ? '...' : metrics?.cancelled_no_show || 0}
            icon="❌"
            onClick={() => handleCardClick('status', TRIP_STATUSES.CANCELLED)}
          />
          <MetricCard
            title="Total Rides Today"
            value={metricsLoading ? '...' : metrics?.total_rides_today || 0}
            icon="📊"
          />
          <MetricCard
            title="Total KM Today"
            value={metricsLoading ? '...' : `${(metrics?.total_km_today || 0).toFixed(1)} km`}
            icon="🛣️"
          />
          <MetricCard
            title="Total Revenue"
            value={metricsLoading ? '...' : formatCurrency(metrics?.total_revenue_today || 0)}
            icon="💰"
            variant="primary"
          />
        </div>
      )}

      {/* Filters */}
      <FiltersBar filters={filters} onFiltersChange={setFilters} />

      {/* Booking Summary Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">Booking Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Airport Bookings"
            value={bookingsLoading ? '...' : `${bookingSummary.airport.today} today, ${bookingSummary.airport.upcoming} upcoming`}
            icon="✈️"
            variant="info"
            onClick={() => handleCardClick('type', 'airport')}
          />
          <MetricCard
            title="Subscriptions"
            value={bookingsLoading ? '...' : `${bookingSummary.subscriptions.today} today, ${bookingSummary.subscriptions.upcoming} upcoming`}
            icon="🔄"
            variant="primary"
            onClick={() => handleCardClick('type', 'subscription')}
          />
          <MetricCard
            title="Rentals"
            value={bookingsLoading ? '...' : `${bookingSummary.rentals.today} today, ${bookingSummary.rentals.upcoming} upcoming`}
            icon="🚕"
            variant="warning"
            onClick={() => handleCardClick('type', 'rental')}
          />
          <MetricCard
            title="Manual Rides"
            value={bookingsLoading ? '...' : `${bookingSummary.manual.today} today, ${bookingSummary.manual.upcoming} upcoming`}
            icon="🚖"
            variant="info"
            onClick={() => handleCardClick('type', 'manual')}
          />
        </div>
      </div>

      {/* All Bookings List */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">All Bookings (Today & Future)</h2>
        <TripsTable
          trips={bookings || []}
          onRowClick={handleRowClick}
          isLoading={bookingsLoading}
        />
      </div>

      {/* Trip Details Drawer */}
      <TripDrawer
        trip={selectedTrip}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedTrip(null)
        }}
      />

      {/* Create Modals */}
      <CreateAirportBookingModal
        isOpen={createModalType === 'airport'}
        onClose={() => {
          setCreateModalType(null)
          setShowAddDropdown(false)
        }}
      />
      <CreateSubscriptionModal
        isOpen={createModalType === 'subscription_booking'}
        onClose={() => {
          setCreateModalType(null)
          setShowAddDropdown(false)
        }}
      />
      <CreateRentalBookingModal
        isOpen={createModalType === 'rental'}
        onClose={() => {
          setCreateModalType(null)
          setShowAddDropdown(false)
        }}
      />
      <CreateManualRideModal
        isOpen={createModalType === 'manual'}
        onClose={() => {
          setCreateModalType(null)
          setShowAddDropdown(false)
        }}
      />
    </div>
  )
}

