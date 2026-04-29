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
  const tabs: GoogleSheetTab[] = []
  const seen = new Set<string>()
  const addTab = (gid: string, name: string) => {
    const trimmedName = String(name || '').trim()
    const trimmedGid = String(gid || '').trim()
    if (!trimmedName) return
    const key = `${trimmedGid}:${trimmedName}`
    if (seen.has(key)) return
    seen.add(key)
    tabs.push({ gid: trimmedGid, name: trimmedName })
  }
  const decodeHtml = (raw: string) =>
    raw
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()

  // Public sheet pages typically contain JSON blobs that include "sheetId" and "name".
  const re = /"sheetId":(\d+)[\s\S]{0,200}?"name":"([^"]+)"/g
  for (;;) {
    const m = re.exec(html)
    if (!m) break
    addTab(m[1], m[2])
  }

  // Sometimes "name" appears before "sheetId".
  const re2 = /"name":"([^"]+)"[\s\S]{0,200}?"sheetId":(\d+)/g
  for (;;) {
    const m = re2.exec(html)
    if (!m) break
    addTab(m[2], m[1])
  }

  // Some payloads expose titles under `properties.title` rather than `name`.
  const reTitle1 = /"sheetId":(\d+)[\s\S]{0,260}?"title":"([^"]+)"/g
  for (;;) {
    const m = reTitle1.exec(html)
    if (!m) break
    addTab(m[1], m[2])
  }

  const reTitle2 = /"title":"([^"]+)"[\s\S]{0,260}?"sheetId":(\d+)/g
  for (;;) {
    const m = reTitle2.exec(html)
    if (!m) break
    addTab(m[2], m[1])
  }

  // Structured metadata fallback: "properties":{"sheetId":123,"title":"XXXX", ...}
  const reProps = /"properties":\{"sheetId":(\d+),"title":"([^"]+)"/g
  for (;;) {
    const m = reProps.exec(html)
    if (!m) break
    addTab(m[1], m[2])
  }

  // Mobile-rendered pages may expose tab anchors as "...#gid=12345" + label/title.
  const linkRegex = /href="[^"]*#gid=(\d+)[^"]*"[\s\S]{0,220}?(?:aria-label|title)="([^"]+)"/g
  for (;;) {
    const m = linkRegex.exec(html)
    if (!m) break
    addTab(m[1], decodeHtml(m[2]))
  }

  // Newer pages also render tab captions in DOM (sometimes without nearby sheetId).
  const re3 = /docs-sheet-tab-caption">([\s\S]*?)<\/div>/g
  for (;;) {
    const m = re3.exec(html)
    if (!m) break
    addTab('', decodeHtml(m[1] ?? ''))
  }

  // Generic backup: pair encountered gid fragments with caption text by index.
  const gidRegex = /#gid=(\d+)/g
  const gids: string[] = []
  const namesWithoutGid = tabs.filter((t) => !t.gid).map((t) => t.name)
  for (;;) {
    const gm = gidRegex.exec(html)
    if (!gm) break
    gids.push(gm[1])
  }
  const count = Math.min(gids.length, namesWithoutGid.length)
  for (let i = 0; i < count; i++) {
    addTab(gids[i], namesWithoutGid[i])
  }

  // Prefer higher quality entries (non-generic names with valid gid).
  const normalized = (n: string) => n.trim().toLowerCase()
  const withGidAndNamed = tabs.filter((t) => t.gid && normalized(t.name) !== 'sheet1')
  if (withGidAndNamed.length) return withGidAndNamed

  const withGid = tabs.filter((t) => t.gid)
  if (withGid.length) return withGid

  return tabs.filter((t) => !!t.name.trim())
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

