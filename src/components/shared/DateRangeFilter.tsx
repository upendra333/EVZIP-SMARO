interface DateRangeFilterProps {
  dateFrom?: string
  dateTo?: string
  onDateFromChange: (date: string | undefined) => void
  onDateToChange: (date: string | undefined) => void
  label?: string
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  label = 'Date Range',
}: DateRangeFilterProps) {
  const today = new Date().toISOString().split('T')[0]
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const setQuickRange = (days: number) => {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    onDateFromChange(from)
    onDateToChange(today)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom || ''}
            onChange={(e) => onDateFromChange(e.target.value || undefined)}
            max={dateTo || today}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <input
            type="date"
            value={dateTo || ''}
            onChange={(e) => onDateToChange(e.target.value || undefined)}
            min={dateFrom}
            max={today}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setQuickRange(7)}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => setQuickRange(30)}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Last 30 days
          </button>
          <button
            type="button"
            onClick={() => {
              onDateFromChange(undefined)
              onDateToChange(undefined)
            }}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}

