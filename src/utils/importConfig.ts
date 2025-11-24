// Import configuration for each table
export interface TableField {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'uuid'
  required: boolean
  description?: string
}

export interface ImportTableConfig {
  tableName: string
  label: string
  fields: TableField[]
}

export const IMPORT_TABLES: ImportTableConfig[] = [
  {
    tableName: 'customers',
    label: 'Customers',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'phone', label: 'Phone', type: 'string', required: false },
      { name: 'email', label: 'Email', type: 'string', required: false },
      { name: 'notes', label: 'Notes', type: 'string', required: false },
    ],
  },
  {
    tableName: 'drivers',
    label: 'Drivers',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'phone', label: 'Phone', type: 'string', required: true },
      { name: 'driver_id', label: 'Driver ID', type: 'string', required: false },
      { name: 'status', label: 'Status', type: 'string', required: false, description: 'active, inactive, on_leave' },
      { name: 'hub_id', label: 'Hub ID', type: 'uuid', required: false },
    ],
  },
  {
    tableName: 'vehicles',
    label: 'Vehicles',
    fields: [
      { name: 'reg_no', label: 'Registration Number', type: 'string', required: true },
      { name: 'make', label: 'Make', type: 'string', required: false },
      { name: 'model', label: 'Model', type: 'string', required: false },
      { name: 'seats', label: 'Seats', type: 'number', required: false },
      { name: 'status', label: 'Status', type: 'string', required: false, description: 'available, assigned, maintenance, inactive' },
      { name: 'current_hub_id', label: 'Hub ID', type: 'uuid', required: false },
    ],
  },
  {
    tableName: 'airport_bookings',
    label: 'Airport Bookings',
    fields: [
      { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true },
      { name: 'flight_no', label: 'Flight Number', type: 'string', required: false },
      { name: 'pickup_at', label: 'Pickup At', type: 'date', required: true },
      { name: 'pickup', label: 'Pickup Location', type: 'string', required: true },
      { name: 'drop', label: 'Drop Location', type: 'string', required: true },
      { name: 'est_km', label: 'Estimated KM', type: 'number', required: false },
      { name: 'fare', label: 'Fare (paise)', type: 'number', required: false },
      { name: 'status', label: 'Status', type: 'string', required: false, description: 'created, assigned, enroute, completed, no_show, cancelled' },
      { name: 'driver_id', label: 'Driver ID', type: 'uuid', required: false },
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'uuid', required: false },
      { name: 'notes', label: 'Notes', type: 'string', required: false },
    ],
  },
  {
    tableName: 'rental_bookings',
    label: 'Rental Bookings',
    fields: [
      { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true },
      { name: 'package_hours', label: 'Package Hours', type: 'number', required: false },
      { name: 'package_km', label: 'Package KM', type: 'number', required: false },
      { name: 'start_at', label: 'Start At', type: 'date', required: true },
      { name: 'end_at', label: 'End At', type: 'date', required: true },
      { name: 'est_km', label: 'Estimated KM', type: 'number', required: false },
      { name: 'extra_km_rate', label: 'Extra KM Rate (paise)', type: 'number', required: false },
      { name: 'per_hour_rate', label: 'Per Hour Rate (paise)', type: 'number', required: false },
      { name: 'fare', label: 'Fare (paise)', type: 'number', required: false },
      { name: 'status', label: 'Status', type: 'string', required: false, description: 'created, assigned, enroute, completed, no_show, cancelled' },
      { name: 'driver_id', label: 'Driver ID', type: 'uuid', required: false },
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'uuid', required: false },
      { name: 'notes', label: 'Notes', type: 'string', required: false },
    ],
  },
  {
    tableName: 'manual_rides',
    label: 'Manual Rides',
    fields: [
      { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true },
      { name: 'pickup_at', label: 'Pickup At', type: 'date', required: true },
      { name: 'pickup', label: 'Pickup Location', type: 'string', required: true },
      { name: 'drop', label: 'Drop Location', type: 'string', required: true },
      { name: 'est_km', label: 'Estimated KM', type: 'number', required: false },
      { name: 'fare', label: 'Fare (paise)', type: 'number', required: false },
      { name: 'status', label: 'Status', type: 'string', required: false, description: 'created, assigned, enroute, completed, no_show, cancelled' },
      { name: 'driver_id', label: 'Driver ID', type: 'uuid', required: false },
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'uuid', required: false },
      { name: 'hub_id', label: 'Hub ID', type: 'uuid', required: false },
      { name: 'notes', label: 'Notes', type: 'string', required: false },
    ],
  },
  {
    tableName: 'hubs',
    label: 'Hubs',
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true },
      { name: 'city', label: 'City', type: 'string', required: false },
      { name: 'lat', label: 'Latitude', type: 'number', required: false },
      { name: 'lng', label: 'Longitude', type: 'number', required: false },
    ],
  },
  {
    tableName: 'subscriptions',
    label: 'Subscriptions',
    fields: [
      { name: 'customer_id', label: 'Customer ID', type: 'uuid', required: true },
      { name: 'client_name', label: 'Client Name', type: 'string', required: false },
      { name: 'client_mobile', label: 'Client Mobile No', type: 'string', required: false },
      { name: 'plan_id', label: 'Plan ID', type: 'uuid', required: false },
      { name: 'start_date', label: 'Subscription Date', type: 'date', required: true },
      { name: 'subscription_month', label: 'Subscription Month', type: 'number', required: false, description: '1-12' },
      { name: 'subscription_year', label: 'Subscription Year', type: 'number', required: false, description: 'e.g., 2025' },
      { name: 'end_date', label: 'Subscription Validity Date', type: 'date', required: false },
      { name: 'no_of_days', label: 'No of Days', type: 'number', required: false },
      { name: 'distance_km', label: 'Total KMs', type: 'number', required: false },
      { name: 'pickup', label: 'Pick Location', type: 'string', required: true },
      { name: 'pickup_time', label: 'Pickup Location Time', type: 'string', required: false, description: 'HH:MM:SS format' },
      { name: 'drop', label: 'Drop Location', type: 'string', required: true },
      { name: 'subscription_amount', label: 'Subscription Amount (paise)', type: 'number', required: false },
      { name: 'amount_paid_date', label: 'Subscription Amount Paid Date', type: 'date', required: false },
      { name: 'invoice_no', label: 'Subscription Amount Invoice No', type: 'string', required: false },
      { name: 'hub_id', label: 'Hub ID', type: 'uuid', required: false },
      { name: 'status', label: 'Status', type: 'string', required: false, description: 'active, paused, cancelled, expired' },
      { name: 'preferred_days', label: 'Preferred Days', type: 'string', required: false, description: 'Mon-Fri, Mon-Sat, Mon-Sun' },
      { name: 'remarks', label: 'Remarks', type: 'string', required: false },
    ],
  },
]

export function getTableConfig(tableName: string): ImportTableConfig | undefined {
  return IMPORT_TABLES.find((t) => t.tableName === tableName)
}

