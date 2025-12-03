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
  const { error: metricsError } = useTodayMetrics() // Keep for error display
  
  // Fetch all bookings for stats calculation (no filters)
  // Will automatically show incomplete trips from yesterday for all users
  const { data: allBookingsForStats } = useAllBookings({})
  
  // Fetch filtered bookings for table display
  // Will automatically show incomplete trips from yesterday for all users
  const { data: bookings, isLoading: bookingsLoading } = useAllBookings({
    type: filters.type,
    status: filters.status,
    driver: filters.driver,
    vehicle: filters.vehicle,
    dueNext60Min: filters.dueNext60Min,
    dueToday: filters.dueToday,
    dueTomorrow: filters.dueTomorrow,
    // Don't pass includePastIncomplete - will show yesterday's incomplete trips for all users
    // Older trips will only show in Data Management for managers/admins
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

  // Calculate all dashboard stats from all bookings data (unfiltered)
  const dashboardStats = useMemo(() => {
    const bookingsForStats = allBookingsForStats || []
    if (!bookingsForStats || bookingsForStats.length === 0) {
      return {
        // Today Overview
        totalRidesToday: 0,
        totalKmToday: 0,
        totalRevenueToday: 0,
        // Bookings Overview
        dueNext60Min: 0,
        dueToday: 0,
        dueTomorrow: 0,
        // Status Overview
        active: 0,
        yetToAssign: 0,
        cancelledNoShow: 0,
      }
    }

    const now = new Date()
    const next60Min = new Date(now.getTime() + 60 * 60 * 1000) // 60 minutes from now
    
    // Get today's start and end times
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = new Date(today)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Get tomorrow's start and end times
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStart = new Date(tomorrow)
    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    let totalRidesToday = 0
    let totalKmToday = 0
    let totalRevenueToday = 0
    let dueNext60Min = 0
    let dueToday = 0
    let dueTomorrow = 0
    let active = 0
    let yetToAssign = 0
    let cancelledNoShow = 0

    bookingsForStats.forEach((booking) => {
      // Parse the start_time
      const startTime = booking.start_time ? new Date(booking.start_time) : null
      const isToday = startTime && startTime >= todayStart && startTime <= todayEnd
      const isTomorrow = startTime && startTime >= tomorrowStart && startTime <= tomorrowEnd

      // Today Overview - count all bookings for today
      if (isToday) {
        totalRidesToday++
        // Add revenue (fare is in paise)
        if (booking.fare) {
          totalRevenueToday += booking.fare
        }
        // Add KM (use actual_km if available, otherwise est_km)
        // Use nullish coalescing to properly handle 0 values (only fallback on null/undefined)
        const km = booking.actual_km ?? booking.est_km ?? 0
        // Convert to number, handling string values and null/undefined
        const kmValue = typeof km === 'number' ? km : (typeof km === 'string' ? parseFloat(km) || 0 : 0)
        if (isNaN(kmValue)) {
          console.warn('Invalid km value for booking:', booking.id, 'km:', km)
        }
        totalKmToday += kmValue
      }

      // Bookings Overview - show trips based on start time, excluding cancelled/no-show
      const isNotCancelled = booking.status !== TRIP_STATUSES.CANCELLED && booking.status !== TRIP_STATUSES.NO_SHOW
      
      if (isNotCancelled && startTime) {
        // Due next 60 minutes - show trips with start time within next 60 min (regardless of status)
        if (startTime >= now && startTime <= next60Min) {
          dueNext60Min++
        }
        
        // Due today - only count trips which are created (not started yet) and have start time today
        if (booking.status === TRIP_STATUSES.CREATED && isToday) {
          dueToday++
        }
        
        // Due tomorrow - show all trips which have start time tomorrow (regardless of status, excluding cancelled/no-show)
        if (isTomorrow) {
          dueTomorrow++
        }
      }

      // Status Overview
      // Active trips should only show trips which are enroute (not assigned)
      if (booking.status === TRIP_STATUSES.ENROUTE) {
        active++
      } else if (booking.status === TRIP_STATUSES.CREATED || booking.status === TRIP_STATUSES.ASSIGNED) {
        yetToAssign++
      } else if (booking.status === TRIP_STATUSES.CANCELLED || booking.status === TRIP_STATUSES.NO_SHOW) {
        cancelledNoShow++
      }
    })

    return {
      totalRidesToday,
      totalKmToday,
      totalRevenueToday,
      dueNext60Min,
      dueToday,
      dueTomorrow,
      active,
      yetToAssign,
      cancelledNoShow,
    }
  }, [allBookingsForStats])

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Today Overview Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Today Overview</h2>
            <div className="space-y-4">
              <MetricCard
                title="Total Rides"
                value={allBookingsForStats === undefined ? '...' : dashboardStats.totalRidesToday}
                icon="📊"
                variant="primary"
                onClick={() => {
                  // Clear all filters and show all bookings
                  setFilters({})
                }}
              />
              <MetricCard
                title="Total Km"
                value={allBookingsForStats === undefined ? '...' : `${dashboardStats.totalKmToday.toFixed(1)} km`}
                icon="🛣️"
                variant="info"
                onClick={() => {
                  // Clear all filters and show all bookings
                  setFilters({})
                }}
              />
              <MetricCard
                title="Total Revenue"
                value={allBookingsForStats === undefined ? '...' : formatCurrency(dashboardStats.totalRevenueToday)}
                icon="💰"
                variant="primary"
                onClick={() => {
                  // Clear all filters and show all bookings
                  setFilters({})
                }}
              />
            </div>
          </div>

          {/* Bookings Overview Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Bookings Overview</h2>
            <div className="space-y-4">
              <MetricCard
                title="Due Next 60 Min"
                value={allBookingsForStats === undefined ? '...' : dashboardStats.dueNext60Min}
                icon="⏰"
                variant="warning"
                onClick={() => {
                  // Toggle dueNext60Min filter - if already active, clear it; otherwise set it and clear other filters
                  setFilters((prev) => ({
                    ...prev,
                    dueNext60Min: prev.dueNext60Min ? undefined : true,
                    dueToday: undefined, // Clear other time filters
                    dueTomorrow: undefined, // Clear other time filters
                    status: undefined, // Clear status filter
                    type: undefined, // Clear type filter
                    driver: undefined, // Clear driver filter
                    vehicle: undefined, // Clear vehicle filter
                    customer: undefined, // Clear customer filter
                  }))
                }}
              />
              <MetricCard
                title="Due Today"
                value={allBookingsForStats === undefined ? '...' : dashboardStats.dueToday}
                icon="📅"
                variant="info"
                onClick={() => {
                  // Toggle dueToday filter - if already active, clear it; otherwise set it and clear other filters
                  setFilters((prev) => ({
                    ...prev,
                    dueToday: prev.dueToday ? undefined : true,
                    dueNext60Min: undefined, // Clear other time filters
                    dueTomorrow: undefined, // Clear other time filters
                    status: undefined, // Clear status filter
                    type: undefined, // Clear type filter
                    driver: undefined, // Clear driver filter
                    vehicle: undefined, // Clear vehicle filter
                    customer: undefined, // Clear customer filter
                  }))
                }}
              />
              <MetricCard
                title="Due Tomorrow"
                value={allBookingsForStats === undefined ? '...' : dashboardStats.dueTomorrow}
                icon="📆"
                variant="info"
                onClick={() => {
                  // Toggle dueTomorrow filter - if already active, clear it; otherwise set it and clear other filters
                  setFilters((prev) => ({
                    ...prev,
                    dueTomorrow: prev.dueTomorrow ? undefined : true,
                    dueNext60Min: undefined, // Clear other time filters
                    dueToday: undefined, // Clear other time filters
                    status: undefined, // Clear status filter
                    type: undefined, // Clear type filter
                    driver: undefined, // Clear driver filter
                    vehicle: undefined, // Clear vehicle filter
                    customer: undefined, // Clear customer filter
                  }))
                }}
              />
            </div>
          </div>

          {/* Status Overview Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Status Overview</h2>
            <div className="space-y-4">
              <MetricCard
                title="Active"
                value={allBookingsForStats === undefined ? '...' : dashboardStats.active}
                icon="🚗"
                variant="primary"
                onClick={() => {
                  // Clear all filters and show all bookings
                  setFilters({})
                }}
              />
              <MetricCard
                title="Yet to Assign"
                value={allBookingsForStats === undefined ? '...' : dashboardStats.yetToAssign}
                icon="⏳"
                variant="warning"
                onClick={() => {
                  // Clear all filters and show all bookings
                  setFilters({})
                }}
              />
              <MetricCard
                title="Cancelled/No-Show"
                value={allBookingsForStats === undefined ? '...' : dashboardStats.cancelledNoShow}
                icon="❌"
                variant="danger"
                onClick={() => {
                  // Clear all filters and show all bookings
                  setFilters({})
                }}
              />
            </div>
          </div>
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

