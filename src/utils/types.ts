// EVZIP Ops Console - Type Definitions

export type TripStatus = 'created' | 'assigned' | 'enroute' | 'completed' | 'no_show' | 'cancelled'
export type TripType = 'subscription' | 'airport' | 'rental'
export type Role = 'supervisor' | 'manager' | 'read_only' | 'admin'

export interface Operator {
  name: string
  role: Role
}

export interface NavigationItem {
  name: string
  path: string
  icon: string
}

export interface Hub {
  id: string
  name: string
  city: string | null
  lat: number | null
  lng: number | null
}

export interface Driver {
  id: string
  name: string
  phone: string
  license_no: string | null
  status: string
  hub_id: string | null
}

export interface Vehicle {
  id: string
  reg_no: string
  make: string | null
  model: string | null
  seats: number
  current_hub_id: string | null
  status: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}

