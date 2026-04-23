import { useEffect, useMemo, useState } from 'react'
import { exportToCSV } from '../utils/csvExport'
import { parseGoogleSpreadsheetId } from '../utils/googleSheets'
import { useGoogleSpreadsheetTabs } from '../hooks/useGoogleSpreadsheetTabs'
import { useGoogleSheetCsvMulti } from '../hooks/useGoogleSheetCsvMulti'
import { useOperator } from '../hooks/useOperator'
import type { GoogleSheetTab } from '../utils/googleSheets'

type RideHailingFilters = {
  hub?: string
  number?: string
  pilotId?: string
  dateFrom?: string
  dateTo?: string
}

function parseDateLoose(value: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) return d

  // dd/mm/yyyy or dd-mm-yyyy (common in IN forms)
  const m = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2]) - 1
    const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3])
    const dd = new Date(Date.UTC(year, month, day))
    if (!Number.isNaN(dd.getTime())) return dd
  }
  return null
}

function getRowValueByCandidates(
  row: Record<string, string>,
  candidates: string[],
  mode: 'exact' | 'contains' = 'contains'
): string {
  const entries = Object.entries(row).map(([k, v]) => ({ keyLower: k.toLowerCase(), value: v || '' }))
  for (const candidate of candidates) {
    const candidateLower = candidate.toLowerCase()
    const hit = entries.find((entry) =>
      mode === 'exact' ? entry.keyLower === candidateLower : entry.keyLower.includes(candidateLower)
    )
    if (hit && hit.value.trim()) return hit.value.trim()
  }
  return ''
}

function isIndexTabName(tabName: string): boolean {
  const n = tabName.trim().toLowerCase()
  return n === 'index' || n === 'index sheet' || n === 'reference' || n === 'supervisor index'
}

function vehicleNumberFromTabName(tabName: string): string {
  const raw = (tabName || '').trim()
  if (!raw) return ''
  const m = raw.match(/(\d{4})$/)
  return m?.[1] || raw
}

