import { useState } from 'react'
import { useSubscriptionRides, type SubscriptionRide } from '../hooks/useSubscriptionRides'
import { useHubs } from '../hooks/useHubs'
import { SubscriptionRidesTable } from '../components/shared/SubscriptionRidesTable'
import { DateRangeFilter } from '../components/shared/DateRangeFilter'
import { FiltersBar, type Filters } from '../components/shared/FiltersBar'
import { TripDrawer } from '../components/shared/TripDrawer'
import type { TripListItem } from '../hooks/useTodayTrips'

export function Subscriptions() {
  const [filters, setFilters] = useState<Filters & { dateFrom?: string; dateTo?: string; customer?: string }>({})
  const [selectedRide, setSelectedRide] = useState<SubscriptionRide | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: rides, isLoading } = useSubscriptionRides({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    status: filters.status,
    driver: filters.driver,
    vehicle: filters.vehicle,
    customer: filters.customer,
    hub: filters.hub,
  })

  const { data: hubs } = useHubs()

  const handleRowClick = (ride: SubscriptionRide) => {
    setSelectedRide(ride)
    setDrawerOpen(true)
  }

  // Convert SubscriptionRide to TripListItem for TripDrawer
  const tripListItem: TripListItem | null = selectedRide
    ? {
        id: selectedRide.trip?.id || '',
        type: 'subscription',
        created_at: (selectedRide as any).created_at || null,
        start_time: selectedRide.date ? `${selectedRide.date}T09:00:00` : null,
        hub_route: selectedRide.subscription?.hub?.name || `${selectedRide.subscription?.pickup} → ${selectedRide.subscription?.drop}`,
        hub_name: selectedRide.subscription?.hub?.name || null,
        route: selectedRide.subscription ? `${selectedRide.subscription.pickup} → ${selectedRide.subscription.drop}` : null,
        customer_name: selectedRide.subscription?.customer?.name || null,
        driver_name: selectedRide.driver?.name || null,
        vehicle_reg: selectedRide.vehicle?.reg_no || null,
        status: selectedRide.status,
        fare: selectedRide.fare,
        ref_id: selectedRide.id,
      }
    : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Subscriptions</h1>
        <p className="text-gray-600 mt-1">View subscription rides</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={(date) => setFilters((prev) => ({ ...prev, dateFrom: date }))}
          onDateToChange={(date) => setFilters((prev) => ({ ...prev, dateTo: date }))}
          label="Date Range"
        />
      </div>

      {/* Other Filters */}
      <FiltersBar
        filters={filters}
        onFiltersChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
        hubs={hubs}
      />

      {/* Rides Table */}
      <SubscriptionRidesTable
        rides={rides || []}
        onRowClick={handleRowClick}
        isLoading={isLoading}
      />

      {/* Trip Drawer */}
      <TripDrawer
        trip={tripListItem}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedRide(null)
        }}
      />
    </div>
  )
}

