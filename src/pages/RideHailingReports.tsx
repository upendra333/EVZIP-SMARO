import { useMemo, useState } from 'react'
import { exportToCSV } from '../utils/csvExport'
import { parseGoogleSpreadsheetId } from '../utils/googleSheets'
import { useGoogleSpreadsheetTabs } from '../hooks/useGoogleSpreadsheetTabs'
import { useGoogleSheetCsvMulti } from '../hooks/useGoogleSheetCsvMulti'
import { useRideHailingColumnMap } from '../hooks/useRideHailingColumnMap'
import type { GoogleSheetTab } from '../utils/googleSheets'

type NormalizedTrip = {
  timestampDate: Date | null
  hub: string
  pilotId: string
  service: string
  vehicleNumber: string
  upi: number
  cash: number
  uber: number
  tip: number
  total: number
}

type AggregateRow = {
  dimension: string
  trips: number
  totalRevenue: number
  upi: number
  cash: number
  uber: number
  tip: number
}

type DailyPeriod = 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'last_month' | 'custom'

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

function aggregateBy(trips: NormalizedTrip[], keyGetter: (trip: NormalizedTrip) => string): AggregateRow[] {
  const map = new Map<string, AggregateRow>()

  trips.forEach((trip) => {
    const key = keyGetter(trip).trim() || 'Unknown'
    const current = map.get(key) || {
      dimension: key,
      trips: 0,
      totalRevenue: 0,
      upi: 0,
      cash: 0,
      uber: 0,
      tip: 0,
    }
    current.trips += 1
    current.totalRevenue += trip.total
    current.upi += trip.upi
    current.cash += trip.cash
    current.uber += trip.uber
    current.tip += trip.tip
    map.set(key, current)
  })

  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export function RideHailingReports() {
  const defaultSheetUrl =
    'https://docs.google.com/spreadsheets/d/1W89iEvjkkDG9JASIOTDtQE6QSRCtdgzuQb-hXShcy_Y/edit?usp=sharing'
  const sheetUrl = localStorage.getItem('rideHailing.sheetUrl') || defaultSheetUrl
  const spreadsheetId = useMemo(() => parseGoogleSpreadsheetId(sheetUrl), [sheetUrl])
  const { data: columnMap = {} } = useRideHailingColumnMap()
  const [dailyPeriod, setDailyPeriod] = useState<DailyPeriod>('today')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [selectedHub, setSelectedHub] = useState('')
  const [selectedPilot, setSelectedPilot] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('')

  const { data: sheetTabs = [] } = useGoogleSpreadsheetTabs({
    spreadsheetId,
    enabled: !!spreadsheetId,
  })

  const dataTabs = useMemo<GoogleSheetTab[]>(
    () => sheetTabs.filter((t) => !isIndexTabName(t.name)),
    [sheetTabs]
  )

  const { data: rows = [], isLoading, error, isFetching } = useGoogleSheetCsvMulti({
    queryKey: ['ride-hailing-reports', spreadsheetId || 'no-id', String(dataTabs.length)],
    spreadsheetId,
    tabs: dataTabs,
    enabled: !!spreadsheetId,
    refetchIntervalMs: 60_000,
  })

  const trips = useMemo<NormalizedTrip[]>(() => {
    return rows
      .map((r) => {
        const upi = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.upi) || getRowValueByCandidates(r, ['upi']))
        const cash = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.cash) || getRowValueByCandidates(r, ['cash']))
        const uber = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.uber) || getRowValueByCandidates(r, ['uber']))
        const tip = toNumberOrZero(getRowValueByColumnLetter(r, columnMap.tip) || getRowValueByCandidates(r, ['tip']))

        const tsRaw =
          getRowValueByColumnLetter(r, columnMap.timestamp) ||
          getRowValueByCandidates(
            r,
            ['timestamp', 'time stamp', 'submitted at', 'submission time', 'date', 'trip date', 'start date', 'start time']
          )

        const vehicleFromRow = getRowValueByCandidates(
          r,
          ['vehicle number', 'vehicle no', 'number', 'reg no', 'registration', 'cab number']
        )
        const vehicleFromSheet = vehicleNumberFromTabName(r.__sheet || '')

        return {
          timestampDate: parseDateLoose(tsRaw),
          hub:
            getRowValueByColumnLetter(r, columnMap.hub) ||
            getRowValueByCandidates(r, ['hub', 'hub name', 'location', 'branch']),
          pilotId:
            getRowValueByColumnLetter(r, columnMap.pilotId) ||
            getRowValueByCandidates(r, ['pilot id', 'pilotid', 'driver id', 'captain id']),
          service:
            getRowValueByColumnLetter(r, columnMap.service) ||
            getRowValueByCandidates(r, ['service', 'trip type', 'ride type']),
          vehicleNumber: vehicleFromRow || vehicleFromSheet,
          upi,
          cash,
          uber,
          tip,
          total: upi + cash + uber + tip,
        }
      })
      .filter((t) => t.timestampDate !== null)
  }, [rows, columnMap])

  const { effectiveDateFrom, effectiveDateTo } = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    if (dailyPeriod === 'today') {
      return { effectiveDateFrom: startOfToday, effectiveDateTo: endOfToday }
    }
    if (dailyPeriod === 'yesterday') {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 1)
      const end = new Date(endOfToday)
      end.setDate(end.getDate() - 1)
      return { effectiveDateFrom: start, effectiveDateTo: end }
    }
    if (dailyPeriod === 'last_7_days') {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 6)
      return { effectiveDateFrom: start, effectiveDateTo: endOfToday }
    }
    if (dailyPeriod === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { effectiveDateFrom: start, effectiveDateTo: end }
    }
    if (dailyPeriod === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { effectiveDateFrom: start, effectiveDateTo: end }
    }

    const from = customDateFrom ? new Date(`${customDateFrom}T00:00:00`) : null
    const to = customDateTo ? new Date(`${customDateTo}T23:59:59.999`) : null
    return { effectiveDateFrom: from, effectiveDateTo: to }
  }, [dailyPeriod, customDateFrom, customDateTo])

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (!trip.timestampDate) return false
      if (effectiveDateFrom && trip.timestampDate < effectiveDateFrom) return false
      if (effectiveDateTo && trip.timestampDate > effectiveDateTo) return false
      if (selectedHub && trip.hub.trim().toLowerCase() !== selectedHub.trim().toLowerCase()) return false
      if (selectedPilot && trip.pilotId.trim().toLowerCase() !== selectedPilot.trim().toLowerCase()) return false
      if (selectedVehicle && trip.vehicleNumber.trim().toLowerCase() !== selectedVehicle.trim().toLowerCase()) return false
      return true
    })
  }, [trips, effectiveDateFrom, effectiveDateTo, selectedHub, selectedPilot, selectedVehicle])

  const hubOptions = useMemo(
    () => Array.from(new Set(trips.map((t) => t.hub.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [trips]
  )
  const pilotOptions = useMemo(
    () => Array.from(new Set(trips.map((t) => t.pilotId.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [trips]
  )
  const vehicleOptions = useMemo(
    () => Array.from(new Set(trips.map((t) => t.vehicleNumber.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [trips]
  )

  const vehicleReport = useMemo(() => aggregateBy(filteredTrips, (t) => t.vehicleNumber), [filteredTrips])
  const pilotReport = useMemo(() => aggregateBy(filteredTrips, (t) => t.pilotId), [filteredTrips])
  const hubReport = useMemo(() => aggregateBy(filteredTrips, (t) => t.hub), [filteredTrips])
  const serviceReport = useMemo(() => aggregateBy(filteredTrips, (t) => t.service), [filteredTrips])

  const paymentModeReport = useMemo(
    () => [
      { paymentMode: 'UPI', amount: filteredTrips.reduce((sum, t) => sum + t.upi, 0) },
      { paymentMode: 'Cash', amount: filteredTrips.reduce((sum, t) => sum + t.cash, 0) },
      { paymentMode: 'Uber', amount: filteredTrips.reduce((sum, t) => sum + t.uber, 0) },
      { paymentMode: 'Tip', amount: filteredTrips.reduce((sum, t) => sum + t.tip, 0) },
    ],
    [filteredTrips]
  )

  const totalRevenue = paymentModeReport.reduce((sum, p) => sum + p.amount, 0)
  const serviceBreakupForDaily = useMemo(
    () =>
      serviceReport.map((row) => ({
        service: row.dimension,
        rides: row.trips,
        revenue: row.totalRevenue,
      })),
    [serviceReport]
  )

  const ReportTable = ({ title, rows, exportName }: { title: string; rows: AggregateRow[]; exportName: string }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => exportToCSV(rows, exportName)}
          className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-y border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Dimension</th>
              <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Trips</th>
              <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.slice(0, 15).map((r) => (
              <tr key={r.dimension}>
                <td className="px-3 py-2 text-sm text-gray-800">{r.dimension}</td>
                <td className="px-3 py-2 text-sm text-gray-800">{r.trips}</td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">₹{r.totalRevenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="text-sm text-gray-500 mt-2">No data available for selected range.</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Ride Hailing Reports</h1>
        <p className="text-sm text-gray-600 mt-1">Generate trend reports by vehicle, pilot, hub, service, and payment modes.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily report period</label>
            <select
              value={dailyPeriod}
              onChange={(e) => setDailyPeriod(e.target.value as DailyPeriod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Period</option>
            </select>
          </div>
          {dailyPeriod === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date from</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date to</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}
          <div className="flex items-end">
            <div className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              {isFetching ? 'Refreshing...' : 'Auto refresh every 60s'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilot</label>
            <select
              value={selectedPilot}
              onChange={(e) => setSelectedPilot(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Pilots</option>
              {pilotOptions.map((pilot) => (
                <option key={pilot} value={pilot}>
                  {pilot}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Vehicles</option>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle} value={vehicle}>
                  {vehicle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <p className="font-medium text-red-700 mb-2">Failed to load Google Sheet</p>
          <p className="text-sm text-gray-700">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-pulse text-gray-500">Loading ride hailing reports...</div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Daily Report Summary</h3>
              <button
                onClick={() =>
                  exportToCSV(
                    [
                      {
                        period: dailyPeriod,
                        totalRides: filteredTrips.length,
                        totalRevenue,
                        upiRevenue: paymentModeReport.find((p) => p.paymentMode === 'UPI')?.amount || 0,
                        cashRevenue: paymentModeReport.find((p) => p.paymentMode === 'Cash')?.amount || 0,
                        uberRevenue: paymentModeReport.find((p) => p.paymentMode === 'Uber')?.amount || 0,
                        tipRevenue: paymentModeReport.find((p) => p.paymentMode === 'Tip')?.amount || 0,
                      },
                    ],
                    'ride_hailing_daily_report_summary'
                  )
                }
                className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Export Summary CSV
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="px-4 py-3 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-xs text-blue-700 uppercase">Total Rides</p>
                <p className="text-xl font-semibold text-blue-900">{filteredTrips.length}</p>
              </div>
              <div className="px-4 py-3 rounded-lg border border-green-200 bg-green-50">
                <p className="text-xs text-green-700 uppercase">Total Revenue</p>
                <p className="text-xl font-semibold text-green-900">₹{totalRevenue.toFixed(2)}</p>
              </div>
              <div className="px-4 py-3 rounded-lg border border-purple-200 bg-purple-50">
                <p className="text-xs text-purple-700 uppercase">Unique Vehicles</p>
                <p className="text-xl font-semibold text-purple-900">{new Set(filteredTrips.map((t) => t.vehicleNumber).filter(Boolean)).size}</p>
              </div>
              <div className="px-4 py-3 rounded-lg border border-orange-200 bg-orange-50">
                <p className="text-xs text-orange-700 uppercase">Unique Pilots</p>
                <p className="text-xl font-semibold text-orange-900">{new Set(filteredTrips.map((t) => t.pilotId).filter(Boolean)).size}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Service-wise Rides & Revenue Breakup</h3>
              <button
                onClick={() => exportToCSV(serviceBreakupForDaily, 'ride_hailing_service_breakup')}
                className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Service</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Rides</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {serviceBreakupForDaily.map((s) => (
                    <tr key={s.service}>
                      <td className="px-3 py-2 text-sm text-gray-800">{s.service}</td>
                      <td className="px-3 py-2 text-sm text-gray-800">{s.rides}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">₹{s.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Payment Mode Trends</h3>
              <button
                onClick={() => exportToCSV(paymentModeReport, 'ride_hailing_payment_mode_trends')}
                className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Export CSV
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {paymentModeReport.map((p) => (
                <div key={p.paymentMode} className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-xs text-gray-600 uppercase">{p.paymentMode}</p>
                  <p className="text-lg font-semibold text-gray-900">₹{p.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ReportTable title="Vehicle Trends" rows={vehicleReport} exportName="ride_hailing_vehicle_trends" />
            <ReportTable title="Pilot Trends" rows={pilotReport} exportName="ride_hailing_pilot_trends" />
            <ReportTable title="Hub Trends" rows={hubReport} exportName="ride_hailing_hub_trends" />
            <ReportTable title="Service Trends" rows={serviceReport} exportName="ride_hailing_service_trends" />
          </div>
        </>
      )}
    </div>
  )
}

