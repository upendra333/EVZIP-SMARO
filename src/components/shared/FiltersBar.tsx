import { TRIP_TYPES, TRIP_STATUSES } from '../../utils/constants'

export interface Filters {
  type?: string
  status?: string
  hub?: string
  driver?: string
  vehicle?: string
  customer?: string
}

interface FiltersBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  hubs?: Array<{ id: string; name: string }>
  drivers?: Array<{ id: string; name: string }>
  vehicles?: Array<{ id: string; reg_no: string }>
}

export function FiltersBar({ filters, onFiltersChange }: FiltersBarProps) {
  const updateFilter = (key: keyof Filters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <select
            value={filters.type || ''}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Types</option>
            <option value={TRIP_TYPES.SUBSCRIPTION}>Subscription</option>
            <option value={TRIP_TYPES.AIRPORT}>Airport</option>
            <option value={TRIP_TYPES.RENTAL}>Rental</option>
            <option value={TRIP_TYPES.MANUAL}>Manual Ride</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value={TRIP_STATUSES.CREATED}>Created</option>
            <option value={TRIP_STATUSES.ASSIGNED}>Assigned</option>
            <option value={TRIP_STATUSES.ENROUTE}>Enroute</option>
            <option value={TRIP_STATUSES.COMPLETED}>Completed</option>
            <option value={TRIP_STATUSES.NO_SHOW}>No Show</option>
            <option value={TRIP_STATUSES.CANCELLED}>Cancelled</option>
          </select>
        </div>

        {/* Driver Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
          <input
            type="text"
            value={filters.driver || ''}
            onChange={(e) => updateFilter('driver', e.target.value)}
            placeholder="Search driver..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Vehicle Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
          <input
            type="text"
            value={filters.vehicle || ''}
            onChange={(e) => updateFilter('vehicle', e.target.value)}
            placeholder="Search vehicle..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Customer Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
          <input
            type="text"
            value={filters.customer || ''}
            onChange={(e) => updateFilter('customer', e.target.value)}
            placeholder="Search customer..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.type || filters.status || filters.driver || filters.vehicle || filters.customer) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onFiltersChange({})}
            className="text-sm text-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}

