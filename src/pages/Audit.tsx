import { useState } from 'react'
import {
  useAuditLogs,
  useAuditLogActors,
  useAuditLogObjects,
  useAuditLogActions,
  type AuditLogEntry,
} from '../hooks/useAuditLogs'
import { DateRangeFilter } from '../components/shared/DateRangeFilter'
import { Drawer } from '../components/shared/Drawer'
import { formatAuditSummary, formatDiffJson } from '../utils/auditHelpers'

export function Audit() {
  const [filters, setFilters] = useState<{
    dateFrom?: string
    dateTo?: string
    actor?: string
    object?: string
    action?: string
  }>({})
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data: auditData, isLoading } = useAuditLogs({
    ...filters,
    page,
    pageSize,
  })

  const { data: actors } = useAuditLogActors()
  const { data: objects } = useAuditLogObjects()
  const { data: actions } = useAuditLogActions()

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleRowClick = (entry: AuditLogEntry) => {
    setSelectedEntry(entry)
    setDrawerOpen(true)
  }

  const handleClearFilters = () => {
    setFilters({})
    setPage(1)
  }

  const { before, after, changedFields, isDelete, isCreate } = selectedEntry
    ? formatDiffJson(selectedEntry.diff_json)
    : { before: {}, after: {}, changedFields: [], isDelete: false, isCreate: false }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Audit Log</h1>
        <p className="text-gray-600 mt-1">View all system changes and actions</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Range */}
          <div className="lg:col-span-2">
            <DateRangeFilter
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onDateFromChange={(date) => {
                setFilters((prev) => ({ ...prev, dateFrom: date }))
                setPage(1)
              }}
              onDateToChange={(date) => {
                setFilters((prev) => ({ ...prev, dateTo: date }))
                setPage(1)
              }}
              label="Date Range"
            />
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
            <select
              value={filters.actor || ''}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, actor: e.target.value || undefined }))
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Users</option>
              {actors?.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>

          {/* Object Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Object</label>
            <select
              value={filters.object || ''}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, object: e.target.value || undefined }))
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Objects</option>
              {objects?.map((obj) => (
                <option key={obj} value={obj}>
                  {obj}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, action: e.target.value || undefined }))
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Actions</option>
              {actions?.map((action) => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(filters.dateFrom ||
          filters.dateTo ||
          filters.actor ||
          filters.object ||
          filters.action) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleClearFilters}
              className="text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      ) : auditData && auditData.data.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Object
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Object ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Summary
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditData.data.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => handleRowClick(entry)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(entry.at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.actor_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.object}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {entry.object_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {formatAction(entry.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatAuditSummary(entry)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {auditData.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, auditData.total)}{' '}
                of {auditData.total} entries
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {page} of {auditData.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(auditData.totalPages, p + 1))}
                  disabled={page === auditData.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No audit log entries found</p>
        </div>
      )}

      {/* Details Drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Audit Log Details">
        {selectedEntry && (
          <div className="space-y-6">
            {/* Entry Info */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Timestamp</label>
                <p className="text-gray-900">{formatDateTime(selectedEntry.at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">User</label>
                <p className="text-gray-900">{selectedEntry.actor_name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Object</label>
                <p className="text-gray-900">{selectedEntry.object}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Object ID</label>
                <p className="text-gray-900 font-mono text-sm">{selectedEntry.object_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Action</label>
                <p className="text-gray-900">{formatAction(selectedEntry.action)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Summary</label>
                <p className="text-gray-900">{formatAuditSummary(selectedEntry)}</p>
              </div>
            </div>

            {/* Diff JSON */}
            {selectedEntry.diff_json && Object.keys(selectedEntry.diff_json).length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-text mb-4">
                  {isDelete ? 'Deleted Data' : isCreate ? 'Created Data' : 'Changes'}
                </h3>
                
                {isDelete && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      This record was deleted. Below are all the fields that were present before deletion.
                    </p>
                  </div>
                )}
                
                {isCreate && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      This record was created. Below are all the fields that were set during creation.
                    </p>
                  </div>
                )}

                {changedFields.length > 0 && !isDelete && !isCreate && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{changedFields.length}</strong> field{changedFields.length !== 1 ? 's' : ''} changed: {changedFields.join(', ')}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {Object.keys(before).length > 0 || Object.keys(after).length > 0 ? (
                    // Get all unique keys from both before and after
                    Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).map((key) => {
                      const beforeValue = before[key]
                      const afterValue = after[key]
                      const isChanged = changedFields.includes(key)
                      const hasBefore = beforeValue !== undefined && beforeValue !== null
                      const hasAfter = afterValue !== undefined && afterValue !== null

                      return (
                        <div
                          key={key}
                          className={`p-4 rounded-lg border ${
                            isChanged
                              ? 'bg-yellow-50 border-yellow-300'
                              : isDelete
                              ? 'bg-red-50 border-red-200'
                              : isCreate
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="font-medium text-gray-700 mb-2">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            {isChanged && !isDelete && !isCreate && (
                              <span className="ml-2 text-xs text-yellow-600 font-medium">(Changed)</span>
                            )}
                            {isDelete && hasBefore && (
                              <span className="ml-2 text-xs text-red-600 font-medium">(Deleted)</span>
                            )}
                            {isCreate && hasAfter && (
                              <span className="ml-2 text-xs text-green-600 font-medium">(Created)</span>
                            )}
                          </div>
                          <div className={`grid gap-4 text-sm ${isDelete || isCreate ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {!isCreate && (
                              <div>
                                <div className="text-gray-500 mb-1 font-medium">Before:</div>
                                <div className="font-mono text-gray-900 break-words bg-white p-2 rounded border">
                                  {!hasBefore
                                    ? <span className="text-gray-400 italic">(empty)</span>
                                    : typeof beforeValue === 'object'
                                    ? <pre className="text-xs overflow-auto">{JSON.stringify(beforeValue, null, 2)}</pre>
                                    : String(beforeValue)}
                                </div>
                              </div>
                            )}
                            {!isDelete && (
                              <div>
                                <div className="text-gray-500 mb-1 font-medium">After:</div>
                                <div className="font-mono text-gray-900 break-words bg-white p-2 rounded border">
                                  {!hasAfter
                                    ? <span className="text-gray-400 italic">(empty)</span>
                                    : typeof afterValue === 'object'
                                    ? <pre className="text-xs overflow-auto">{JSON.stringify(afterValue, null, 2)}</pre>
                                    : String(afterValue)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
                      No detailed changes available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw JSON (for debugging) */}
            <div className="border-t border-gray-200 pt-6">
              <details className="cursor-pointer">
                <summary className="text-sm font-medium text-gray-700 mb-2">
                  Raw JSON (for debugging)
                </summary>
                <pre className="mt-2 p-4 bg-gray-50 rounded-lg overflow-auto text-xs font-mono">
                  {JSON.stringify(selectedEntry.diff_json, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

