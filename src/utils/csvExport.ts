import Papa from 'papaparse'

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // Use provided headers or generate from data keys
  const csvHeaders = headers || Object.keys(data[0])
  
  // Convert data to CSV format
  const csv = Papa.unparse({
    fields: csvHeaders,
    data: data.map((row) =>
      csvHeaders.map((header) => {
        const value = row[header]
        // Format dates
        if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          return new Date(value).toLocaleDateString('en-IN')
        }
        // Format numbers
        if (typeof value === 'number') {
          return value.toLocaleString('en-IN')
        }
        return value ?? ''
      })
    ),
  })

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

