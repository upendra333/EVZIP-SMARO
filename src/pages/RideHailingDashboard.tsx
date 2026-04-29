import { useEffect, useMemo, useState } from 'react'
import { parseGoogleSpreadsheetId } from '../utils/googleSheets'
import { useGoogleSpreadsheetTabs } from '../hooks/useGoogleSpreadsheetTabs'
import { useGoogleSheetCsvMulti } from '../hooks/useGoogleSheetCsvMulti'
import type { GoogleSheetTab } from '../utils/googleSheets'

type DashboardFilters = {
  hub?: string
  number?: string
  pilotId?: string
  dateFrom?: string
  dateTo?: string
}

type RideHailingColumnMap = {
  timestamp?: string
  hub?: string
  pilotId?: string
  service?: string
  upi?: string
  cash?: string
  uber?: string
  tip?: string
}

type NormalizedTrip = {
  vehicleNumber: string
  timestampDate: Date | null
  hub: string
  pilotId: string
  service: string
  total: number
}

type ServiceMetric = {
  key: string
  todayLabel: string
  monthLabel: string
  aliases: string[]
}

type StatsSummary = {
  trips: number
  vehicles: number
  pilots: number
  revenue: number
}

const SERVICE_METRICS: ServiceMetric[] = [
  { key: 'uber', todayLabel: 'Uber', monthLabel: 'Uber', aliases: ['uber'] },
  { key: 'rapido', todayLabel: 'Rapido', monthLabel: 'Rapido', aliases: ['rapido'] },
  { key: 'evzip', todayLabel: 'EVZIP', monthLabel: 'EVZIP App', aliases: ['evzip', 'evzip app'] },
  { key: 'airport', todayLabel: 'Airport', monthLabel: 'Airport', aliases: ['airport'] },
  { key: 'manual', todayLabel: 'Manual rides', monthLabel: 'Manual rides', aliases: ['manual', 'manual ride'] },
  { key: 'rentals', todayLabel: 'Rentals', monthLabel: 'Rentals', aliases: ['rental', 'rentals'] },
  { key: 'outstation', todayLabel: 'Outstation', monthLabel: 'Outstation', aliases: ['outstation'] },
  { key: 'subscriptions', todayLabel: 'Subscriptions', monthLabel: 'Subscriptions', aliases: ['subscription', 'subscriptions'] },
]

const TODAY_SERVICE_THEME: Record<string, string> = {
  uber: 'border-black bg-black',
  rapido: 'border-yellow-400 bg-yellow-300',
  evzip: 'border-[#141339] bg-[#141339]',
  airport: 'border-cyan-400 bg-cyan-300',
  manual: 'border-amber-400 bg-amber-300',
  rentals: 'border-fuchsia-400 bg-fuchsia-300',
  outstation: 'border-orange-400 bg-orange-300',
  subscriptions: 'border-lime-400 bg-lime-300',
}

const MONTH_SERVICE_THEME: Record<string, string> = {
  uber: 'border-black bg-black',
  rapido: 'border-yellow-500 bg-yellow-400',
  evzip: 'border-[#141339] bg-[#141339]',
  airport: 'border-cyan-500 bg-cyan-400',
  manual: 'border-amber-500 bg-amber-400',
  rentals: 'border-fuchsia-500 bg-fuchsia-400',
  outstation: 'border-orange-500 bg-orange-400',
  subscriptions: 'border-lime-500 bg-lime-400',
}

const TODAY_SECTION_TITLE_THEME: Record<string, string> = {
  uber: 'text-white',
  rapido: 'text-yellow-900',
  evzip: 'text-blue-50',
  airport: 'text-cyan-900',
  manual: 'text-amber-900',
  rentals: 'text-fuchsia-900',
  outstation: 'text-orange-900',
  subscriptions: 'text-lime-900',
}

const MONTH_SECTION_TITLE_THEME: Record<string, string> = {
  uber: 'text-white',
  rapido: 'text-yellow-900',
  evzip: 'text-blue-50',
  airport: 'text-cyan-900',
  manual: 'text-amber-900',
  rentals: 'text-fuchsia-900',
  outstation: 'text-orange-900',
  subscriptions: 'text-lime-900',
}

