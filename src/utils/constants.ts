// EVZIP Ops Console - Constants

import { PERMISSIONS } from './permissions'

export const BRAND_COLORS = {
  primary: '#6dc7ae',
  text: '#141339',
} as const

export const ROUTES = {
  DASHBOARD: '/',
  RIDE_HAILING_DASHBOARD: '/dashboard',
  SUBSCRIPTIONS: '/subscriptions',
  AIRPORT: '/airport',
  RENTALS: '/rentals',
  OUTSTATION: '/bookings/outstation',
  RIDE_HAILING: '/ride-hailing',
  REPORTS: '/reports',
  ANALYTICS: '/analytics',
  IMPORTS: '/imports',
  AUDIT: '/audit',
  DATA_MANAGEMENT: '/data-management',
  ROLE_PERMISSIONS: '/role-permissions',
  USER_MANAGEMENT: '/user-management',
  LOGIN: '/login',
} as const

export type NavigationItem = {
  name: string
  path: string
  icon: string
  permission?: typeof PERMISSIONS[keyof typeof PERMISSIONS]
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { name: 'Dashboard', path: ROUTES.RIDE_HAILING_DASHBOARD, icon: '📊', permission: PERMISSIONS.VIEW_RIDE_HAILING_DASHBOARD },
  { name: 'Ride Hailing', path: ROUTES.RIDE_HAILING, icon: '🚕', permission: PERMISSIONS.VIEW_RIDE_HAILING },
  { name: 'SMARO', path: ROUTES.DASHBOARD, icon: '📊', permission: PERMISSIONS.VIEW_DASHBOARD },
  { name: 'Reports', path: ROUTES.REPORTS, icon: '📈', permission: PERMISSIONS.VIEW_REPORTS },
  { name: 'Analytics', path: ROUTES.ANALYTICS, icon: '📊', permission: PERMISSIONS.VIEW_ANALYTICS },
  { name: 'Data Management', path: ROUTES.DATA_MANAGEMENT, icon: '🗂️', permission: PERMISSIONS.VIEW_CUSTOMERS },
  { name: 'Imports', path: ROUTES.IMPORTS, icon: '📥', permission: PERMISSIONS.VIEW_IMPORTS },
  { name: 'Audit', path: ROUTES.AUDIT, icon: '📋', permission: PERMISSIONS.VIEW_AUDIT },
  { name: 'Role & Permissions', path: ROUTES.ROLE_PERMISSIONS, icon: '🔐', permission: PERMISSIONS.MANAGE_PERMISSIONS },
  { name: 'User Management', path: ROUTES.USER_MANAGEMENT, icon: '👥', permission: PERMISSIONS.VIEW_USERS },
]

export const TRIP_STATUSES = {
  CREATED: 'created',
  ASSIGNED: 'assigned',
  ENROUTE: 'enroute',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
} as const

export const TRIP_TYPES = {
  SUBSCRIPTION: 'subscription',
  AIRPORT: 'airport',
  RENTAL: 'rental',
  OUTSTATION: 'outstation',
  MANUAL: 'manual',
} as const

/** DB table backing this trip type (excluding trip row itself). */
export function bookingTableFromTripType(tripType: string): string {
  switch (tripType) {
    case TRIP_TYPES.SUBSCRIPTION:
      return 'subscription_rides'
    case TRIP_TYPES.AIRPORT:
      return 'airport_bookings'
    case TRIP_TYPES.RENTAL:
      return 'rental_bookings'
    case TRIP_TYPES.OUTSTATION:
      return 'outstation_bookings'
    case TRIP_TYPES.MANUAL:
      return 'manual_rides'
    default:
      return 'manual_rides'
  }
}

export function tripUsesStartEndRange(tripType: string): boolean {
  return tripType === TRIP_TYPES.RENTAL || tripType === TRIP_TYPES.OUTSTATION
}

export const ROLES = {
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager',
  READ_ONLY: 'read_only',
  ADMIN: 'admin',
} as const