function toNumberOrZero(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

type NormalizedTrip = {
  vehicleNumber: string
  timestamp: string
  timestampMs: number
  timestampDate: Date | null
  hub: string
  pilotId: string
  service: string
  upi: number
  cash: number
  uber: number
  tip: number
  total: number
}

export function RideHailing() {
  const { isAdmin } = useOperator()
  const isSourceSectionDisabled = !isAdmin()

  const defaultSheetUrl =
    'https://docs.google.com/spreadsheets/d/1W89iEvjkkDG9JASIOTDtQE6QSRCtdgzuQb-hXShcy_Y/edit?usp=sharing'

  const [sheetUrl, setSheetUrl] = useState(() => {
    return localStorage.getItem('rideHailing.sheetUrl') || defaultSheetUrl
  })
  const [autoRefresh, setAutoRefresh] = useState(() => {
    return (localStorage.getItem('rideHailing.autoRefresh') || 'on') === 'on'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 50

  const [filters, setFilters] = useState<RideHailingFilters>(() => {
    return {
      hub: '',
      number: '',
      pilotId: '',
      dateFrom: '',
      dateTo: '',
    }
  })

  const spreadsheetId = useMemo(() => parseGoogleSpreadsheetId(sheetUrl), [sheetUrl])
  const { data: sheetTabs = [] } = useGoogleSpreadsheetTabs({
    spreadsheetId,
    enabled: !!spreadsheetId,
  })

  const dataTabs = useMemo<GoogleSheetTab[]>(
    () => sheetTabs.filter((t) => !isIndexTabName(t.name)),
    [sheetTabs]
  )

  const { data: rows = [], isLoading, error, refetch, isFetching } = useGoogleSheetCsvMulti({
    queryKey: ['ride-hailing-multi', spreadsheetId || 'no-id', String(dataTabs.length)],
    spreadsheetId,
    tabs: dataTabs,
    enabled: !!spreadsheetId,
    refetchIntervalMs: autoRefresh ? 30_000 : undefined,
  })

  const normalizedTrips = useMemo<NormalizedTrip[]>(() => {
    return rows
      .map((r) => {
        const tsRaw = getRowValueByCandidates(
          r,
          ['timestamp', 'time stamp', 'submitted at', 'submission time', 'date', 'trip date', 'start date', 'start time'],
          'contains'
        )
        const tsDate = parseDateLoose(tsRaw)
        const upi = toNumberOrZero(getRowValueByCandidates(r, ['upi'], 'contains'))
        const cash = toNumberOrZero(getRowValueByCandidates(r, ['cash'], 'contains'))
        const uber = toNumberOrZero(getRowValueByCandidates(r, ['uber'], 'contains'))
        const tip = toNumberOrZero(getRowValueByCandidates(r, ['tip'], 'contains'))
        const total = upi + cash + uber + tip

        return {
          vehicleNumber: vehicleNumberFromTabName(r.__sheet || ''),
          timestamp: tsRaw,
          timestampMs: tsDate ? tsDate.getTime() : Number.NEGATIVE_INFINITY,
          timestampDate: tsDate,
          hub: getRowValueByCandidates(r, ['hub', 'hub name', 'location', 'branch'], 'contains'),
          pilotId: getRowValueByCandidates(r, ['pilot id', 'pilotid', 'driver id', 'captain id'], 'contains'),
          service: getRowValueByCandidates(r, ['service', 'trip type', 'ride type'], 'contains'),
          upi,
          cash,
          uber,
          tip,
          total,
        }
      })
      .filter((trip) => trip.timestampDate !== null)
      .sort((a, b) => b.timestampMs - a.timestampMs)
  }, [rows])

  const hubOptions = useMemo(() => {
    return Array.from(new Set(normalizedTrips.map((trip) => trip.hub).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [normalizedTrips])

  const filteredRows = useMemo(() => {
    const hubQ = (filters.hub || '').trim().toLowerCase()
    const numberQ = (filters.number || '').trim().toLowerCase()
    const pilotQ = (filters.pilotId || '').trim().toLowerCase()
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null

    return normalizedTrips.filter((trip) => {
      if (hubQ && !trip.hub.toLowerCase().includes(hubQ)) return false
      if (numberQ && !trip.vehicleNumber.toLowerCase().includes(numberQ)) return false
      if (pilotQ && !trip.pilotId.toLowerCase().includes(pilotQ)) return false

      if (from || to) {
        if (!trip.timestampDate) return false
        if (from && trip.timestampDate < from) return false
        if (to && trip.timestampDate > to) return false
      }

      return true
    })
  }, [normalizedTrips, filters])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    const end = start + rowsPerPage
    return filteredRows.slice(start, end)
  }, [filteredRows, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters.hub, filters.number, filters.pilotId, filters.dateFrom, filters.dateTo, spreadsheetId])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const periodStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const calc = (from: Date, to: Date) => {
      const trips = normalizedTrips.filter((trip) => {
        if (!trip.timestampDate) return false
        return trip.timestampDate >= from && trip.timestampDate <= to
      })

      const vehicles = new Set(trips.map((trip) => trip.vehicleNumber).filter(Boolean)).size
      const pilots = new Set(trips.map((trip) => trip.pilotId).filter(Boolean)).size
      const revenue = trips.reduce((sum, trip) => sum + trip.total, 0)

      return {
        trips: trips.length,
        vehicles,
        pilots,
        revenue,
      }
    }

    return {
      today: calc(todayStart, todayEnd),
      month: calc(monthStart, monthEnd),
    }
  }, [normalizedTrips])

  const persistSettings = () => {
    localStorage.setItem('rideHailing.sheetUrl', sheetUrl)
    localStorage.setItem('rideHailing.autoRefresh', autoRefresh ? 'on' : 'off')
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Ride Hailing</h1>
          <p className="text-sm text-gray-600">
            Live view from your Google Sheet for reconciliation, monitoring, and reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isLoading || isFetching || !spreadsheetId}
            title="Refresh"
          >
            Refresh
          </button>
          <button
            onClick={() => exportToCSV(filteredRows, 'ride_hailing_trips')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            disabled={filteredRows.length === 0}
            title="Export filtered rows to CSV"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Google Sheet link</label>
            <input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              onBlur={persistSettings}
              placeholder="Paste Google Sheet URL..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSourceSectionDisabled}
              readOnly={isSourceSectionDisabled}
            />
            {!spreadsheetId && (
              <p className="mt-2 text-xs text-red-600">Could not detect spreadsheet ID from the URL.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Consolidation mode</label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-800">
              All tabs (auto consolidated)
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {sheetTabs.length > 0
                ? `Detected ${sheetTabs.length} tabs. Data is merged from ${dataTabs.length} tabs (excluding Index tab).`
                : 'Tab detection unavailable. Showing default sheet tab data as fallback.'}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Auto refresh</label>
              <button
                onClick={() => {
                  setAutoRefresh((v) => {
                    const next = !v
                    localStorage.setItem('rideHailing.autoRefresh', next ? 'on' : 'off')
                    return next
                  })
                }}
                className={`w-full px-3 py-2 border rounded-lg ${
                  autoRefresh ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
                disabled={isSourceSectionDisabled}
              >
                {autoRefresh ? 'ON (30s)' : 'OFF'}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Live stats will refetch every 30 seconds when enabled.
              </p>
            </div>
          </div>
        </div>
        {isSourceSectionDisabled && (
          <p className="mt-4 text-xs text-amber-700">
            Source settings can only be changed by admins.
          </p>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hub</label>
            <select
              value={filters.hub || ''}
              onChange={(e) => setFilters((p) => ({ ...p, hub: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Hubs</option>
              {hubOptions.map((hub) => (
                <option key={hub} value={hub}>
                  {hub}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number</label>
            <input
              value={filters.number || ''}
              onChange={(e) => setFilters((p) => ({ ...p, number: e.target.value }))}
              placeholder="Filter by vehicle number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pilot ID</label>
            <input
              value={filters.pilotId || ''}
              onChange={(e) => setFilters((p) => ({ ...p, pilotId: e.target.value }))}
              placeholder="Filter by pilot ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date from</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              title="Filter from this date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date to</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              title="Filter till this date"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Today stats</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-[11px] text-blue-700 uppercase tracking-wide">Total Trips</p>
              <p className="text-lg font-semibold text-blue-900">{periodStats.today.trips}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-[11px] text-blue-700 uppercase tracking-wide">Total Vehicles</p>
              <p className="text-lg font-semibold text-blue-900">{periodStats.today.vehicles}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-[11px] text-blue-700 uppercase tracking-wide">Total Pilots</p>
              <p className="text-lg font-semibold text-blue-900">{periodStats.today.pilots}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-[11px] text-blue-700 uppercase tracking-wide">Total Revenue</p>
              <p className="text-lg font-semibold text-blue-900">₹{periodStats.today.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Current month stats</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="px-3 py-2 rounded-lg border border-purple-200 bg-purple-50">
              <p className="text-[11px] text-purple-700 uppercase tracking-wide">Total Trips</p>
              <p className="text-lg font-semibold text-purple-900">{periodStats.month.trips}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border border-purple-200 bg-purple-50">
              <p className="text-[11px] text-purple-700 uppercase tracking-wide">Total Vehicles</p>
              <p className="text-lg font-semibold text-purple-900">{periodStats.month.vehicles}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border border-purple-200 bg-purple-50">
              <p className="text-[11px] text-purple-700 uppercase tracking-wide">Total Pilots</p>
              <p className="text-lg font-semibold text-purple-900">{periodStats.month.pilots}</p>
            </div>
            <div className="px-3 py-2 rounded-lg border border-purple-200 bg-purple-50">
              <p className="text-[11px] text-purple-700 uppercase tracking-wide">Total Revenue</p>
              <p className="text-lg font-semibold text-purple-900">₹{periodStats.month.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="font-medium text-red-700 mb-2">Failed to load Google Sheet</p>
          <p className="text-sm text-gray-700">
            {(error as Error).message}
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Ensure the sheet is shared as “Anyone with the link can view” so all tabs can be consolidated.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-pulse text-gray-500">Loading sheet…</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">{filteredRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}</span>
              -
              <span className="font-medium text-gray-900">{Math.min(currentPage * rowsPerPage, filteredRows.length)}</span> of{' '}
              <span className="font-medium text-gray-900">{filteredRows.length}</span> rows
            </div>
            <div className="text-xs text-gray-500">
              {isFetching ? 'Updating…' : 'Up to date'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Vehicle Number', 'Timestamp', 'HUB', 'Pilot ID', 'Service', 'UPI', 'Cash', 'Uber', 'Tip', 'Total'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.vehicleNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.timestamp || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.hub || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.pilotId || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.service || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.upi.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.cash.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.uber.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.tip.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{r.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

