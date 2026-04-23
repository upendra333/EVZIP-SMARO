// EVZIP Ops Console - Constants

import { PERMISSIONS } from './permissions'

export const BRAND_COLORS = {
  primary: '#6dc7ae',
  text: '#141339',
} as const

export const ROUTES = {
  DASHBOARD: '/',
  SUBSCRIPTIONS: '/subscriptions',
  AIRPORT: '/airport',
  RENTALS: '/rentals',
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

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: '📊', permission: PERMISSIONS.VIEW_DASHBOARD },
  { name: 'Ride Hailing', path: ROUTES.RIDE_HAILING, icon: '🚕', permission: PERMISSIONS.VIEW_RIDE_HAILING },
  { name: 'Reports', path: ROUTES.REPORTS, icon: '📈', permission: PERMISSIONS.VIEW_REPORTS },
  { name: 'Analytics', path: ROUTES.ANALYTICS, icon: '📊', permission: PERMISSIONS.VIEW_ANALYTICS },
  { name: 'Data Management', path: ROUTES.DATA_MANAGEMENT, icon: '🗂️', permission: PERMISSIONS.VIEW_CUSTOMERS },
  { name: 'Imports', path: ROUTES.IMPORTS, icon: '📥', permission: PERMISSIONS.VIEW_IMPORTS },
  { name: 'Audit', path: ROUTES.AUDIT, icon: '📋', permission: PERMISSIONS.VIEW_AUDIT },
  { name: 'Role & Permissions', path: ROUTES.ROLE_PERMISSIONS, icon: '🔐', permission: PERMISSIONS.MANAGE_PERMISSIONS },
  { name: 'User Management', path: ROUTES.USER_MANAGEMENT, icon: '👥', permission: PERMISSIONS.MANAGE_USERS },
] as const

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
  MANUAL: 'manual',
} as const

export const ROLES = {
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager',
  READ_ONLY: 'read_only',
  ADMIN: 'admin',
} as const

