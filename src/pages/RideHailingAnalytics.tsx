import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { parseGoogleSpreadsheetId } from '../utils/googleSheets'
import { useGoogleSpreadsheetTabs } from '../hooks/useGoogleSpreadsheetTabs'
import { useGoogleSheetCsvMulti } from '../hooks/useGoogleSheetCsvMulti'
import { useRideHailingColumnMap } from '../hooks/useRideHailingColumnMap'
import type { GoogleSheetTab } from '../utils/googleSheets'
import { exportToCSV } from '../utils/csvExport'

type PeriodPreset = 'today' | 'last_7_days' | 'this_month' | 'custom'

type Trip = {
  ts: Date | null
  service: string
  hub: string
  vehicle: string
  pilot: string
  upi: number
  cash: number
  uber: number
  tip: number
  total: number
}

const EVZIP_COLORS = {
  primary: '#6dc7ae',
  primarySoft: '#a9e2d3',
  text: '#141339',
  textSoft: '#3d3a73',
  accent1: '#4a90e2',
  accent2: '#f5a623',
  accent3: '#9013fe',
  accent4: '#50e3c2',
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
    const c = candidate.toLowerCase()
    const hit = entries.find((entry) => (mode === 'exact' ? entry.keyLower === c : entry.keyLower.includes(c)))
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

function toNumberOrZero(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
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

function normalizeKey(value: string): string {
  return (value || '').trim().toLowerCase()
}

function formatLabel(value: string): string {
  return (value || '').trim().replace(/\s+/g, ' ').toUpperCase()
}

function dateKey(value: Date | null): string {
  if (!value) return ''
  return value.toISOString().split('T')[0]
}

function serviceKey(value: string): string {
  return normalizeKey(value?.trim() || '') || 'unknown'
}

function hubKey(value: string): string {
  return normalizeKey(value?.trim() || '') || 'unknown'
}

export function RideHailingAnalytics() {
  const defaultSheetUrl =
    'https://docs.google.com/spreadsheets/d/1W89iEvjkkDG9JASIOTDtQE6QSRCtdgzuQb-hXShcy_Y/edit?usp=sharing'
  const sheetUrl = localStorage.getItem('rideHailing.sheetUrl') || defaultSheetUrl
  const spreadsheetId = useMemo(() => parseGoogleSpreadsheetId(sheetUrl), [sheetUrl])
  const { data: columnMap = {} } = useRideHailingColumnMap()

  const [period, setPeriod] = useState<PeriodPreset>('last_7_days')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedHub, setSelectedHub] = useState('all')
  const [selectedVehicle, setSelectedVehicle] = useState('all')
  const [selectedPilot, setSelectedPilot] = useState('all')

  const { data: sheetTabs = [] } = useGoogleSpreadsheetTabs({
    spreadsheetId,
    enabled: !!spreadsheetId,
  })
  const dataTabs = useMemo<GoogleSheetTab[]>(
    () => sheetTabs.filter((t) => !isIndexTabName(t.name)),
    [sheetTabs]
  )

  const { data: rows = [], isLoading, error, isFetching } = useGoogleSheetCsvMulti({
    queryKey: ['ride-hailing-analytics', spreadsheetId || 'no-id', String(dataTabs.length)],
    spreadsheetId,
    tabs: dataTabs,
    enabled: !!spreadsheetId,
    refetchIntervalMs: 60_000,
  })

  const trips = useMemo<Trip[]>(() => {
    return rows.map((r) => {
      const upi = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.upi) || getRowValueByCandidates(r, ['upi']))
      const cash = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.cash) || getRowValueByCandidates(r, ['cash']))
      const uber = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.uber) || getRowValueByCandidates(r, ['uber']))
      const tip = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.tip) || getRowValueByCandidates(r, ['tip']))
      const tsRaw =
        getRowValueByColumnLetter(r, columnMap.timestamp) ||
        getRowValueByCandidates(r, ['timestamp', 'time stamp', 'submitted at', 'submission time', 'date', 'trip date'])

      const vehicleFromRow = getRowValueByCandidates(
        r,
        ['vehicle number', 'vehicle no', 'number', 'reg no', 'registration', 'cab number']
      )
      const vehicleFromSheet = vehicleNumberFromTabName(r.__sheet || '')

      return {
        ts: parseDateLoose(tsRaw),
        service:
          getRowValueByColumnLetter(r, columnMap.service) ||
          getRowValueByCandidates(r, ['service', 'trip type', 'ride type']),
        hub: getRowValueByColumnLetter(r, columnMap.hub) || getRowValueByCandidates(r, ['hub', 'hub name', 'location', 'branch']),
        pilot:
          getRowValueByColumnLetter(r, columnMap.pilotId) ||
          getRowValueByCandidates(r, ['pilot id', 'pilotid', 'driver id', 'captain id']),
        vehicle: vehicleFromRow || vehicleFromSheet,
        upi,
        cash,
        uber,
        tip,
        total: upi + cash + uber + tip,
      }
    })
  }, [rows, columnMap])

  const { fromDate, toDate } = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    if (period === 'today') return { fromDate: startOfToday, toDate: endOfToday }
    if (period === 'last_7_days') {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 6)
      return { fromDate: start, toDate: endOfToday }
    }
    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { fromDate: start, toDate: end }
    }
    return {
      fromDate: customFrom ? new Date(`${customFrom}T00:00:00`) : null,
      toDate: customTo ? new Date(`${customTo}T23:59:59.999`) : null,
    }
  }, [period, customFrom, customTo])

  const baseFiltered = useMemo(() => {
    return trips.filter((t) => {
      if (!t.ts) return false
      if (fromDate && t.ts < fromDate) return false
      if (toDate && t.ts > toDate) return false
      return true
    })
  }, [trips, fromDate, toDate])

  const hubOptions = useMemo(() => {
    const map = new Map<string, string>()
    baseFiltered.forEach((t) => {
      const key = hubKey(t.hub)
      const label = formatLabel(t.hub) || 'UNKNOWN'
      if (!map.has(key)) map.set(key, label)
    })
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [baseFiltered])

  const vehicleOptions = useMemo(() => {
    const map = new Map<string, string>()
    baseFiltered.forEach((t) => {
      const key = normalizeKey(t.vehicle) || 'unknown'
      const label = (t.vehicle || '').trim() || 'UNKNOWN'
      if (!map.has(key)) map.set(key, label)
    })
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [baseFiltered])

  const pilotOptions = useMemo(() => {
    const map = new Map<string, string>()
    baseFiltered.forEach((t) => {
      const key = normalizeKey(t.pilot) || 'unknown'
      const label = (t.pilot || '').trim() || 'UNKNOWN'
      if (!map.has(key)) map.set(key, label)
    })
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [baseFiltered])

  const filtered = useMemo(() => {
    return baseFiltered.filter((t) => {
      if (selectedHub !== 'all' && hubKey(t.hub) !== selectedHub) return false
      if (selectedVehicle !== 'all' && (normalizeKey(t.vehicle) || 'unknown') !== selectedVehicle) return false
      if (selectedPilot !== 'all' && (normalizeKey(t.pilot) || 'unknown') !== selectedPilot) return false
      return true
    })
  }, [baseFiltered, selectedHub, selectedVehicle, selectedPilot])

  const kpis = useMemo(
    () => ({
      trips: filtered.length,
      revenue: filtered.reduce((sum, t) => sum + t.total, 0),
      vehicles: new Set(filtered.map((t) => normalizeKey(t.vehicle)).filter(Boolean)).size,
      pilots: new Set(filtered.map((t) => normalizeKey(t.pilot)).filter(Boolean)).size,
    }),
    [filtered]
  )

  const dailyTrend = useMemo(() => {
    const map = new Map<string, { day: string; trips: number; revenue: number }>()
    filtered.forEach((t) => {
      if (!t.ts) return
      const key = t.ts.toISOString().split('T')[0]
      const current = map.get(key) || { day: key, trips: 0, revenue: 0 }
      current.trips += 1
      current.revenue += t.total
      map.set(key, current)
    })
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day))
  }, [filtered])

  const serviceTrend = useMemo(() => {
    const map = new Map<string, { service: string; trips: number; revenue: number }>()
    filtered.forEach((t) => {
      const raw = t.service?.trim() || 'Unknown'
      const key = serviceKey(raw)
      const current = map.get(key) || { service: formatLabel(raw) || 'UNKNOWN', trips: 0, revenue: 0 }
      current.trips += 1
      current.revenue += t.total
      map.set(key, current)
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [filtered])

  const paymentBreakup = useMemo(
    () => [
      { name: 'UPI', value: filtered.reduce((sum, t) => sum + t.upi, 0) },
      { name: 'Cash', value: filtered.reduce((sum, t) => sum + t.cash, 0) },
      { name: 'Uber', value: filtered.reduce((sum, t) => sum + t.uber, 0) },
      { name: 'Tip', value: filtered.reduce((sum, t) => sum + t.tip, 0) },
    ],
    [filtered]
  )

  const hubTrend = useMemo(() => {
    const map = new Map<string, { hub: string; trips: number; revenue: number }>()
    filtered.forEach((t) => {
      const raw = t.hub?.trim() || 'Unknown'
      const key = hubKey(raw)
      const current = map.get(key) || { hub: formatLabel(raw) || 'UNKNOWN', trips: 0, revenue: 0 }
      current.trips += 1
      current.revenue += t.total
      map.set(key, current)
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [filtered])

  const unitEconomics = useMemo(() => {
    const days = new Set(filtered.map((t) => dateKey(t.ts)).filter(Boolean)).size
    const hubs = new Set(filtered.map((t) => hubKey(t.hub)).filter(Boolean)).size
    const pilots = new Set(filtered.map((t) => normalizeKey(t.pilot)).filter(Boolean)).size
    const vehicles = new Set(filtered.map((t) => normalizeKey(t.vehicle)).filter(Boolean)).size
    const trips = filtered.length
    const revenue = filtered.reduce((sum, t) => sum + t.total, 0)
    const digitalRevenue = filtered.reduce((sum, t) => sum + t.upi + t.uber, 0)

    const topHubTrips = hubTrend.length > 0 ? hubTrend[0].trips : 0

    const safeDivide = (num: number, den: number) => (den > 0 ? num / den : 0)

    return {
      avgRevenuePerTrip: safeDivide(revenue, trips),
      avgTripsPerDay: safeDivide(trips, days),
      avgRevenuePerDay: safeDivide(revenue, days),
      avgTripsPerHub: safeDivide(trips, hubs),
      avgRevenuePerHub: safeDivide(revenue, hubs),
      avgTripsPerPilot: safeDivide(trips, pilots),
      avgRevenuePerPilot: safeDivide(revenue, pilots),
      avgTripsPerVehicle: safeDivide(trips, vehicles),
      avgRevenuePerVehicle: safeDivide(revenue, vehicles),
      utilizationTripsPerVehiclePerDay: safeDivide(trips, vehicles * days),
      topHubTripSharePct: safeDivide(topHubTrips * 100, trips),
      digitalMixPct: safeDivide(digitalRevenue * 100, revenue),
    }
  }, [filtered, hubTrend])

  const exportTrips = (items: Trip[], fileName: string) => {
    if (!items.length) return
    exportToCSV(
      items.map((t) => ({
        date: dateKey(t.ts),
        service: formatLabel(t.service) || 'UNKNOWN',
        hub: formatLabel(t.hub) || 'UNKNOWN',
        vehicle: t.vehicle || '',
        pilot: t.pilot || '',
        upi: t.upi,
        cash: t.cash,
        uber: t.uber,
        tip: t.tip,
        total: t.total,
      })),
      fileName
    )
  }

  const exportDailyAggregate = () => {
    exportToCSV(dailyTrend, 'ride_hailing_analytics_daily_trend')
  }

  const exportServiceAggregate = () => {
    exportToCSV(serviceTrend, 'ride_hailing_analytics_service_trend')
  }

  const exportPaymentAggregate = () => {
    exportToCSV(paymentBreakup, 'ride_hailing_analytics_payment_mix')
  }

  const exportHubAggregate = () => {
    exportToCSV(hubTrend, 'ride_hailing_analytics_hub_performance')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: EVZIP_COLORS.text }}>
            Ride Hailing Analytics
          </h1>
          <p className="text-sm text-gray-600">Leadership view of real-time trends for fast decision making.</p>
        </div>
        <div className="text-xs text-gray-500">{isFetching ? 'Refreshing...' : 'Live refresh every 60s'}</div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="all">All Hubs</option>
              {hubOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="all">All Vehicles</option>
              {vehicleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilot</label>
            <select
              value={selectedPilot}
              onChange={(e) => setSelectedPilot(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="all">All Pilots</option>
              {pilotOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {period === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="font-medium text-red-700 mb-2">Failed to load ride hailing analytics data</p>
          <p className="text-sm text-gray-700">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-pulse text-gray-500">Loading ride hailing analytics...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg p-4" style={{ backgroundColor: '#e9f8f3', border: `1px solid ${EVZIP_COLORS.primary}` }}>
              <p className="text-xs uppercase text-gray-600">Total Trips</p>
              <p className="text-2xl font-semibold" style={{ color: EVZIP_COLORS.text }}>{kpis.trips}</p>
            </div>
            <div className="rounded-lg p-4" style={{ backgroundColor: '#eef6ff', border: `1px solid ${EVZIP_COLORS.accent1}` }}>
              <p className="text-xs uppercase text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold" style={{ color: EVZIP_COLORS.text }}>₹{kpis.revenue.toFixed(2)}</p>
            </div>
            <div className="rounded-lg p-4" style={{ backgroundColor: '#f6f0ff', border: `1px solid ${EVZIP_COLORS.accent3}` }}>
              <p className="text-xs uppercase text-gray-600">Unique Vehicles</p>
              <p className="text-2xl font-semibold" style={{ color: EVZIP_COLORS.text }}>{kpis.vehicles}</p>
            </div>
            <div className="rounded-lg p-4" style={{ backgroundColor: '#f0fffb', border: `1px solid ${EVZIP_COLORS.accent4}` }}>
              <p className="text-xs uppercase text-gray-600">Unique Pilots</p>
              <p className="text-2xl font-semibold" style={{ color: EVZIP_COLORS.text }}>{kpis.pilots}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-3" style={{ color: EVZIP_COLORS.text }}>
              Unit Economics Snapshot
            </h3>
            <div className="space-y-3">
              {[
                {
                  group: 'Revenue Economics',
                  metrics: [
                    { label: 'Avg Revenue / Trip', value: `₹${unitEconomics.avgRevenuePerTrip.toFixed(2)}` },
                    { label: 'Avg Revenue / Day', value: `₹${unitEconomics.avgRevenuePerDay.toFixed(2)}` },
                    { label: 'Avg Revenue / Hub', value: `₹${unitEconomics.avgRevenuePerHub.toFixed(2)}` },
                    { label: 'Avg Revenue / Pilot', value: `₹${unitEconomics.avgRevenuePerPilot.toFixed(2)}` },
                    { label: 'Avg Revenue / Vehicle', value: `₹${unitEconomics.avgRevenuePerVehicle.toFixed(2)}` },
                    { label: 'Digital Payment Mix (UPI+Uber)', value: `${unitEconomics.digitalMixPct.toFixed(1)}%` },
                  ],
                },
                {
                  group: 'Productivity Economics',
                  metrics: [
                    { label: 'Avg Trips / Day', value: unitEconomics.avgTripsPerDay.toFixed(2) },
                    { label: 'Avg Trips / Hub', value: unitEconomics.avgTripsPerHub.toFixed(2) },
                    { label: 'Avg Trips / Pilot', value: unitEconomics.avgTripsPerPilot.toFixed(2) },
                    { label: 'Avg Trips / Vehicle', value: unitEconomics.avgTripsPerVehicle.toFixed(2) },
                    { label: 'Utilization (Trips / Vehicle / Day)', value: unitEconomics.utilizationTripsPerVehiclePerDay.toFixed(2) },
                  ],
                },
              ].map((section) => (
                <div key={section.group} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{section.group}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {section.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-full border px-3 py-1.5 bg-gray-50"
                        style={{ borderColor: '#d9e3ee' }}
                      >
                        <span className="text-xs text-gray-600 mr-2">{metric.label}:</span>
                        <span className="text-sm font-semibold" style={{ color: EVZIP_COLORS.text }}>
                          {metric.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold" style={{ color: EVZIP_COLORS.text }}>
                Daily Trips and Revenue Trend
              </h3>
              <button
                type="button"
                onClick={exportDailyAggregate}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
              >
                Download CSV
              </button>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={dailyTrend}
                onClick={(state: any) => {
                  const clicked = state?.activePayload?.[0]?.payload?.day as string | undefined
                  if (!clicked) return
                  exportTrips(
                    filtered.filter((t) => dateKey(t.ts) === clicked),
                    `ride_hailing_analytics_daily_${clicked}`
                  )
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="trips" fill={EVZIP_COLORS.primary} name="Trips" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" fill={EVZIP_COLORS.textSoft} name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold" style={{ color: EVZIP_COLORS.text }}>
                  Service-wise Trends
                </h3>
                <button
                  type="button"
                  onClick={exportServiceAggregate}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                >
                  Download CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="service" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="trips"
                    fill={EVZIP_COLORS.primary}
                    name="Trips"
                    onClick={(entry: any) => {
                      const selected = serviceKey(entry?.service || '')
                      if (!selected) return
                      exportTrips(
                        filtered.filter((t) => serviceKey(t.service) === selected),
                        `ride_hailing_analytics_service_${selected}`
                      )
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={EVZIP_COLORS.accent2}
                    name="Revenue"
                    onClick={(entry: any) => {
                      const selected = serviceKey(entry?.service || '')
                      if (!selected) return
                      exportTrips(
                        filtered.filter((t) => serviceKey(t.service) === selected),
                        `ride_hailing_analytics_service_${selected}`
                      )
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold" style={{ color: EVZIP_COLORS.text }}>
                  Payment Mode Mix
                </h3>
                <button
                  type="button"
                  onClick={exportPaymentAggregate}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
                >
                  Download CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentBreakup}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label
                    onClick={(entry: any) => {
                      const name = String(entry?.name || '').toLowerCase()
                      if (!name) return
                      const modeFiltered = filtered.filter((t) => {
                        if (name === 'upi') return t.upi > 0
                        if (name === 'cash') return t.cash > 0
                        if (name === 'uber') return t.uber > 0
                        if (name === 'tip') return t.tip > 0
                        return false
                      })
                      exportTrips(modeFiltered, `ride_hailing_analytics_payment_${name}`)
                    }}
                  >
                    {paymentBreakup.map((_, idx) => {
                      const palette = [EVZIP_COLORS.primary, EVZIP_COLORS.accent1, EVZIP_COLORS.accent2, EVZIP_COLORS.accent3]
                      return <Cell key={idx} fill={palette[idx % palette.length]} />
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold" style={{ color: EVZIP_COLORS.text }}>
                Hub Performance
              </h3>
              <button
                type="button"
                onClick={exportHubAggregate}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
              >
                Download CSV
              </button>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={hubTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hub" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="trips"
                  fill={EVZIP_COLORS.accent4}
                  name="Trips"
                  onClick={(entry: any) => {
                    const selected = hubKey(entry?.hub || '')
                    if (!selected) return
                    exportTrips(
                      filtered.filter((t) => hubKey(t.hub) === selected),
                      `ride_hailing_analytics_hub_${selected}`
                    )
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill={EVZIP_COLORS.text}
                  name="Revenue"
                  onClick={(entry: any) => {
                    const selected = hubKey(entry?.hub || '')
                    if (!selected) return
                    exportTrips(
                      filtered.filter((t) => hubKey(t.hub) === selected),
                      `ride_hailing_analytics_hub_${selected}`
                    )
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">
                If a bar is too small to click, use these per-hub download actions.
              </p>
              <div className="max-h-56 overflow-auto border border-gray-100 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Hub</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Trips</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Revenue</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hubTrend.map((row) => {
                      const selected = hubKey(row.hub)
                      const rowTrips = filtered.filter((t) => hubKey(t.hub) === selected)
                      return (
                        <tr key={row.hub} className="border-t border-gray-100">
                          <td className="px-3 py-2">{row.hub}</td>
                          <td className="px-3 py-2 text-right">{row.trips}</td>
                          <td className="px-3 py-2 text-right">₹{row.revenue.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => exportTrips(rowTrips, `ride_hailing_analytics_hub_${selected}`)}
                              className="px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

