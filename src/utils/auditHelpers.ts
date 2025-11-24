import type { AuditLogEntry } from '../hooks/useAuditLogs'

export function formatAuditSummary(entry: AuditLogEntry): string {
  const { action, diff_json } = entry

  if (!diff_json || typeof diff_json !== 'object') {
    return action.charAt(0).toUpperCase() + action.slice(1)
  }

  // Check for status change
  if (diff_json.status || diff_json.old_status || diff_json.new_status) {
    const oldStatus = diff_json.old_status || diff_json.status?.before || diff_json.status?.[0]
    const newStatus = diff_json.new_status || diff_json.status?.after || diff_json.status?.[1]
    if (oldStatus && newStatus) {
      return `Status: ${oldStatus} → ${newStatus}`
    }
  }

  // Check for price override
  if (diff_json.fare || diff_json.old_fare || diff_json.new_fare) {
    const oldFare = diff_json.old_fare || diff_json.fare?.before
    const newFare = diff_json.new_fare || diff_json.fare?.after
    if (oldFare !== undefined && newFare !== undefined && oldFare !== newFare) {
      return `Price override: ₹${(oldFare / 100).toFixed(2)} → ₹${(newFare / 100).toFixed(2)}`
    }
  }

  // Check for driver assignment
  if (diff_json.driver_id || diff_json.driver_name) {
    const oldDriver = diff_json.old_driver_id || diff_json.driver_id?.before
    const newDriver = diff_json.new_driver_id || diff_json.driver_id?.after
    if (oldDriver !== newDriver) {
      return newDriver ? 'Driver assigned' : 'Driver unassigned'
    }
  }

  // Check for vehicle assignment
  if (diff_json.vehicle_id || diff_json.vehicle_reg) {
    const oldVehicle = diff_json.old_vehicle_id || diff_json.vehicle_id?.before
    const newVehicle = diff_json.new_vehicle_id || diff_json.vehicle_id?.after
    if (oldVehicle !== newVehicle) {
      return newVehicle ? 'Vehicle assigned' : 'Vehicle unassigned'
    }
  }

  // Generic update with changed fields
  const changedFields = Object.keys(diff_json).filter((key) => {
    const value = diff_json[key]
    if (typeof value === 'object' && value !== null) {
      return value.before !== value.after
    }
    return true
  })

  if (changedFields.length > 0) {
    if (changedFields.length === 1) {
      return `Updated: ${changedFields[0]}`
    }
    return `Updated: ${changedFields.length} fields`
  }

  return action.charAt(0).toUpperCase() + action.slice(1)
}

export function formatDiffJson(diffJson: Record<string, any> | null): {
  before: Record<string, any>
  after: Record<string, any>
  changedFields: string[]
  isDelete: boolean
  isCreate: boolean
} {
  if (!diffJson || typeof diffJson !== 'object') {
    return { before: {}, after: {}, changedFields: [], isDelete: false, isCreate: false }
  }

  const before: Record<string, any> = {}
  const after: Record<string, any> = {}
  const changedFields: string[] = []
  let isDelete = false
  let isCreate = false

  // Handle database trigger format: {old: {...}, new: {...}} or {old: {...}} or {new: {...}}
  if ('old' in diffJson || 'new' in diffJson) {
    const oldData = diffJson.old || {}
    const newData = diffJson.new || {}
    
    isDelete = !!diffJson.old && !diffJson.new
    isCreate = !!diffJson.new && !diffJson.old

    // Get all unique keys from both old and new
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

    allKeys.forEach((key) => {
      const oldValue = oldData[key]
      const newValue = newData[key]
      
      before[key] = oldValue !== undefined ? oldValue : null
      after[key] = newValue !== undefined ? newValue : null
      
      // Check if value changed
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key)
      }
    })
  } else {
    // Handle application format: {field: {before: X, after: Y}}
    Object.keys(diffJson).forEach((key) => {
      const value = diffJson[key]

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle { before: X, after: Y } format
        if ('before' in value || 'after' in value) {
          before[key] = value.before ?? null
          after[key] = value.after ?? null
          if (JSON.stringify(value.before) !== JSON.stringify(value.after)) {
            changedFields.push(key)
          }
        } else {
          // Handle nested objects (treat as unchanged)
          before[key] = value
          after[key] = value
        }
      } else {
        // Handle simple values or arrays
        before[key] = value
        after[key] = value
      }
    })
  }

  return { before, after, changedFields, isDelete, isCreate }
}

