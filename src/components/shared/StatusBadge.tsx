import { TRIP_STATUSES } from '../../utils/constants'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2',
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case TRIP_STATUSES.CREATED:
        return 'bg-gray-100 text-gray-700'
      case TRIP_STATUSES.ASSIGNED:
        return 'bg-blue-100 text-blue-700'
      case TRIP_STATUSES.ENROUTE:
        return 'bg-yellow-100 text-yellow-700'
      case TRIP_STATUSES.COMPLETED:
        return 'bg-green-100 text-green-700'
      case TRIP_STATUSES.NO_SHOW:
        return 'bg-orange-100 text-orange-700'
      case TRIP_STATUSES.CANCELLED:
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${sizeClasses[size]}
        ${getStatusColor(status)}
      `}
    >
      {status.replace('_', ' ').toUpperCase()}
    </span>
  )
}