const SERVICE_TITLE_LOGOS: Partial<Record<string, string>> = {
  uber: '/uber.png',
  rapido: '/rapido.png',
  evzip: '/evzip_logo.svg',
}

const SERVICE_LOGO_SIZE_CLASS: Partial<Record<string, string>> = {
  uber: 'h-8',
  rapido: 'h-10',
  evzip: 'h-14',
}

function parseDateLoose(value: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) return d
  const m = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2]) - 1
  const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3])
  const parsed = new Date(year, month, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
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

function normalizeColumnLetter(value: string): string {
  return (value || '').trim().toUpperCase().replace(/[^A-Z]/g, '')
}

function getRowValueByColumnLetter(row: Record<string, string>, columnLetter?: string): string {
  const letter = normalizeColumnLetter(columnLetter || '')
  if (!letter) return ''
  return (row[`__col_${letter}`] || '').trim()
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

function serviceKey(service: string): string | null {
  const normalized = service.trim().toLowerCase()
  if (!normalized) return null
  const found = SERVICE_METRICS.find((metric) => metric.aliases.some((alias) => normalized.includes(alias)))
  return found?.key || null
}

function calculateStats(trips: NormalizedTrip[]): StatsSummary {
  return {
    trips: trips.length,
    vehicles: new Set(trips.map((trip) => trip.vehicleNumber).filter(Boolean)).size,
    pilots: new Set(trips.map((trip) => trip.pilotId).filter(Boolean)).size,
    revenue: trips.reduce((sum, trip) => sum + trip.total, 0),
  }
}

export function RideHailingDashboard() {
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState(
    () => (localStorage.getItem('rideHailing.autoRefresh') || 'on') === 'on'
  )

  useEffect(() => {
    const syncAutoRefreshState = () => {
      setIsAutoRefreshActive((localStorage.getItem('rideHailing.autoRefresh') || 'on') === 'on')
    }

    syncAutoRefreshState()
    const interval = setInterval(syncAutoRefreshState, 3000)
    const onFocus = () => syncAutoRefreshState()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const defaultSheetUrl =
    'https://docs.google.com/spreadsheets/d/1W89iEvjkkDG9JASIOTDtQE6QSRCtdgzuQb-hXShcy_Y/edit?usp=sharing'
  const sheetUrl = localStorage.getItem('rideHailing.sheetUrl') || defaultSheetUrl
  const spreadsheetId = useMemo(() => parseGoogleSpreadsheetId(sheetUrl), [sheetUrl])

  const [filters, setFilters] = useState<DashboardFilters>({
    hub: '',
    number: '',
    pilotId: '',
    dateFrom: '',
    dateTo: '',
  })
  const [columnMap] = useState<RideHailingColumnMap>(() => {
    try {
      return JSON.parse(localStorage.getItem('rideHailing.columnMap') || '{}') as RideHailingColumnMap
    } catch {
      return {}
    }
  })
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false)

  const { data: sheetTabs = [] } = useGoogleSpreadsheetTabs({
    spreadsheetId,
    enabled: !!spreadsheetId,
  })

  const dataTabs = useMemo<GoogleSheetTab[]>(
    () => sheetTabs.filter((t) => !isIndexTabName(t.name)),
    [sheetTabs]
  )

  const { data: rows = [], isLoading, error, isFetching, refetch } = useGoogleSheetCsvMulti({
    queryKey: ['ride-hailing-dashboard', spreadsheetId || 'no-id', String(dataTabs.length)],
    spreadsheetId,
    tabs: dataTabs,
    enabled: !!spreadsheetId,
    refetchIntervalMs: 30_000,
  })

  const normalizedTrips = useMemo<NormalizedTrip[]>(() => {
    return rows
      .map((r) => {
        const tsRaw =
          getRowValueByColumnLetter(r, columnMap.timestamp) ||
          getRowValueByCandidates(
            r,
            ['timestamp', 'time stamp', 'submitted at', 'submission time', 'date', 'trip date', 'start date', 'start time'],
            'contains'
          )
        const tsDate = parseDateLoose(tsRaw)
        const upi = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.upi) || getRowValueByCandidates(r, ['upi'], 'contains'))
        const cash = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.cash) || getRowValueByCandidates(r, ['cash'], 'contains'))
        const uber = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.uber) || getRowValueByCandidates(r, ['uber'], 'contains'))
        const tip = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.tip) || getRowValueByCandidates(r, ['tip'], 'contains'))
        return {
          vehicleNumber: vehicleNumberFromTabName(r.__sheet || ''),
          timestampDate: tsDate,
          hub:
            getRowValueByColumnLetter(r, columnMap.hub) ||
            getRowValueByCandidates(r, ['hub', 'hub name', 'location', 'branch'], 'contains'),
          pilotId:
            getRowValueByColumnLetter(r, columnMap.pilotId) ||
            getRowValueByCandidates(r, ['pilot id', 'pilotid', 'driver id', 'captain id'], 'contains'),
          service:
            getRowValueByColumnLetter(r, columnMap.service) ||
            getRowValueByCandidates(r, ['service', 'trip type', 'ride type'], 'contains'),
          total: upi + cash + uber + tip,
        }
      })
      .filter((trip) => trip.timestampDate !== null)
  }, [rows, columnMap])

  const hubOptions = useMemo(() => {
    return Array.from(new Set(normalizedTrips.map((trip) => trip.hub).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    )
  }, [normalizedTrips])

  const filteredTrips = useMemo(() => {
    const hubQ = (filters.hub || '').trim().toLowerCase()
    const numberQ = (filters.number || '').trim().toLowerCase()
    const pilotQ = (filters.pilotId || '').trim().toLowerCase()
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null

    return normalizedTrips.filter((trip) => {
      if (hubQ && !trip.hub.toLowerCase().includes(hubQ)) return false
      if (numberQ && !trip.vehicleNumber.toLowerCase().includes(numberQ)) return false
      if (pilotQ && !trip.pilotId.toLowerCase().includes(pilotQ)) return false
      if (!trip.timestampDate) return false
      if (from && trip.timestampDate < from) return false
      if (to && trip.timestampDate > to) return false
      return true
    })
  }, [normalizedTrips, filters])

  const periodStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const todayTrips = filteredTrips.filter((trip) => trip.timestampDate && trip.timestampDate >= todayStart && trip.timestampDate <= todayEnd)
    const monthTrips = filteredTrips.filter((trip) => trip.timestampDate && trip.timestampDate >= monthStart && trip.timestampDate <= monthEnd)

    return {
      todayTrips,
      monthTrips,
      today: calculateStats(todayTrips),
      month: calculateStats(monthTrips),
    }
  }, [filteredTrips])

  const serviceBreakup = useMemo(() => {
    const empty = calculateStats([])
    return SERVICE_METRICS.map((metric) => {
      const todayTrips = periodStats.todayTrips.filter((trip) => serviceKey(trip.service) === metric.key)
      const monthTrips = periodStats.monthTrips.filter((trip) => serviceKey(trip.service) === metric.key)
      return {
        key: metric.key,
        todayLabel: metric.todayLabel,
        monthLabel: metric.monthLabel,
        today: todayTrips.length ? calculateStats(todayTrips) : empty,
        month: monthTrips.length ? calculateStats(monthTrips) : empty,
      }
    })
  }, [periodStats.todayTrips, periodStats.monthTrips])

  const renderStatCard = (label: string, value: string, className = 'border-gray-200 bg-gray-50') => (
    <div className={`px-3 py-2 rounded-lg border ${className}`}>
      <p className="text-[11px] text-gray-600 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                isAutoRefreshActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Auto refresh: {isAutoRefreshActive ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          disabled={isLoading || isFetching}
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm font-medium text-gray-700">Filters</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setFilters({
                  hub: '',
                  number: '',
                  pilotId: '',
                  dateFrom: '',
                  dateTo: '',
                })
              }
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
            <button
              onClick={() => setIsFiltersCollapsed((v) => !v)}
              className="w-8 h-8 flex items-center justify-center text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              title={isFiltersCollapsed ? 'Expand filters' : 'Collapse filters'}
              aria-label={isFiltersCollapsed ? 'Expand filters' : 'Collapse filters'}
            >
              {isFiltersCollapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>
        {!isFiltersCollapsed && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hubs</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle number</label>
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date to</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              {isFetching ? 'Refreshing...' : 'Live refresh every 30s'} • Using source from Ride Hailing settings
            </p>
          </>
        )}
      </div>

      {error ? (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="font-medium text-red-700 mb-2">Failed to load Google Sheet</p>
          <p className="text-sm text-gray-700">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-pulse text-gray-500">Loading dashboard data...</div>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-800 mb-3">Today</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {renderStatCard('Total Trips', String(periodStats.today.trips), 'border-blue-200 bg-white')}
              {renderStatCard('Total Vehicles', String(periodStats.today.vehicles), 'border-blue-200 bg-white')}
              {renderStatCard('Total Pilots', String(periodStats.today.pilots), 'border-blue-200 bg-white')}
              {renderStatCard('Total Revenue', `₹${periodStats.today.revenue.toFixed(2)}`, 'border-blue-200 bg-white')}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-800 mb-3">Current Month</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {renderStatCard('Total Trips', String(periodStats.month.trips), 'border-purple-200 bg-white')}
              {renderStatCard('Total Vehicles', String(periodStats.month.vehicles), 'border-purple-200 bg-white')}
              {renderStatCard('Total Pilots', String(periodStats.month.pilots), 'border-purple-200 bg-white')}
              {renderStatCard('Total Revenue', `₹${periodStats.month.revenue.toFixed(2)}`, 'border-purple-200 bg-white')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-3">Service-wise breakup</p>
            <div className="grid grid-cols-1 gap-4">
              {serviceBreakup.map((item) => (
                <div key={`service-${item.key}`} className="p-3 border border-gray-200 rounded-lg bg-white">
                  {SERVICE_TITLE_LOGOS[item.key] ? (
                    <div className="mb-3 h-8 flex items-center">
                      <img
                        src={SERVICE_TITLE_LOGOS[item.key]}
                        alt={item.todayLabel}
                        className={`${SERVICE_LOGO_SIZE_CLASS[item.key] || 'h-7'} w-auto object-contain`}
                      />
                    </div>
                  ) : (
                    <p className="text-xl font-semibold text-gray-900 mb-3 leading-tight">{item.todayLabel}</p>
                  )}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div className={`p-3 border rounded-lg ${TODAY_SERVICE_THEME[item.key] || 'border-blue-200 bg-blue-50'}`}>
                      <p
                        className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
                          TODAY_SECTION_TITLE_THEME[item.key] || 'text-gray-800'
                        }`}
                      >
                        Today stats
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {renderStatCard('Total Trips', String(item.today.trips), 'border-white/80 bg-white')}
                        {renderStatCard('Total Vehicles', String(item.today.vehicles), 'border-white/80 bg-white')}
                        {renderStatCard('Total Pilots', String(item.today.pilots), 'border-white/80 bg-white')}
                        {renderStatCard('Total Revenue', `₹${item.today.revenue.toFixed(2)}`, 'border-white/80 bg-white')}
                      </div>
                    </div>
                    <div className={`p-3 border rounded-lg ${MONTH_SERVICE_THEME[item.key] || 'border-purple-200 bg-purple-50'}`}>
                      <p
                        className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
                          MONTH_SECTION_TITLE_THEME[item.key] || 'text-gray-800'
                        }`}
                      >
                        Current month stats
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {renderStatCard('Total Trips', String(item.month.trips), 'border-white/80 bg-white')}
                        {renderStatCard('Total Vehicles', String(item.month.vehicles), 'border-white/80 bg-white')}
                        {renderStatCard('Total Pilots', String(item.month.pilots), 'border-white/80 bg-white')}
                        {renderStatCard('Total Revenue', `₹${item.month.revenue.toFixed(2)}`, 'border-white/80 bg-white')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
