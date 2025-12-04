import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ImportTableConfig } from '../utils/importConfig'

export interface ValidationError {
  row: number
  field: string
  message: string
}

export interface ImportResult {
  success: boolean
  inserted: number
  errors: ValidationError[]
}

export function useImport() {
  const [isImporting, setIsImporting] = useState(false)

  const validateRow = (
    row: Record<string, any>,
    rowIndex: number,
    config: ImportTableConfig,
    mapping: Record<string, string>
  ): ValidationError[] => {
    const errors: ValidationError[] = []

    config.fields.forEach((field) => {
      const csvColumn = Object.keys(mapping).find((key) => mapping[key] === field.name)
      let value = csvColumn ? row[csvColumn] : undefined
      
      // Trim whitespace for string values
      if (value !== undefined && typeof value === 'string') {
        value = value.trim()
      }

      // Treat common placeholder values as empty for optional fields
      const placeholderValues = ['null', 'NULL', 'None', 'NONE', 'N/A', 'n/a', '-', '--', '']
      const isEmptyValue = !value || value === '' || (typeof value === 'string' && placeholderValues.includes(value.trim()))

      // Check required fields (after trimming and checking placeholders)
      if (field.required && isEmptyValue) {
        errors.push({
          row: rowIndex + 1,
          field: field.name,
          message: `${field.label} is required`,
        })
      }

      // Validate types only if value is present and not empty (after trimming and checking placeholders)
      // For optional fields, skip validation if empty
      if (value !== undefined && !isEmptyValue) {
        switch (field.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push({
                row: rowIndex + 1,
                field: field.name,
                message: `${field.label} must be a number`,
              })
            }
            break
          case 'date':
            const date = new Date(value)
            if (isNaN(date.getTime())) {
              errors.push({
                row: rowIndex + 1,
                field: field.name,
                message: `${field.label} must be a valid date`,
              })
            }
            break
          case 'uuid':
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            const uuidValue = String(value).trim()
            // For optional UUID fields, if empty, placeholder, or invalid format, skip validation (treat as empty)
            // Only validate if there's an actual non-empty UUID value that matches the format
            if (uuidValue && uuidValue !== '' && !placeholderValues.includes(uuidValue)) {
              // For hub_id fields, allow hub names (they'll be converted to UUIDs in transformRow)
              const isHubIdField = field.name === 'hub_id' || field.name === 'current_hub_id'
              if (!uuidRegex.test(uuidValue) && field.required && !isHubIdField) {
                errors.push({
                  row: rowIndex + 1,
                  field: field.name,
                  message: `${field.label} must be a valid UUID or hub name`,
                })
              }
              // For optional fields with invalid UUID format, we'll skip it in transformRow
              // For hub_id fields, we'll try to resolve the name in transformRow
            }
            break
        }
      }
    })

    return errors
  }

  const transformRow = async (
    row: Record<string, any>,
    mapping: Record<string, string>,
    config: ImportTableConfig,
    hubNameToIdMap?: Map<string, string>
  ): Promise<Record<string, any>> => {
    const transformed: Record<string, any> = {}

    config.fields.forEach((field) => {
      const csvColumn = Object.keys(mapping).find((key) => mapping[key] === field.name)
      if (csvColumn && row[csvColumn] !== undefined) {
        let value = row[csvColumn]
        
        // Trim whitespace for string values
        if (typeof value === 'string') {
          value = value.trim()
        }
        
        // Treat common placeholder values as empty
        const placeholderValues = ['null', 'NULL', 'None', 'NONE', 'N/A', 'n/a', '-', '--', '']
        const isEmptyValue = !value || value === '' || value === null || value === undefined || 
          (typeof value === 'string' && placeholderValues.includes(value.trim()))
        
        // For UUID fields, also check if the value is a valid UUID format
        // If it's not a valid UUID, try to resolve it as a hub name (for hub_id fields)
        if (field.type === 'uuid' && typeof value === 'string') {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          const uuidValue = value.trim()
          
          // If it's not a valid UUID, try to resolve it as a hub name
          if (uuidValue && !uuidRegex.test(uuidValue) && (field.name === 'hub_id' || field.name === 'current_hub_id')) {
            if (hubNameToIdMap) {
              // Try case-insensitive lookup
              const hubNameLower = uuidValue.toLowerCase()
              const foundHubId = hubNameToIdMap.get(uuidValue) || hubNameToIdMap.get(hubNameLower)
              
              if (foundHubId) {
                value = foundHubId
              } else if (!field.required) {
                // If hub name not found and field is optional, skip it
                return
              }
              // If hub name not found and field is required, let validation catch it
            } else if (!field.required) {
              // If we don't have hub mapping and field is optional, skip it
              return
            }
          } else if (uuidValue && !uuidRegex.test(uuidValue) && !field.required) {
            // For other UUID fields that are optional, skip invalid UUIDs
            return
          }
        }
        
        // Skip empty values (after trimming and checking placeholders) - don't include them in transformed object
        // This allows optional fields to be omitted from the insert
        if (isEmptyValue) {
          return
        }

        // Transform based on type
        switch (field.type) {
          case 'number':
            value = Number(value)
            break
          case 'date':
            // Handle both date and datetime
            const date = new Date(value)
            if (field.name.includes('_at') || field.name === 'pickup_at' || field.name === 'start_at' || field.name === 'end_at') {
              // Timestamp fields
              value = date.toISOString()
            } else {
              // Date fields
              value = date.toISOString().split('T')[0]
            }
            break
          case 'boolean':
            value = value === 'true' || value === '1' || value === 'yes'
            break
          case 'uuid':
            // UUIDs should already be strings, just trim
            value = String(value).trim()
            break
          default:
            value = String(value).trim()
        }

        transformed[field.name] = value
      }
    })

    // Set default status values for drivers and vehicles if not provided
    if (config.tableName === 'drivers' && !transformed.status) {
      transformed.status = 'active'
    }
    if (config.tableName === 'vehicles' && !transformed.status) {
      transformed.status = 'available'
    }

    return transformed
  }

  const importData = async (
    data: Record<string, any>[],
    config: ImportTableConfig,
    mapping: Record<string, string>
  ): Promise<ImportResult> => {
    setIsImporting(true)
    const errors: ValidationError[] = []
    const validRows: Record<string, any>[] = []

    // Fetch hubs to create a name-to-ID mapping if we're importing data that might have hub_id fields
    let hubNameToIdMap: Map<string, string> | undefined
    const hasHubIdField = config.fields.some(f => f.name === 'hub_id' || f.name === 'current_hub_id')
    if (hasHubIdField) {
      try {
        const { data: hubs, error: hubsError } = await supabase
          .from('hubs')
          .select('id, name')
        
        if (!hubsError && hubs) {
          hubNameToIdMap = new Map()
          hubs.forEach(hub => {
            if (hub.name) {
              // Store both lowercase and original case for case-insensitive lookup
              hubNameToIdMap!.set(hub.name.toLowerCase(), hub.id)
              hubNameToIdMap!.set(hub.name, hub.id)
            }
          })
        }
      } catch (err) {
        console.warn('Failed to fetch hubs for name-to-ID mapping:', err)
      }
    }

    // Validate all rows
    for (let index = 0; index < data.length; index++) {
      const row = data[index]
      const rowErrors = validateRow(row, index, config, mapping)
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
      } else {
        const transformed = await transformRow(row, mapping, config, hubNameToIdMap)
        if (transformed && Object.keys(transformed).length > 0) {
          validRows.push(transformed)
        }
      }
    }

    if (validRows.length === 0) {
      setIsImporting(false)
      return {
        success: false,
        inserted: 0,
        errors,
      }
    }

    // Insert valid rows
    try {
      const { data: insertedData, error } = await supabase
        .from(config.tableName)
        .insert(validRows)
        .select()

      if (error) {
        // If bulk insert fails, try individual inserts to get specific errors
        let inserted = 0
        const insertErrors: ValidationError[] = []

        for (let i = 0; i < validRows.length; i++) {
          const { error: insertError } = await supabase
            .from(config.tableName)
            .insert(validRows[i])
            .select()

          if (insertError) {
            insertErrors.push({
              row: i + 1,
              field: 'general',
              message: insertError.message,
            })
          } else {
            inserted++
          }
        }

        setIsImporting(false)
        return {
          success: inserted > 0,
          inserted,
          errors: [...errors, ...insertErrors],
        }
      }

      setIsImporting(false)
      return {
        success: true,
        inserted: insertedData?.length || validRows.length,
        errors,
      }
    } catch (err: any) {
      setIsImporting(false)
      return {
        success: false,
        inserted: 0,
        errors: [
          ...errors,
          {
            row: 0,
            field: 'general',
            message: err.message || 'Import failed',
          },
        ],
      }
    }
  }

  return {
    importData,
    isImporting,
  }
}

