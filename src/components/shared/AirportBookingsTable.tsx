import { StatusBadge } from './StatusBadge'
import type { AirportBooking } from '../../hooks/useAirportBookings'

interface AirportBookingsTableProps {
  bookings: AirportBooking[]
  onRowClick?: (booking: AirportBooking) => void
  isLoading?: boolean
}

export function AirportBookingsTable({ bookings, onRowClick, isLoading }: AirportBookingsTableProps) {
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatFare = (fare: number | null) => {
    if (fare === null) return '-'
    return `₹${(fare / 100).toFixed(2)}`
  }

  const isUpcoming = (pickupAt: string) => {
    try {
      const pickup = new Date(pickupAt)
      const now = new Date()
      const diff = pickup.getTime() - now.getTime()
      return diff > 0 && diff <= 60 * 60 * 1000 // Next 60 minutes
    } catch {
      return false
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No airport bookings found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pickup Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flight No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pickup → Drop
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Est. Km
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fare
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => {
              const upcoming = isUpcoming(booking.pickup_at)
              return (
                <tr
                  key={booking.id}
                  onClick={() => onRowClick?.(booking)}
                  className={`
                    ${onRowClick ? 'hover:bg-gray-50 cursor-pointer transition-colors' : ''}
                    ${upcoming ? 'bg-yellow-50' : ''}
                  `}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDateTime(booking.pickup_at)}</div>
                    {upcoming && (
                      <div className="text-xs text-yellow-600 font-medium">Due Soon</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.flight_no || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.customer?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {booking.customer?.phone || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">
                      {booking.pickup} → {booking.drop}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.est_km ? `${booking.est_km} km` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.driver?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.vehicle?.reg_no || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={booking.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatFare(booking.fare)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

