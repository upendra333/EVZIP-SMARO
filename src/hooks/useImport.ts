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
              // For optional fields, if it doesn't match UUID format, just skip it (don't error)
              // Only error if it's a required field
              if (!uuidRegex.test(uuidValue) && field.required) {
                errors.push({
                  row: rowIndex + 1,
                  field: field.name,
                  message: `${field.label} must be a valid UUID`,
                })
              }
              // For optional fields with invalid UUID format, we'll skip it in transformRow
            }
            break
        }
      }
    })

    return errors
  }

  const transformRow = (
    row: Record<string, any>,
    mapping: Record<string, string>,
    config: ImportTableConfig
  ): Record<string, any> => {
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
        // If it's not a valid UUID and the field is optional, treat it as empty
        if (field.type === 'uuid' && typeof value === 'string') {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          const uuidValue = value.trim()
          // If it's not a valid UUID and field is optional, skip it
          if (uuidValue && !uuidRegex.test(uuidValue) && !field.required) {
            return // Skip invalid UUID values for optional fields
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

    // Validate all rows
    data.forEach((row, index) => {
      const rowErrors = validateRow(row, index, config, mapping)
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
      } else {
        validRows.push(transformRow(row, mapping, config))
      }
    })

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

