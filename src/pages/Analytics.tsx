import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useDailySummary } from '../hooks/useDailySummary'
import { useWeeklySummary } from '../hooks/useWeeklySummary'
import { useAllBookings } from '../hooks/useAllBookings'
import { useHubs } from '../hooks/useHubs'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

const COLORS = ['#6dc7ae', '#4a90e2', '#f5a623', '#d0021b', '#9013fe', '#50e3c2']

export function Analytics() {
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'custom'>('week')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedHub, setSelectedHub] = useState<string>('')
  const [viewType, setViewType] = useState<'daily' | 'weekly'>('daily')

  const { data: hubs } = useHubs()

  // Calculate date range based on selection
  const { fromDate, toDate } = useMemo(() => {
    if (dateRange === 'day') {
      return { fromDate: selectedDate, toDate: selectedDate }
    } else if (dateRange === 'week') {
      const date = new Date(selectedDate)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      return {
        fromDate: weekStart.toISOString().split('T')[0],
        toDate: weekEnd.toISOString().split('T')[0],
      }
    } else if (dateRange === 'month') {
      const date = new Date(selectedDate)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      return {
        fromDate: monthStart.toISOString().split('T')[0],
        toDate: monthEnd.toISOString().split('T')[0],
      }
    } else {
      return { fromDate: startDate, toDate: endDate }
    }
  }, [dateRange, selectedDate, startDate, endDate])

  const hubId = selectedHub || null

  // Fetch summary data
  const { data: dailyData, isLoading: dailyLoading } = useDailySummary(fromDate, toDate, hubId)
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklySummary(fromDate, toDate, hubId)
  const { data: allBookings } = useAllBookings({
    dateFrom: fromDate,
    dateTo: toDate,
    hub: selectedHub || undefined,
  })

  // Fetch payment details for all bookings (for future use)
  const { data: _paymentDetails } = useQuery({
    queryKey: ['paymentDetails', fromDate, toDate, hubId],
    queryFn: async () => {
      if (!allBookings || allBookings.length === 0) return {}
      
      const tripIds = allBookings.map((b) => b.id)
      if (tripIds.length === 0) return {}

      const { data, error } = await supabase
        .from('payments')
        .select('trip_id, method, status, amount')
        .in('trip_id', tripIds)
        .eq('status', 'completed')

      if (error) throw error

      const paymentMap: Record<string, { method: string | null; amount: number | null }> = {}
      data?.forEach((p) => {
        if (!paymentMap[p.trip_id]) {
          paymentMap[p.trip_id] = { method: p.method, amount: p.amount }
        }
      })

      return paymentMap
    },
    enabled: !!allBookings && allBookings.length > 0,
  })

  const summaryData = viewType === 'daily' ? dailyData : weeklyData
  const isLoading = viewType === 'daily' ? dailyLoading : weeklyLoading

  // Prepare chart data
  const revenueTrendData = useMemo(() => {
    if (!summaryData) return []
    return summaryData.map((row) => ({
      date: viewType === 'daily' 
        ? new Date((row as any).report_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : `${new Date((row as any).week_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${new Date((row as any).week_end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
      total: (row.total_revenue || 0) / 100,
      subscription: (row.subscription_revenue || 0) / 100,
      airport: (row.airport_revenue || 0) / 100,
      rental: (row.rental_revenue || 0) / 100,
      manual: (row.manual_revenue || 0) / 100,
    }))
  }, [summaryData, viewType])

  const tripVolumeData = useMemo(() => {
    if (!summaryData) return []
    return summaryData.map((row) => ({
      date: viewType === 'daily' 
        ? new Date((row as any).report_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : `${new Date((row as any).week_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${new Date((row as any).week_end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
      total: row.total_rides || 0,
      subscription: row.subscription_count || 0,
      airport: row.airport_count || 0,
      rental: row.rental_count || 0,
      manual: row.manual_count || 0,
    }))
  }, [summaryData, viewType])

  const revenueByTypeData = useMemo(() => {
    if (!summaryData || summaryData.length === 0) return []
    const totals = summaryData.reduce(
      (acc, row) => ({
        subscription: acc.subscription + (row.subscription_revenue || 0),
        airport: acc.airport + (row.airport_revenue || 0),
        rental: acc.rental + (row.rental_revenue || 0),
        manual: acc.manual + (row.manual_revenue || 0),
      }),
      { subscription: 0, airport: 0, rental: 0, manual: 0 }
    )
    return [
      { name: 'Subscription', value: totals.subscription / 100, count: summaryData.reduce((sum, r) => sum + (r.subscription_count || 0), 0) },
      { name: 'Airport', value: totals.airport / 100, count: summaryData.reduce((sum, r) => sum + (r.airport_count || 0), 0) },
      { name: 'Rental', value: totals.rental / 100, count: summaryData.reduce((sum, r) => sum + (r.rental_count || 0), 0) },
      { name: 'Manual', value: totals.manual / 100, count: summaryData.reduce((sum, r) => sum + (r.manual_count || 0), 0) },
    ]
  }, [summaryData])

  const paymentModeData = useMemo(() => {
    if (!summaryData || summaryData.length === 0) return []
    const totals = summaryData.reduce(
      (acc, row) => ({
        cash: acc.cash + (row.cash_revenue || 0),
        upi: acc.upi + (row.upi_revenue || 0),
        others: acc.others + (row.others_revenue || 0),
      }),
      { cash: 0, upi: 0, others: 0 }
    )
    return [
      { name: 'Cash', value: totals.cash / 100, count: summaryData.reduce((sum, r) => sum + (r.cash_count || 0), 0) },
      { name: 'UPI', value: totals.upi / 100, count: summaryData.reduce((sum, r) => sum + (r.upi_count || 0), 0) },
      { name: 'Others', value: totals.others / 100, count: summaryData.reduce((sum, r) => sum + (r.others_count || 0), 0) },
    ]
  }, [summaryData])

  const hubPerformanceData = useMemo(() => {
    if (!allBookings || !hubs) return []
    
    const hubStats: Record<string, { revenue: number; trips: number; km: number }> = {}
    
    allBookings.forEach((booking) => {
      const hubName = booking.hub_name || 'Unknown'
      const hubId = hubs.find((h) => h.name === hubName)?.id || hubName
      
      if (!hubStats[hubId]) {
        hubStats[hubId] = { revenue: 0, trips: 0, km: 0 }
      }
      
      hubStats[hubId].revenue += booking.fare || 0
      hubStats[hubId].trips += 1
      hubStats[hubId].km += booking.actual_km ?? booking.est_km ?? 0
    })
    
    return Object.entries(hubStats)
      .map(([id, stats]) => ({
        name: hubs.find((h) => h.id === id)?.name || hubs.find((h) => h.name === id)?.name || 'Unknown',
        revenue: stats.revenue / 100,
        trips: stats.trips,
        km: stats.km,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [allBookings, hubs])

  const kmTrendData = useMemo(() => {
    if (!summaryData) return []
    return summaryData.map((row) => ({
      date: viewType === 'daily' 
        ? new Date((row as any).report_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : `${new Date((row as any).week_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${new Date((row as any).week_end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
      total: Number(row.total_km || 0),
      subscription: Number(row.subscription_km || 0),
      airport: Number(row.airport_km || 0),
      rental: Number(row.rental_km || 0),
      manual: Number(row.manual_km || 0),
    }))
  }, [summaryData, viewType])

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (!summaryData || summaryData.length === 0) {
      return {
        totalRevenue: 0,
        totalTrips: 0,
        totalKm: 0,
        avgRevenuePerTrip: 0,
        avgKmPerTrip: 0,
      }
    }
    
    const totals = summaryData.reduce(
      (acc, row) => ({
        revenue: acc.revenue + (row.total_revenue || 0),
        trips: acc.trips + (row.total_rides || 0),
        km: acc.km + Number(row.total_km || 0),
      }),
      { revenue: 0, trips: 0, km: 0 }
    )
    
    return {
      totalRevenue: totals.revenue / 100,
      totalTrips: totals.trips,
      totalKm: totals.km,
      avgRevenuePerTrip: totals.trips > 0 ? (totals.revenue / 100) / totals.trips : 0,
      avgKmPerTrip: totals.trips > 0 ? totals.km / totals.trips : 0,
    }
  }, [summaryData])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === 'day' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {dateRange === 'week' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Week Starting</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {dateRange === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <input
                type="month"
                value={selectedDate.substring(0, 7)}
                onChange={(e) => setSelectedDate(e.target.value + '-01')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hub</label>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Hubs</option>
              {hubs?.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View Type</label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{keyMetrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total Trips</div>
          <div className="text-2xl font-bold text-gray-900">{keyMetrics.totalTrips.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total KM</div>
          <div className="text-2xl font-bold text-gray-900">
            {keyMetrics.totalKm.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Revenue/Trip</div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{keyMetrics.avgRevenuePerTrip.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Avg KM/Trip</div>
          <div className="text-2xl font-bold text-gray-900">
            {keyMetrics.avgKmPerTrip.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-gray-500">Loading analytics data...</div>
        </div>
      ) : (
        <>
          {/* Revenue Trends */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Trends</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#6dc7ae" strokeWidth={2} name="Total Revenue" />
                <Line type="monotone" dataKey="subscription" stroke="#4a90e2" strokeWidth={2} name="Subscription" />
                <Line type="monotone" dataKey="airport" stroke="#f5a623" strokeWidth={2} name="Airport" />
                <Line type="monotone" dataKey="rental" stroke="#d0021b" strokeWidth={2} name="Rental" />
                <Line type="monotone" dataKey="manual" stroke="#9013fe" strokeWidth={2} name="Manual" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trip Volume Trends */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Trip Volume Trends</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={tripVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#6dc7ae" strokeWidth={2} name="Total Trips" />
                <Line type="monotone" dataKey="subscription" stroke="#4a90e2" strokeWidth={2} name="Subscription" />
                <Line type="monotone" dataKey="airport" stroke="#f5a623" strokeWidth={2} name="Airport" />
                <Line type="monotone" dataKey="rental" stroke="#d0021b" strokeWidth={2} name="Rental" />
                <Line type="monotone" dataKey="manual" stroke="#9013fe" strokeWidth={2} name="Manual" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* KM Trends */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Kilometer Trends</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={kmTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} km`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#6dc7ae" strokeWidth={2} name="Total KM" />
                <Line type="monotone" dataKey="subscription" stroke="#4a90e2" strokeWidth={2} name="Subscription" />
                <Line type="monotone" dataKey="airport" stroke="#f5a623" strokeWidth={2} name="Airport" />
                <Line type="monotone" dataKey="rental" stroke="#d0021b" strokeWidth={2} name="Rental" />
                <Line type="monotone" dataKey="manual" stroke="#9013fe" strokeWidth={2} name="Manual" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Trip Type */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Trip Type</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
                  <Legend />
                  <Bar dataKey="value" fill="#6dc7ae" name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {revenueByTypeData.map((item) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name}:</span>
                    <span className="font-medium">
                      ₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({item.count} trips)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Mode Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Mode Breakdown</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentModeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentModeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {paymentModeData.map((item) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name}:</span>
                    <span className="font-medium">
                      ₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({item.count} payments)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hub Performance */}
          {hubPerformanceData.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Hub Performance Comparison</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={hubPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'revenue') return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                      if (name === 'km') return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} km`
                      return value
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#6dc7ae" name="Revenue (₹)" />
                  <Bar yAxisId="right" dataKey="trips" fill="#4a90e2" name="Trips" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {hubPerformanceData.map((hub) => (
                  <div key={hub.name} className="bg-gray-50 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-2">{hub.name}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Revenue: ₹{hub.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                      <div>Trips: {hub.trips}</div>
                      <div>KM: {hub.km.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

