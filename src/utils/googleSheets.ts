export type GoogleSheetCsvSource =
  | { spreadsheetId: string; gid?: string; sheetName?: string }
  | { url: string }

export type GoogleSheetTab = { gid: string; name: string }

export function parseGoogleSpreadsheetId(input: string): string | null {
  const match = input.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] ?? null
}

export function buildGoogleSheetEditUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit?usp=sharing`
}

export function buildGoogleSheetCsvUrl(source: GoogleSheetCsvSource): string {
  if ('url' in source) return source.url

  const { spreadsheetId, gid, sheetName } = source
  const base = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq`

  const params = new URLSearchParams()
  params.set('tqx', 'out:csv')
  if (sheetName && sheetName.trim()) params.set('sheet', sheetName.trim())
  if (gid && String(gid).trim()) params.set('gid', String(gid).trim())

  return `${base}?${params.toString()}`
}

export function extractGoogleSheetTabsFromHtml(html: string): GoogleSheetTab[] {
  // Public sheet pages typically contain JSON blobs that include "sheetId" and "name"
  // We use a conservative regex to avoid hard-coding Google’s internal structures.
  const tabs: GoogleSheetTab[] = []
  const seen = new Set<string>()

  const re = /"sheetId":(\d+)[\s\S]{0,200}?"name":"([^"]+)"/g
  for (;;) {
    const m = re.exec(html)
    if (!m) break
    const gid = m[1]
    const name = m[2]
    const key = `${gid}:${name}`
    if (seen.has(key)) continue
    seen.add(key)
    tabs.push({ gid, name })
  }

  // Fallback: sometimes "name" appears before "sheetId"
  if (tabs.length === 0) {
    const re2 = /"name":"([^"]+)"[\s\S]{0,200}?"sheetId":(\d+)/g
    for (;;) {
      const m = re2.exec(html)
      if (!m) break
      const name = m[1]
      const gid = m[2]
      const key = `${gid}:${name}`
      if (seen.has(key)) continue
      seen.add(key)
      tabs.push({ gid, name })
    }
  }

  // Additional fallback: some Google payloads expose sheet titles under
  // `properties.title` rather than `name`.
  if (tabs.length === 0) {
    const reTitle1 = /"sheetId":(\d+)[\s\S]{0,260}?"title":"([^"]+)"/g
    for (;;) {
      const m = reTitle1.exec(html)
      if (!m) break
      const gid = m[1]
      const name = m[2]
      const key = `${gid}:${name}`
      if (seen.has(key)) continue
      seen.add(key)
      tabs.push({ gid, name })
    }
  }

  if (tabs.length === 0) {
    const reTitle2 = /"title":"([^"]+)"[\s\S]{0,260}?"sheetId":(\d+)/g
    for (;;) {
      const m = reTitle2.exec(html)
      if (!m) break
      const name = m[1]
      const gid = m[2]
      const key = `${gid}:${name}`
      if (seen.has(key)) continue
      seen.add(key)
      tabs.push({ gid, name })
    }
  }

  // Structured sheet metadata fallback:
  // "properties":{"sheetId":123,"title":"XXXX", ...}
  if (tabs.length === 0) {
    const reProps = /"properties":\{"sheetId":(\d+),"title":"([^"]+)"/g
    for (;;) {
      const m = reProps.exec(html)
      if (!m) break
      const gid = m[1]
      const name = m[2]
      const key = `${gid}:${name}`
      if (seen.has(key)) continue
      seen.add(key)
      tabs.push({ gid, name })
    }
  }

  // Newer sheet pages often render tab captions in DOM without exposing sheetId nearby.
  // In this mode we can still fetch CSV by `sheet` name, so synthesize stable gids.
  if (tabs.length === 0) {
    const re3 = /docs-sheet-tab-caption">([\s\S]*?)<\/div>/g
    for (;;) {
      const m = re3.exec(html)
      if (!m) break
      const rawName = m[1] ?? ''
      const name = rawName
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
      if (!name) continue

      const key = `name:${name}`
      if (seen.has(key)) continue
      seen.add(key)
      // No reliable gid in this fallback path; let callers fetch by sheet name only.
      tabs.push({ gid: '', name })
    }
  }

  return tabs
}

export function extractGoogleSheetTabsFromWorksheetFeedJson(json: unknown): GoogleSheetTab[] {
  const out: GoogleSheetTab[] = []
  const seen = new Set<string>()

  const feed = (json as any)?.feed
  const entries = feed?.entry
  if (!Array.isArray(entries)) return out

  entries.forEach((entry: any) => {
    const title = entry?.title?.$t
    const idText: string | undefined = entry?.id?.$t
    const gidMatch = typeof idText === 'string' ? idText.match(/\/(\d+)$/) : null
    const gid = gidMatch?.[1]

    if (!title || !gid) return
    const key = `${gid}:${title}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ gid, name: String(title) })
  })

  return out
}

