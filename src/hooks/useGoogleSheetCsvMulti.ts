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
    const out: Record<string, string> = {}
    Object.entries(r).forEach(([k, v]) => {
      const key = (k ?? '').trim()
      if (!key) return
      out[key] = v == null ? '' : String(v).trim()
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

