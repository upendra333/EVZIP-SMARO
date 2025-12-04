import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { IMPORT_TABLES, getTableConfig, type ImportTableConfig } from '../utils/importConfig'
import { useImport, type ValidationError, type ImportResult } from '../hooks/useImport'

// Helper to validate rows for preview
const validateRowsForPreview = (
  data: Record<string, any>[],
  config: ImportTableConfig,
  mapping: Record<string, string>
): ValidationError[] => {
  const errors: ValidationError[] = []

  data.forEach((row, index) => {
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

      if (field.required && isEmptyValue) {
        errors.push({
          row: index + 1,
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
                row: index + 1,
                field: field.name,
                message: `${field.label} must be a number`,
              })
            }
            break
          case 'date':
            const date = new Date(value)
            if (isNaN(date.getTime())) {
              errors.push({
                row: index + 1,
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
                  row: index + 1,
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
  })

  return errors
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'results'

export function Imports() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [csvData, setCsvData] = useState<Record<string, any>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { importData, isImporting } = useImport()

  const handleDownloadTemplate = () => {
    if (!selectedTable) {
      alert('Please select a target table first')
      return
    }

    const config = getTableConfig(selectedTable)
    if (!config) {
      alert('Invalid table configuration')
      return
    }

    // Helper function to generate example value for a field
    const getExampleValue = (field: { name: string; label: string; type: string; required: boolean }, rowIndex: number, tableName: string): string => {
      // Handle specific field names with realistic examples
      const fieldName = field.name.toLowerCase()
      const fieldLabel = field.label.toLowerCase()

      // Phone/Mobile fields
      if (fieldName.includes('phone') || fieldName.includes('mobile')) {
        return rowIndex === 0 ? '+91-9876543210' : '+91-9876543211'
      }

      // Email fields
      if (fieldName.includes('email')) {
        return rowIndex === 0 ? 'customer1@example.com' : 'customer2@example.com'
      }

      // Time fields
      if (fieldName.includes('time') || fieldName === 'pickup_time') {
        return rowIndex === 0 ? '09:00:00' : '18:00:00'
      }

      // Status fields
      if (fieldName === 'status') {
        if (fieldLabel.includes('driver')) {
          return rowIndex === 0 ? 'active' : 'active'
        } else if (fieldLabel.includes('vehicle')) {
          return rowIndex === 0 ? 'available' : 'available'
        } else if (fieldLabel.includes('subscription')) {
          return rowIndex === 0 ? 'active' : 'active'
        } else {
          return rowIndex === 0 ? 'created' : 'assigned'
        }
      }

      // Amount fields (in paise)
      if (fieldName.includes('amount') || fieldName.includes('fare') || fieldName.includes('rate')) {
        if (fieldLabel.includes('paise')) {
          return rowIndex === 0 ? '50000' : '75000' // 500 INR and 750 INR in paise
        }
        return rowIndex === 0 ? '500' : '750'
      }

      // Month fields
      if (fieldName.includes('month')) {
        return rowIndex === 0 ? '1' : '2' // January, February
      }

      // Year fields
      if (fieldName.includes('year')) {
        const currentYear = new Date().getFullYear()
        return String(currentYear)
      }

      // Days fields
      if (fieldName.includes('days') || fieldName === 'no_of_days') {
        return rowIndex === 0 ? '30' : '60'
      }

      // KM/Distance fields
      if (fieldName.includes('km') || fieldName.includes('distance')) {
        return rowIndex === 0 ? '25.5' : '30.0'
      }

      // Invoice/Reference fields
      if (fieldName.includes('invoice') || fieldName.includes('invoice_no')) {
        return rowIndex === 0 ? 'INV-2025-001' : 'INV-2025-002'
      }

      // Driver ID fields (string type, not UUID)
      if (fieldName === 'driver_id' && field.type === 'string') {
        return rowIndex === 0 ? 'DRV001' : 'DRV002'
      }

      // Registration number fields
      if (fieldName.includes('reg_no')) {
        return rowIndex === 0 ? 'MH-01-AB-1234' : 'MH-01-CD-5678'
      }

      // Direction fields
      if (fieldName === 'direction') {
        return rowIndex === 0 ? 'to_office' : 'from_office'
      }

      // Location fields
      if (fieldName === 'pickup' || fieldLabel.includes('pick')) {
        return rowIndex === 0 ? 'Mumbai Airport' : 'Pune Station'
      }
      if (fieldName === 'drop' || fieldLabel.includes('drop')) {
        return rowIndex === 0 ? 'Mumbai Office' : 'Pune Office'
      }

      // City fields
      if (fieldName === 'city') {
        return rowIndex === 0 ? 'Mumbai' : 'Pune'
      }

      // Hub name fields
      if (fieldName === 'name' && tableName === 'hubs') {
        return rowIndex === 0 ? 'HQ' : 'East'
      }

      // Customer/Client name fields
      if (fieldName === 'name' || fieldName === 'client_name') {
        return rowIndex === 0 ? 'John Doe' : 'Jane Smith'
      }

      // Notes/Remarks fields
      if (fieldName.includes('notes') || fieldName.includes('remarks')) {
        return rowIndex === 0 ? 'Regular customer' : 'VIP customer'
      }

      // Default handling by type
      switch (field.type) {
        case 'string':
          if (field.required) {
            return fieldName === 'name' 
              ? (rowIndex === 0 ? 'Example Name' : 'Another Example')
              : (rowIndex === 0 ? 'Example Value' : 'Another Value')
          }
          return ''
        case 'number':
          if (field.required) {
            return rowIndex === 0 ? '0' : '100'
          }
          return ''
        case 'date':
          if (field.required) {
            const date = new Date()
            if (rowIndex === 1) {
              date.setDate(date.getDate() + 1)
            }
            return fieldName.includes('_at') 
              ? date.toISOString() 
              : date.toISOString().split('T')[0]
          }
          return ''
        case 'uuid':
          // For hub_id fields, show hub name examples instead of UUIDs
          if (field.name === 'hub_id' || field.name === 'current_hub_id') {
            return rowIndex === 0 ? 'HQ' : 'East'
          }
          if (field.required) {
            return rowIndex === 0 
              ? '00000000-0000-0000-0000-000000000000'
              : '00000000-0000-0000-0000-000000000001'
          }
          return ''
        case 'boolean':
          if (field.required) {
            return rowIndex === 0 ? 'true' : 'false'
          }
          return ''
        default:
          return field.required ? (rowIndex === 0 ? 'Example' : 'Example 2') : ''
      }
    }

    // Create CSV headers using field labels
    const headers = config.fields.map((field) => field.label)
    
    // Create example rows with realistic placeholder values
    const exampleRow1: Record<string, any> = {}
    const exampleRow2: Record<string, any> = {}
    
    config.fields.forEach((field) => {
      exampleRow1[field.label] = getExampleValue(field, 0, config.tableName)
      exampleRow2[field.label] = getExampleValue(field, 1, config.tableName)
    })

    // Use PapaParse to generate properly formatted CSV
    const csvData = [exampleRow1, exampleRow2]
    const csvContent = Papa.unparse(csvData, {
      header: true,
      columns: headers,
    })

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${config.label}_template.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    if (!selectedTable) {
      alert('Please select a target table first before uploading a CSV file')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0] as Record<string, any>)
          if (headers.length === 0) {
            alert('CSV file has no headers. Please ensure your CSV file has a header row.')
            return
          }
          setCsvData(results.data as Record<string, any>[])
          setCsvHeaders(headers)
          setStep('mapping')
        } else {
          alert('CSV file is empty or invalid')
        }
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`)
      },
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleMappingChange = (csvColumn: string, dbField: string) => {
    setMapping((prev) => ({
      ...prev,
      [csvColumn]: dbField,
    }))
  }

  const handlePreview = () => {
    if (!selectedTable) {
      alert('Please select a target table')
      return
    }

    const config = getTableConfig(selectedTable)
    if (!config) {
      alert('Invalid table configuration')
      return
    }

    // Check required fields are mapped
    const requiredFields = config.fields.filter((f) => f.required)
    const missingFields = requiredFields.filter(
      (f) => !Object.values(mapping).includes(f.name)
    )

    if (missingFields.length > 0) {
      alert(`Please map all required fields: ${missingFields.map((f) => f.label).join(', ')}`)
      return
    }

    setStep('preview')
  }

  const handleImport = async () => {
    if (!selectedTable) return

    const config = getTableConfig(selectedTable)
    if (!config) return

    const result = await importData(csvData, config, mapping)
    setImportResult(result)
    setStep('results')
  }

  const handleReset = () => {
    setStep('upload')
    setSelectedTable('')
    setCsvData([])
    setCsvHeaders([])
    setMapping({})
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const config = selectedTable ? getTableConfig(selectedTable) : null
  const previewRows = csvData.slice(0, 10)
  const previewErrors =
    step === 'preview' && config
      ? validateRowsForPreview(csvData, config, mapping)
      : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Imports</h1>
        <p className="text-gray-600 mt-1">Import data from CSV files</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-6 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {(['upload', 'mapping', 'preview', 'results'] as ImportStep[]).map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  step === s
                    ? 'bg-primary text-white'
                    : ['upload', 'mapping', 'preview', 'results'].indexOf(step) > index
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              {index < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    ['upload', 'mapping', 'preview', 'results'].indexOf(step) > index
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Table Selector */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Target Table
              </label>
              {selectedTable && (
                <button
                  onClick={handleDownloadTemplate}
                  className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <span>📥</span>
                  <span>Download Template</span>
                </button>
              )}
            </div>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a table...</option>
              {IMPORT_TABLES.map((table) => (
                <option key={table.tableName} value={table.tableName}>
                  {table.label}
                </option>
              ))}
            </select>
            {selectedTable && (
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Download the template to see the correct format before uploading your data
              </p>
            )}
          </div>

          {/* File Upload */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="space-y-4">
              <div className="text-4xl">📄</div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragging ? 'Drop CSV file here' : 'Drag and drop CSV file'}
                </p>
                <p className="text-sm text-gray-500 mt-2">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Browse Files
                </button>
              </div>
              <p className="text-xs text-gray-400">Only .csv files are supported</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="space-y-6">
          {!config ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-600 mb-4">
                Please select a target table first before uploading a CSV file.
              </p>
              <button
                onClick={() => setStep('upload')}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Go Back to Step 1
              </button>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text">Column Mapping</h2>
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Start Over
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Map CSV columns to database fields. Required fields are marked with *
              </p>

              {csvHeaders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No CSV headers found. Please upload a valid CSV file.</p>
                  <button
                    onClick={() => setStep('upload')}
                    className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Go Back to Step 1
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {csvHeaders.map((csvColumn) => (
                      <div key={csvColumn} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="font-medium text-gray-700">{csvColumn}</div>
                        <select
                          value={mapping[csvColumn] || ''}
                          onChange={(e) => handleMappingChange(csvColumn, e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">-- Select field --</option>
                          {config.fields.map((field) => (
                            <option key={field.name} value={field.name}>
                              {field.label} {field.required && '*'}
                              {field.description && ` (${field.description})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={handlePreview}
                      className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Preview Data
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && config && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text">Preview (First 10 Rows)</h2>
              <button
                onClick={() => setStep('mapping')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Mapping
              </button>
            </div>

            {/* Validation Errors */}
            {previewErrors.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">
                  Validation Warnings ({previewErrors.length}):
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                  {previewErrors.slice(0, 10).map((error, index) => (
                    <li key={index}>
                      Row {error.row}, {error.field}: {error.message}
                    </li>
                  ))}
                  {previewErrors.length > 10 && (
                    <li className="text-yellow-600">
                      ... and {previewErrors.length - 10} more
                    </li>
                  )}
                </ul>
                <p className="text-xs text-yellow-600 mt-2">
                  These rows will be skipped during import. Fix errors and re-import if needed.
                </p>
              </div>
            )}

            {/* Preview Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Row
                    </th>
                    {config.fields
                      .filter((f) => Object.values(mapping).includes(f.name))
                      .map((field) => (
                        <th
                          key={field.name}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                          {field.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewRows.map((row, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-gray-600">{index + 1}</td>
                      {config.fields
                        .filter((f) => Object.values(mapping).includes(f.name))
                        .map((field) => {
                          const csvColumn = Object.keys(mapping).find(
                            (key) => mapping[key] === field.name
                          )
                          const value = csvColumn ? row[csvColumn] : ''
                          return (
                            <td key={field.name} className="px-4 py-2 text-gray-900">
                              {value || '-'}
                            </td>
                          )
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Importing...' : `Import ${csvData.length} Rows`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && importResult && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-text mb-4">Import Results</h2>

            {/* Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                  <div className="text-2xl font-bold text-text">{csvData.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Successfully Imported</div>
                  <div className="text-2xl font-bold text-green-600">{importResult.inserted}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Errors</div>
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.errors.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Errors List */}
            {importResult.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-2">Error Details:</h3>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Row
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Field
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {importResult.errors.map((error, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-gray-900">{error.row}</td>
                          <td className="px-4 py-2 text-gray-900">{error.field}</td>
                          <td className="px-4 py-2 text-red-600">{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Success Message */}
            {importResult.success && importResult.errors.length === 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  ✅ Successfully imported {importResult.inserted} rows!
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Import Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

