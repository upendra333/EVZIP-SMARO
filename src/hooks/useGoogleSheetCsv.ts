import { useQuery } from '@tanstack/react-query'
import Papa from 'papaparse'
import { buildGoogleSheetCsvUrl, type GoogleSheetCsvSource } from '../utils/googleSheets'

export type SheetRow = Record<string, string>

async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet CSV (${res.status})`)
  }
  return await res.text()
}

function parseCsv(text: string): SheetRow[] {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (parsed.errors?.length) {
    const first = parsed.errors[0]
    throw new Error(first?.message || 'CSV parse error')
  }

  const rows = (parsed.data || []) as Record<string, unknown>[]
  return rows.map((r) => {
    const out: SheetRow = {}
    Object.entries(r).forEach(([k, v]) => {
      const key = (k ?? '').trim()
      if (!key) return
      out[key] = v == null ? '' : String(v).trim()
    })
    return out
  })
}

export function useGoogleSheetCsv(params: {
  queryKey: string[]
  source: GoogleSheetCsvSource | null
  enabled?: boolean
  refetchIntervalMs?: number
}) {
  const { queryKey, source, enabled = true, refetchIntervalMs } = params

  return useQuery({
    queryKey,
    enabled: enabled && !!source,
    refetchInterval: refetchIntervalMs,
    queryFn: async () => {
      if (!source) return []
      const url = buildGoogleSheetCsvUrl(source)
      const text = await fetchCsv(url)
      return parseCsv(text)
    },
  })
}

