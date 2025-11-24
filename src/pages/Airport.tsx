import { useState } from 'react'
import { useAirportBookings, type AirportBooking } from '../hooks/useAirportBookings'
import { useHubs } from '../hooks/useHubs'
import { AirportBookingsTable } from '../components/shared/AirportBookingsTable'
import { DateRangeFilter } from '../components/shared/DateRangeFilter'
import { FiltersBar, type Filters } from '../components/shared/FiltersBar'
import { TripDrawer } from '../components/shared/TripDrawer'
import { CreateAirportBookingModal } from '../components/shared/CreateAirportBookingModal'
import type { TripListItem } from '../hooks/useTodayTrips'

export function Airport() {
  const [filters, setFilters] = useState<Filters & { dateFrom?: string; dateTo?: string; customer?: string }>({})
  const [selectedBooking, setSelectedBooking] = useState<AirportBooking | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { data: bookings, isLoading } = useAirportBookings({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    status: filters.status,
    driver: filters.driver,
    vehicle: filters.vehicle,
    customer: filters.customer,
    hub: filters.hub,
  })

  const { data: hubs } = useHubs()

  const handleRowClick = (booking: AirportBooking) => {
    setSelectedBooking(booking)
    setDrawerOpen(true)
  }

  // Convert AirportBooking to TripListItem for TripDrawer
  const tripListItem: TripListItem | null = selectedBooking
    ? {
        id: selectedBooking.trip?.id || '',
        type: 'airport',
        start_time: selectedBooking.pickup_at,
        hub_route: selectedBooking.hub?.name || `${selectedBooking.pickup} → ${selectedBooking.drop}`,
        customer_name: selectedBooking.customer?.name || null,
        driver_name: selectedBooking.driver?.name || null,
        vehicle_reg: selectedBooking.vehicle?.reg_no || null,
        status: selectedBooking.status,
        fare: selectedBooking.fare,
        ref_id: selectedBooking.id,
      }
    : null

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Airport Bookings</h1>
          <p className="text-gray-600 mt-1">Manage airport transfer bookings</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
        >
          <span>+</span> Add Booking
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={(date) => setFilters((prev) => ({ ...prev, dateFrom: date }))}
          onDateToChange={(date) => setFilters((prev) => ({ ...prev, dateTo: date }))}
          label="Pickup Date Range"
        />
      </div>

      {/* Other Filters */}
      <FiltersBar
        filters={filters}
        onFiltersChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
        hubs={hubs}
      />

      {/* Bookings Table */}
      <AirportBookingsTable
        bookings={bookings || []}
        onRowClick={handleRowClick}
        isLoading={isLoading}
      />

      {/* Trip Drawer */}
      <TripDrawer
        trip={tripListItem}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedBooking(null)
        }}
      />

      {/* Create Modal */}
      <CreateAirportBookingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}

