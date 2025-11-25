import { useState, useMemo } from 'react'
import { StatusBadge } from './StatusBadge'
import type { TripListItem } from '../../hooks/useTodayTrips'
import { TRIP_TYPES } from '../../utils/constants'

interface TripsTableProps {
  trips: TripListItem[]
  onRowClick?: (trip: TripListItem) => void
  isLoading?: boolean
}

type SortColumn = 'created_at' | 'start_time' | 'type' | 'hub_name' | 'route' | 'customer_name' | 'driver_name' | 'vehicle_reg' | 'status' | 'fare'
type SortDirection = 'asc' | 'desc'

export function TripsTable({ trips, onRowClick, isLoading }: TripsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('start_time')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    try {
      const date = new Date(timeStr)
      const today = new Date()
      const isToday = date.toDateString() === today.toDateString()
      
      if (isToday) {
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      } else {
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' +
               date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }
    } catch {
      return timeStr
    }
  }

  const formatFare = (fare: number | null) => {
    if (fare === null) return '-'
    return `₹${(fare / 100).toFixed(2)}`
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case TRIP_TYPES.SUBSCRIPTION:
        return 'Subscription'
      case TRIP_TYPES.AIRPORT:
        return 'Airport'
      case TRIP_TYPES.RENTAL:
        return 'Rental'
      case TRIP_TYPES.MANUAL:
        return 'Manual Ride'
      default:
        return type
    }
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedTrips = useMemo(() => {
    const sorted = [...trips]
    
    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'created_at':
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0
          break
        case 'start_time':
          aValue = a.start_time ? new Date(a.start_time).getTime() : 0
          bValue = b.start_time ? new Date(b.start_time).getTime() : 0
          break
        case 'type':
          aValue = getTypeLabel(a.type)
          bValue = getTypeLabel(b.type)
          break
        case 'hub_name':
          aValue = a.hub_name || ''
          bValue = b.hub_name || ''
          break
        case 'route':
          aValue = a.route || ''
          bValue = b.route || ''
          break
        case 'customer_name':
          aValue = a.customer_name || ''
          bValue = b.customer_name || ''
          break
        case 'driver_name':
          aValue = a.driver_name || ''
          bValue = b.driver_name || ''
          break
        case 'vehicle_reg':
          aValue = a.vehicle_reg || ''
          bValue = b.vehicle_reg || ''
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'fare':
          aValue = a.fare || 0
          bValue = b.fare || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [trips, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <span className="ml-1 text-gray-400">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      )
    }
    return (
      <span className="ml-1 text-gray-700">
        {sortDirection === 'asc' ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    )
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

  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No bookings found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                onClick={() => handleSort('created_at')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Booking Created
                  <SortIcon column="created_at" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('start_time')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Start Time
                  <SortIcon column="start_time" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('type')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Type
                  <SortIcon column="type" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('hub_name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Hub
                  <SortIcon column="hub_name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('route')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Route
                  <SortIcon column="route" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('customer_name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Customer
                  <SortIcon column="customer_name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('driver_name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Driver
                  <SortIcon column="driver_name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('vehicle_reg')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Vehicle
                  <SortIcon column="vehicle_reg" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Status
                  <SortIcon column="status" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('fare')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Fare
                  <SortIcon column="fare" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTrips.map((trip) => (
              <tr
                key={trip.id}
                onClick={() => onRowClick?.(trip)}
                className={onRowClick ? 'hover:bg-gray-50 cursor-pointer transition-colors' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(trip.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(trip.start_time)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getTypeLabel(trip.type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {trip.hub_name || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {trip.route || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {trip.customer_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {trip.driver_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {trip.vehicle_reg || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={trip.status} size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatFare(trip.fare)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

