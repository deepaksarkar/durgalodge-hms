// src/lib/export-utils.ts
import * as XLSX from 'xlsx'

/**
 * Generates and triggers browser download of an XLSX file
 */
export function downloadXLSX(data: Record<string, any>[], filename: string, sheetName = 'Report') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Auto-fit column widths
  const maxProps = Object.keys(data[0] || {})
  worksheet['!cols'] = maxProps.map((key) => ({
    wch: Math.max(key.length + 2, 14),
  }))

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Generates and triggers browser download of a CSV file
 */
export function downloadCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers
      .map((fieldName) => {
        const val = row[fieldName]
        if (val === null || val === undefined) return '""'
        const stringVal = String(val).replace(/"/g, '""')
        return `"${stringVal}"`
      })
      .join(',')
  )

  const csvContent = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
