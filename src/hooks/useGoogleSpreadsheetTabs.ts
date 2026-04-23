import { useQuery } from '@tanstack/react-query'
import {
  buildGoogleSheetEditUrl,
  extractGoogleSheetTabsFromHtml,
  extractGoogleSheetTabsFromWorksheetFeedJson,
  type GoogleSheetTab,
} from '../utils/googleSheets'

async function fetchSheetHtml(spreadsheetId: string): Promise<string> {
  const url = buildGoogleSheetEditUrl(spreadsheetId)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch spreadsheet page (${res.status})`)
  }
  return await res.text()
}

async function fetchWorksheetFeed(spreadsheetId: string): Promise<GoogleSheetTab[]> {
  // Legacy public worksheets feed. Works when sheet is publicly viewable/published.
  const url = `https://spreadsheets.google.com/feeds/worksheets/${encodeURIComponent(
    spreadsheetId
  )}/public/basic?alt=json`
  const res = await fetch(url)
  if (!res.ok) {
    return []
  }
  const json = await res.json()
  return extractGoogleSheetTabsFromWorksheetFeedJson(json)
}

export function useGoogleSpreadsheetTabs(params: {
  spreadsheetId: string | null
  enabled?: boolean
}) {
  const { spreadsheetId, enabled = true } = params

  return useQuery<GoogleSheetTab[]>({
    queryKey: ['google-sheet-tabs', spreadsheetId || 'no-id'],
    enabled: enabled && !!spreadsheetId,
    queryFn: async () => {
      if (!spreadsheetId) return []
      const html = await fetchSheetHtml(spreadsheetId)
      let tabs = extractGoogleSheetTabsFromHtml(html)
      if (tabs.length === 0) {
        tabs = await fetchWorksheetFeed(spreadsheetId)
      }
      // Prefer stable ordering by gid
      return tabs.sort((a, b) => Number(a.gid) - Number(b.gid))
    },
    staleTime: 60_000,
  })
}

