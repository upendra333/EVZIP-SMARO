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

      // Prefer worksheet feed first; it's stable across desktop/mobile HTML variants.
      let tabs = await fetchWorksheetFeed(spreadsheetId)
      if (tabs.length === 0) {
        const html = await fetchSheetHtml(spreadsheetId)
        tabs = extractGoogleSheetTabsFromHtml(html)
      }
      // Prefer stable ordering by numeric gid; keep name fallback stable for non-numeric gids.
      return tabs.sort((a, b) => {
        const aNum = Number(a.gid)
        const bNum = Number(b.gid)
        const aIsNum = Number.isFinite(aNum) && a.gid !== ''
        const bIsNum = Number.isFinite(bNum) && b.gid !== ''
        if (aIsNum && bIsNum) return aNum - bNum
        if (aIsNum) return -1
        if (bIsNum) return 1
        return a.name.localeCompare(b.name)
      })
    },
    staleTime: 60_000,
  })
}

