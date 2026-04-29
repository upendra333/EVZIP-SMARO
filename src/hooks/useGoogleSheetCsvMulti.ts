import { useQuery } from '@tanstack/react-query'
import Papa from 'papaparse'
import {
  buildGoogleSheetCsvUrl,
  extractGoogleSheetTabsFromWorksheetFeedJson,
  type GoogleSheetTab,
} from '../utils/googleSheets'

export type SheetRowWithMeta = Record<string, string> & { __sheet: string }

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch sheet CSV (${res.status})`)
  return await res.text()
}

function parseCsv(text: string): Record<string, string>[] {
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html')) {
    throw new Error('Google Sheet returned HTML instead of CSV. Ensure the sheet is publicly viewable.')
  }

  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  const blockingErrors = (parsed.errors || []).filter(
    (err) => !(err.type === 'Delimiter' && err.code === 'UndetectableDelimiter')
  )
  if (blockingErrors.length) {
    const first = blockingErrors[0]
    throw new Error(first?.message || 'CSV parse error')
  }

  const rows = (parsed.data || []) as string[][]
  if (!rows.length) return []

  const headers = (rows[0] || []).map((h) => (h ?? '').toString().trim())
  const dataRows = rows.slice(1)

  const indexToColumnLetter = (index: number): string => {
    let n = index + 1
    let out = ''
    while (n > 0) {
      const rem = (n - 1) % 26
      out = String.fromCharCode(65 + rem) + out
      n = Math.floor((n - 1) / 26)
    }
    return out
  }

  return dataRows.map((values) => {
    const out: Record<string, string> = {}

    headers.forEach((header, idx) => {
      const value = values[idx] == null ? '' : String(values[idx]).trim()

      const key = (header ?? '').trim()
      if (!key) return
      out[key] = value
    })

    values.forEach((raw, idx) => {
      const col = indexToColumnLetter(idx)
      out[`__col_${col}`] = raw == null ? '' : String(raw).trim()
    })

    return out
  })
}

async function fetchWorksheetFeedTabs(spreadsheetId: string): Promise<GoogleSheetTab[]> {
  const url = `https://spreadsheets.google.com/feeds/worksheets/${encodeURIComponent(
    spreadsheetId
  )}/public/basic?alt=json`
  const res = await fetch(url)
  if (!res.ok) return []
  const json = await res.json()
  return extractGoogleSheetTabsFromWorksheetFeedJson(json)
}

function isIndexTabName(tabName: string): boolean {
  const n = tabName.trim().toLowerCase()
  return n === 'index' || n === 'index sheet' || n === 'reference' || n === 'supervisor index'
}

export function useGoogleSheetCsvMulti(params: {
  queryKey: string[]
  spreadsheetId: string | null
  tabs: GoogleSheetTab[] | null
  enabled?: boolean
  refetchIntervalMs?: number
}) {
  const { queryKey, spreadsheetId, tabs, enabled = true, refetchIntervalMs } = params

  return useQuery<SheetRowWithMeta[]>({
    queryKey,
    enabled: enabled && !!spreadsheetId,
    refetchInterval: refetchIntervalMs,
    queryFn: async () => {
      if (!spreadsheetId) return []

      let effectiveTabs = tabs ?? []
      const needsFeedFallback =
        effectiveTabs.length === 0 ||
        effectiveTabs.every((t) => !String(t.gid || '').trim()) ||
        effectiveTabs.every((t) => (t.name || '').trim().toLowerCase() === 'sheet1')

      if (needsFeedFallback) {
        const feedTabs = await fetchWorksheetFeedTabs(spreadsheetId)
        if (feedTabs.length > 0) {
          effectiveTabs = feedTabs
        }
      }

      if (!effectiveTabs.length) {
        // Fallback: discover tabs via worksheet feed if tab discovery hook failed.
        effectiveTabs = await fetchWorksheetFeedTabs(spreadsheetId)
      }
      effectiveTabs = effectiveTabs.filter((t) => !isIndexTabName(t.name))

      if (!effectiveTabs.length) {
        // Last fallback: fetch default visible tab only.
        const url = buildGoogleSheetCsvUrl({ spreadsheetId })
        const text = await fetchText(url)
        const rows = parseCsv(text)
        return rows.map((r) => ({ ...r, __sheet: 'Sheet1' }))
      }

      const results = await Promise.all(
        effectiveTabs.map(async (t) => {
          const url = buildGoogleSheetCsvUrl({ spreadsheetId, sheetName: t.name, gid: t.gid })
          const text = await fetchText(url)
          const rows = parseCsv(text)
          return rows.map((r) => ({ ...r, __sheet: t.name }))
        })
      )

      return results.flat()
    },
  })
}

