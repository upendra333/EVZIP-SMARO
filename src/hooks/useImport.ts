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
      const value = csvColumn ? row[csvColumn] : undefined

      // Check required fields
      if (field.required && (!value || value === '')) {
        errors.push({
          row: rowIndex + 1,
          field: field.name,
          message: `${field.label} is required`,
        })
      }

      // Validate types
      if (value !== undefined && value !== '') {
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
            if (!uuidRegex.test(String(value))) {
              errors.push({
                row: rowIndex + 1,
                field: field.name,
                message: `${field.label} must be a valid UUID`,
              })
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
      if (csvColumn && row[csvColumn] !== undefined && row[csvColumn] !== '') {
        let value = row[csvColumn]

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
          default:
            value = String(value).trim()
        }

        transformed[field.name] = value
      }
    })

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

