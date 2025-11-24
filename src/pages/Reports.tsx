import { useState } from 'react'
import { useDailySummary } from '../hooks/useDailySummary'
import { useWeeklySummary } from '../hooks/useWeeklySummary'
import { useHubs } from '../hooks/useHubs'
import { exportToCSV } from '../utils/csvExport'

export function Reports() {
  const [activeTab, setActiveTab] = useState(0)
  
  // Daily report state
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyHub, setDailyHub] = useState<string>('')
  
  // Weekly report state
  const [weeklyStartDate, setWeeklyStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [weeklyEndDate, setWeeklyEndDate] = useState(new Date().toISOString().split('T')[0])
  const [weeklyHub, setWeeklyHub] = useState<string>('')

  // Monthly report state
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1)
  const [monthlyHub, setMonthlyHub] = useState<string>('')

  // Custom report state
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0])
  const [customHub, setCustomHub] = useState<string>('')

  const { data: hubs } = useHubs()
  
  const { data: dailyData, isLoading: dailyLoading } = useDailySummary(
    dailyDate,
    dailyDate,
    dailyHub || null
  )
  
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklySummary(
    weeklyStartDate,
    weeklyEndDate,
    weeklyHub || null
  )

  // Calculate monthly date range
  const monthlyStartDate = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}-01`
  // Get last day of the selected month
  // monthlyMonth is 1-12 (user input), JavaScript Date months are 0-11
  // new Date(year, month, 0) gives last day of (month-1)
  // Example: monthlyMonth=1 (Jan), we need new Date(2024, 2, 0) = Jan 31, 2024
  // So we use monthlyMonth to get the correct month (monthlyMonth=1 means use month 1 in Date, which gives last day of month 0)
  // Actually, we need monthlyMonth+1: monthlyMonth=1 -> Date(2024, 2, 0) = Jan 31
  const monthlyEndDate = new Date(monthlyYear, monthlyMonth + 1, 0).toISOString().split('T')[0]
  
  const { data: monthlyData, isLoading: monthlyLoading } = useDailySummary(
    monthlyStartDate,
    monthlyEndDate,
    monthlyHub || null
  )

  const { data: customData, isLoading: customLoading } = useDailySummary(
    customStartDate,
    customEndDate,
    customHub || null
  )

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const handleDailyExport = () => {
    if (!dailyData || dailyData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = dailyData.map((row) => ({
      Date: formatDate(row.report_date),
      'Total Rides': row.total_rides,
      'Total Revenue (₹)': (row.total_revenue / 100).toFixed(2),
      'Subscription Count': row.subscription_count,
      'Subscription Revenue (₹)': (row.subscription_revenue / 100).toFixed(2),
      'Airport Count': row.airport_count,
      'Airport Revenue (₹)': (row.airport_revenue / 100).toFixed(2),
      'Rental Count': row.rental_count,
      'Rental Revenue (₹)': (row.rental_revenue / 100).toFixed(2),
      'Manual Count': row.manual_count || 0,
      'Manual Revenue (₹)': ((row.manual_revenue || 0) / 100).toFixed(2),
    }))

    exportToCSV(exportData, 'daily_report')
  }

  const handleWeeklyExport = () => {
    if (!weeklyData || weeklyData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = weeklyData.map((row) => ({
      'Week Start': formatDate(row.week_start),
      'Week End': formatDate(row.week_end),
      'Total Rides': row.total_rides,
      'Total Revenue (₹)': (row.total_revenue / 100).toFixed(2),
      'Subscription Count': row.subscription_count,
      'Subscription Revenue (₹)': (row.subscription_revenue / 100).toFixed(2),
      'Airport Count': row.airport_count,
      'Airport Revenue (₹)': (row.airport_revenue / 100).toFixed(2),
      'Rental Count': row.rental_count,
      'Rental Revenue (₹)': (row.rental_revenue / 100).toFixed(2),
      'Manual Count': row.manual_count || 0,
      'Manual Revenue (₹)': ((row.manual_revenue || 0) / 100).toFixed(2),
    }))

    exportToCSV(exportData, 'weekly_report')
  }

  const handleMonthlyExport = () => {
    if (!monthlyData || monthlyData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = monthlyData.map((row) => ({
      Date: formatDate(row.report_date),
      'Total Rides': row.total_rides,
      'Total Revenue (₹)': (row.total_revenue / 100).toFixed(2),
      'Subscription Count': row.subscription_count,
      'Subscription Revenue (₹)': (row.subscription_revenue / 100).toFixed(2),
      'Airport Count': row.airport_count,
      'Airport Revenue (₹)': (row.airport_revenue / 100).toFixed(2),
      'Rental Count': row.rental_count,
      'Rental Revenue (₹)': (row.rental_revenue / 100).toFixed(2),
      'Manual Count': row.manual_count || 0,
      'Manual Revenue (₹)': ((row.manual_revenue || 0) / 100).toFixed(2),
    }))

    exportToCSV(exportData, `monthly_report_${monthlyYear}_${monthlyMonth}`)
  }

  const handleCustomExport = () => {
    if (!customData || customData.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = customData.map((row) => ({
      Date: formatDate(row.report_date),
      'Total Rides': row.total_rides,
      'Total Revenue (₹)': (row.total_revenue / 100).toFixed(2),
      'Subscription Count': row.subscription_count,
      'Subscription Revenue (₹)': (row.subscription_revenue / 100).toFixed(2),
      'Airport Count': row.airport_count,
      'Airport Revenue (₹)': (row.airport_revenue / 100).toFixed(2),
      'Rental Count': row.rental_count,
      'Rental Revenue (₹)': (row.rental_revenue / 100).toFixed(2),
      'Manual Count': row.manual_count || 0,
      'Manual Revenue (₹)': ((row.manual_revenue || 0) / 100).toFixed(2),
    }))

    exportToCSV(exportData, `custom_report_${customStartDate}_to_${customEndDate}`)
  }

  const dailyTotals = dailyData?.reduce(
    (acc, row) => ({
      total_rides: acc.total_rides + row.total_rides,
      total_revenue: acc.total_revenue + row.total_revenue,
      subscription_count: acc.subscription_count + row.subscription_count,
      subscription_revenue: acc.subscription_revenue + row.subscription_revenue,
      airport_count: acc.airport_count + row.airport_count,
      airport_revenue: acc.airport_revenue + row.airport_revenue,
      rental_count: acc.rental_count + row.rental_count,
      rental_revenue: acc.rental_revenue + row.rental_revenue,
      manual_count: acc.manual_count + (row.manual_count || 0),
      manual_revenue: acc.manual_revenue + (row.manual_revenue || 0),
    }),
    {
      total_rides: 0,
      total_revenue: 0,
      subscription_count: 0,
      subscription_revenue: 0,
      airport_count: 0,
      airport_revenue: 0,
      rental_count: 0,
      rental_revenue: 0,
      manual_count: 0,
      manual_revenue: 0,
    }
  ) || {
    total_rides: 0,
    total_revenue: 0,
    subscription_count: 0,
    subscription_revenue: 0,
    airport_count: 0,
    airport_revenue: 0,
    rental_count: 0,
    rental_revenue: 0,
    manual_count: 0,
    manual_revenue: 0,
  }

  const weeklyTotals = weeklyData?.reduce(
    (acc, row) => ({
      total_rides: acc.total_rides + row.total_rides,
      total_revenue: acc.total_revenue + row.total_revenue,
      subscription_count: acc.subscription_count + row.subscription_count,
      subscription_revenue: acc.subscription_revenue + row.subscription_revenue,
      airport_count: acc.airport_count + row.airport_count,
      airport_revenue: acc.airport_revenue + row.airport_revenue,
      rental_count: acc.rental_count + row.rental_count,
      rental_revenue: acc.rental_revenue + row.rental_revenue,
      manual_count: acc.manual_count + (row.manual_count || 0),
      manual_revenue: acc.manual_revenue + (row.manual_revenue || 0),
    }),
    {
      total_rides: 0,
      total_revenue: 0,
      subscription_count: 0,
      subscription_revenue: 0,
      airport_count: 0,
      airport_revenue: 0,
      rental_count: 0,
      rental_revenue: 0,
      manual_count: 0,
      manual_revenue: 0,
    }
  ) || {
    total_rides: 0,
    total_revenue: 0,
    subscription_count: 0,
    subscription_revenue: 0,
    airport_count: 0,
    airport_revenue: 0,
    rental_count: 0,
    rental_revenue: 0,
    manual_count: 0,
    manual_revenue: 0,
  }

  const monthlyTotals = monthlyData?.reduce(
    (acc, row) => ({
      total_rides: acc.total_rides + row.total_rides,
      total_revenue: acc.total_revenue + row.total_revenue,
      subscription_count: acc.subscription_count + row.subscription_count,
      subscription_revenue: acc.subscription_revenue + row.subscription_revenue,
      airport_count: acc.airport_count + row.airport_count,
      airport_revenue: acc.airport_revenue + row.airport_revenue,
      rental_count: acc.rental_count + row.rental_count,
      rental_revenue: acc.rental_revenue + row.rental_revenue,
      manual_count: acc.manual_count + (row.manual_count || 0),
      manual_revenue: acc.manual_revenue + (row.manual_revenue || 0),
    }),
    {
      total_rides: 0,
      total_revenue: 0,
      subscription_count: 0,
      subscription_revenue: 0,
      airport_count: 0,
      airport_revenue: 0,
      rental_count: 0,
      rental_revenue: 0,
      manual_count: 0,
      manual_revenue: 0,
    }
  ) || {
    total_rides: 0,
    total_revenue: 0,
    subscription_count: 0,
    subscription_revenue: 0,
    airport_count: 0,
    airport_revenue: 0,
    rental_count: 0,
    rental_revenue: 0,
    manual_count: 0,
    manual_revenue: 0,
  }

  const customTotals = customData?.reduce(
    (acc, row) => ({
      total_rides: acc.total_rides + row.total_rides,
      total_revenue: acc.total_revenue + row.total_revenue,
      subscription_count: acc.subscription_count + row.subscription_count,
      subscription_revenue: acc.subscription_revenue + row.subscription_revenue,
      airport_count: acc.airport_count + row.airport_count,
      airport_revenue: acc.airport_revenue + row.airport_revenue,
      rental_count: acc.rental_count + row.rental_count,
      rental_revenue: acc.rental_revenue + row.rental_revenue,
      manual_count: acc.manual_count + (row.manual_count || 0),
      manual_revenue: acc.manual_revenue + (row.manual_revenue || 0),
    }),
    {
      total_rides: 0,
      total_revenue: 0,
      subscription_count: 0,
      subscription_revenue: 0,
      airport_count: 0,
      airport_revenue: 0,
      rental_count: 0,
      rental_revenue: 0,
      manual_count: 0,
      manual_revenue: 0,
    }
  ) || {
    total_rides: 0,
    total_revenue: 0,
    subscription_count: 0,
    subscription_revenue: 0,
    airport_count: 0,
    airport_revenue: 0,
    rental_count: 0,
    rental_revenue: 0,
    manual_count: 0,
    manual_revenue: 0,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Reports</h1>
        <p className="text-gray-600 mt-1">Daily, weekly, monthly, and custom summaries</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab(0)}
            className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors ${
              activeTab === 0
                ? 'bg-white text-primary shadow'
                : 'text-gray-700 hover:bg-white/[0.12] hover:text-text'
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors ${
              activeTab === 1
                ? 'bg-white text-primary shadow'
                : 'text-gray-700 hover:bg-white/[0.12] hover:text-text'
            }`}
          >
            Weekly Report
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors ${
              activeTab === 2
                ? 'bg-white text-primary shadow'
                : 'text-gray-700 hover:bg-white/[0.12] hover:text-text'
            }`}
          >
            Monthly Report
          </button>
          <button
            onClick={() => setActiveTab(3)}
            className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors ${
              activeTab === 3
                ? 'bg-white text-primary shadow'
                : 'text-gray-700 hover:bg-white/[0.12] hover:text-text'
            }`}
          >
            Custom Report
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 0 && (
        <div>
            <div className="space-y-6">
              {/* Inputs */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={dailyDate}
                      onChange={(e) => setDailyDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                    <select
                      value={dailyHub}
                      onChange={(e) => setDailyHub(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">All Hubs</option>
                      {hubs?.map((hub) => (
                        <option key={hub.id} value={hub.id}>
                          {hub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleDailyExport}
                      disabled={!dailyData || dailyData.length === 0}
                      className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Daily Report Table */}
              {dailyLoading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : dailyData && dailyData.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Rides
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Revenue
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subscription
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Airport
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rental
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Manual Ride
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dailyData.map((row) => (
                          <tr key={row.report_date}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(row.report_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {row.total_rides}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(row.total_revenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.subscription_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.subscription_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.airport_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.airport_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.rental_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.rental_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.manual_count || 0} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.manual_revenue || 0)}</div>
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {dailyTotals.total_rides}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(dailyTotals.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{dailyTotals.subscription_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(dailyTotals.subscription_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{dailyTotals.airport_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(dailyTotals.airport_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{dailyTotals.rental_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(dailyTotals.rental_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{dailyTotals.manual_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(dailyTotals.manual_revenue)}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No data available for selected date</p>
                </div>
              )}
            </div>
        </div>
      )}

      {activeTab === 1 && (
        <div>
            <div className="space-y-6">
              {/* Inputs */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={weeklyStartDate}
                      onChange={(e) => setWeeklyStartDate(e.target.value)}
                      max={weeklyEndDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={weeklyEndDate}
                      onChange={(e) => setWeeklyEndDate(e.target.value)}
                      min={weeklyStartDate}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                    <select
                      value={weeklyHub}
                      onChange={(e) => setWeeklyHub(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">All Hubs</option>
                      {hubs?.map((hub) => (
                        <option key={hub.id} value={hub.id}>
                          {hub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleWeeklyExport}
                      disabled={!weeklyData || weeklyData.length === 0}
                      className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekly Report Table */}
              {weeklyLoading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : weeklyData && weeklyData.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Week Start
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Week End
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Rides
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Revenue
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subscription
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Airport
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rental
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Manual Ride
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {weeklyData.map((row, index) => (
                          <tr key={`${row.week_start}-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(row.week_start)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(row.week_end)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {row.total_rides}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(row.total_revenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.subscription_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.subscription_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.airport_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.airport_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.rental_count} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.rental_revenue)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              <div>{row.manual_count || 0} rides</div>
                              <div className="text-xs text-gray-500">{formatCurrency(row.manual_revenue || 0)}</div>
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {weeklyTotals.total_rides}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(weeklyTotals.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{weeklyTotals.subscription_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(weeklyTotals.subscription_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{weeklyTotals.airport_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(weeklyTotals.airport_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{weeklyTotals.rental_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(weeklyTotals.rental_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{weeklyTotals.manual_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(weeklyTotals.manual_revenue)}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No data available for selected date range</p>
                </div>
              )}
            </div>
        </div>
      )}

      {activeTab === 2 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={monthlyYear}
                    onChange={(e) => setMonthlyYear(parseInt(e.target.value) || new Date().getFullYear())}
                    min="2020"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                  <select
                    value={monthlyHub}
                    onChange={(e) => setMonthlyHub(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Hubs</option>
                    {hubs?.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleMonthlyExport}
                    disabled={!monthlyData || monthlyData.length === 0}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Monthly Report Table */}
            {monthlyLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : monthlyData && monthlyData.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Rides
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Revenue
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subscription
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Airport
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rental
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manual Ride
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyData.map((row) => (
                        <tr key={row.report_date}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(row.report_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {row.total_rides}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(row.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.subscription_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.subscription_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.airport_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.airport_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.rental_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.rental_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.manual_count || 0} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.manual_revenue || 0)}</div>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {monthlyTotals.total_rides}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(monthlyTotals.total_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{monthlyTotals.subscription_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(monthlyTotals.subscription_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{monthlyTotals.airport_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(monthlyTotals.airport_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{monthlyTotals.rental_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(monthlyTotals.rental_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{monthlyTotals.manual_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(monthlyTotals.manual_revenue)}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No data available for selected month</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div>
          <div className="space-y-6">
            {/* Inputs */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hub (Optional)</label>
                  <select
                    value={customHub}
                    onChange={(e) => setCustomHub(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Hubs</option>
                    {hubs?.map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCustomExport}
                    disabled={!customData || customData.length === 0}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Report Table */}
            {customLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : customData && customData.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Rides
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Revenue
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subscription
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Airport
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rental
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manual Ride
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customData.map((row) => (
                        <tr key={row.report_date}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(row.report_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {row.total_rides}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(row.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.subscription_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.subscription_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.airport_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.airport_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.rental_count} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.rental_revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            <div>{row.manual_count || 0} rides</div>
                            <div className="text-xs text-gray-500">{formatCurrency(row.manual_revenue || 0)}</div>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {customTotals.total_rides}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(customTotals.total_revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{customTotals.subscription_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(customTotals.subscription_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{customTotals.airport_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(customTotals.airport_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{customTotals.rental_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(customTotals.rental_revenue)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>{customTotals.manual_count} rides</div>
                          <div className="text-xs text-gray-500">{formatCurrency(customTotals.manual_revenue)}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No data available for selected date range</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

