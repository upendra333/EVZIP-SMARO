import { useState, useEffect } from 'react'
import { useCustomers } from '../hooks/useCustomers'
import { useSubscriptions } from '../hooks/useSubscriptions'
import { useAllDrivers } from '../hooks/useAllDrivers'
import { useAllVehicles } from '../hooks/useAllVehicles'
import { useHubs } from '../hooks/useHubs'
import { useAllBookings } from '../hooks/useAllBookings'
import { useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../hooks/useManageCustomers'
import { useCreateSubscription } from '../hooks/useCreateBooking'
import { useUpdateSubscription, useCancelSubscription, useDeleteSubscription } from '../hooks/useManageSubscriptions'
import { useCreateDriver, useUpdateDriver, useDeleteDriver } from '../hooks/useManageDrivers'
import { useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '../hooks/useManageVehicles'
import { useCreateHub, useUpdateHub, useDeleteHub } from '../hooks/useManageHubs'
import { useOperator } from '../hooks/useOperator'
import { PERMISSIONS, type Permission } from '../utils/permissions'
import { useDeleteRide } from '../hooks/useDeleteRide'
import { CustomerNameAutocomplete } from '../components/shared/CustomerNameAutocomplete'
import { TripDrawer } from '../components/shared/TripDrawer'
import type { TripListItem } from '../hooks/useTodayTrips'
import { exportToCSV } from '../utils/csvExport'

type TabType = 'customers' | 'subscriptions' | 'drivers' | 'vehicles' | 'hubs' | 'rides'

export function DataManagement() {
  const { can } = useOperator()
  // Persist active tab in localStorage
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('dataManagementActiveTab')
    return (saved as TabType) || 'customers'
  })
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null)
  const [editingDriver, setEditingDriver] = useState<string | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null)
  const [editingHub, setEditingHub] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dataManagementActiveTab', activeTab)
  }, [activeTab])

  // Define tabs with their required permissions
  const availableTabs: Array<{ key: TabType; permission: Permission }> = [
    { key: 'customers', permission: PERMISSIONS.VIEW_CUSTOMERS },
    { key: 'subscriptions', permission: PERMISSIONS.VIEW_SUBSCRIPTIONS },
    { key: 'drivers', permission: PERMISSIONS.VIEW_DRIVERS },
    { key: 'vehicles', permission: PERMISSIONS.VIEW_VEHICLES },
    { key: 'hubs', permission: PERMISSIONS.VIEW_HUBS },
    { key: 'rides', permission: PERMISSIONS.VIEW_RIDES },
  ]

  // Filter tabs based on permissions
  const visibleTabs = availableTabs.filter((tab) => can(tab.permission))

  // If current active tab is not visible, switch to first visible tab
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key)
    }
  }, [visibleTabs, activeTab])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Data Management</h1>
        <p className="text-gray-600 mt-1">Manage customers, subscriptions, drivers, vehicles, hubs, and rides</p>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 0 && (
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.key.charAt(0).toUpperCase() + tab.key.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'customers' && (
        <CustomersTab
          onEdit={(id) => setEditingCustomer(id)}
          editingId={editingCustomer}
          onCloseEdit={() => setEditingCustomer(null)}
          showAddModal={showAddModal}
          onCloseAddModal={() => setShowAddModal(false)}
          onOpenAddModal={() => setShowAddModal(true)}
        />
      )}
      {activeTab === 'subscriptions' && (
        <SubscriptionsTab
          onEdit={(id) => setEditingCustomer(id)}
          editingId={editingCustomer}
          onCloseEdit={() => setEditingCustomer(null)}
          showAddModal={showAddModal}
          onCloseAddModal={() => setShowAddModal(false)}
          onOpenAddModal={() => setShowAddModal(true)}
        />
      )}
      {activeTab === 'drivers' && (
        <DriversTab
          onEdit={(id) => setEditingDriver(id)}
          editingId={editingDriver}
          onCloseEdit={() => setEditingDriver(null)}
          showAddModal={showAddModal}
          onCloseAddModal={() => setShowAddModal(false)}
          onOpenAddModal={() => setShowAddModal(true)}
        />
      )}
      {activeTab === 'vehicles' && (
        <VehiclesTab
          onEdit={(id) => setEditingVehicle(id)}
          editingId={editingVehicle}
          onCloseEdit={() => setEditingVehicle(null)}
          showAddModal={showAddModal}
          onCloseAddModal={() => setShowAddModal(false)}
          onOpenAddModal={() => setShowAddModal(true)}
        />
      )}
      {activeTab === 'hubs' && (
        <HubsTab
          onEdit={(id) => setEditingHub(id)}
          editingId={editingHub}
          onCloseEdit={() => setEditingHub(null)}
          showAddModal={showAddModal}
          onCloseAddModal={() => setShowAddModal(false)}
          onOpenAddModal={() => setShowAddModal(true)}
        />
      )}
      {activeTab === 'rides' && <RidesTab />}
    </div>
  )
}

// Customers Tab
function CustomersTab({
  onEdit,
  editingId,
  onCloseEdit,
  showAddModal,
  onCloseAddModal,
  onOpenAddModal,
}: {
  onEdit: (id: string) => void
  editingId: string | null
  onCloseEdit: () => void
  showAddModal: boolean
  onCloseAddModal: () => void
  onOpenAddModal: () => void
}) {
  const { data: customers, isLoading } = useCustomers()
  const { can } = useOperator()
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const editingCustomer = customers?.find((c) => c.id === editingId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      await deleteMutation.mutateAsync(id)
      alert('Customer deleted successfully')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} customer(s)? This action cannot be undone.`)) return
    
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)))
      setSelectedIds(new Set())
      alert(`Successfully deleted ${selectedIds.size} customer(s)`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(customers?.map(c => c.id) || []))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const allSelected = customers && customers.length > 0 && selectedIds.size === customers.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < (customers?.length || 0)

  if (editingId && editingCustomer) {
    return (
      <EditCustomerForm
        customer={editingCustomer}
        onSave={async (data) => {
          await updateMutation.mutateAsync({ id: editingId, ...data })
          onCloseEdit()
        }}
        onCancel={onCloseEdit}
      />
    )
  }

  if (showAddModal) {
    return (
      <AddCustomerForm
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
          onCloseAddModal()
        }}
        onCancel={onCloseAddModal}
      />
    )
  }

  const handleExport = () => {
    if (!customers || customers.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = customers.map((customer) => ({
      Name: customer.name,
      Phone: customer.phone || '',
      Email: customer.email || '',
      Notes: customer.notes || '',
    }))

    exportToCSV(exportData, 'customers')
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Customers</h2>
        <div className="flex gap-2">
          {selectedIds.size > 0 && can(PERMISSIONS.DELETE_CUSTOMER) && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </button>
          {can(PERMISSIONS.CREATE_CUSTOMER) && (
            <button
              onClick={onOpenAddModal}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Add Customer
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  {can(PERMISSIONS.DELETE_CUSTOMER) && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers?.map((customer) => (
                <tr key={customer.id} className={selectedIds.has(customer.id) ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3">
                    {can(PERMISSIONS.DELETE_CUSTOMER) && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={(e) => handleSelectItem(customer.id, e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{customer.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.notes || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {can(PERMISSIONS.EDIT_CUSTOMER) && (
                      <button
                        onClick={() => onEdit(customer.id)}
                        className="text-primary hover:text-primary/80 mr-3"
                      >
                        Edit
                      </button>
                    )}
                    {can(PERMISSIONS.DELETE_CUSTOMER) && (
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                    {!can(PERMISSIONS.EDIT_CUSTOMER) && !can(PERMISSIONS.DELETE_CUSTOMER) && (
                      <span className="text-gray-400 text-xs">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers?.length === 0 && (
            <div className="text-center py-8 text-gray-500">No customers found</div>
          )}
        </div>
      )}
    </div>
  )
}

// Subscriptions Tab
function SubscriptionsTab({
  onEdit,
  editingId,
  onCloseEdit,
  showAddModal,
  onCloseAddModal,
  onOpenAddModal,
}: {
  onEdit: (id: string) => void
  editingId: string | null
  onCloseEdit: () => void
  showAddModal: boolean
  onCloseAddModal: () => void
  onOpenAddModal: () => void
}) {
  const { data: subscriptions, isLoading } = useSubscriptions({ includeInactive: true })
  const { can } = useOperator()
  const { data: hubs } = useHubs()
  const createMutation = useCreateSubscription()
  const updateMutation = useUpdateSubscription()
  const cancelMutation = useCancelSubscription()
  const deleteMutation = useDeleteSubscription()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const editingSubscription = subscriptions?.find((s) => s.id === editingId)

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} subscription(s)? This action cannot be undone.`)) return
    
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)))
      setSelectedIds(new Set())
      alert(`Successfully deleted ${selectedIds.size} subscription(s)`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(subscriptions?.map(s => s.id) || []))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const allSelected = subscriptions && subscriptions.length > 0 && selectedIds.size === subscriptions.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < (subscriptions?.length || 0)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const formatCurrency = (paise: number | null) => {
    if (paise === null) return '-'
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  const handleExport = () => {
    if (!subscriptions || subscriptions.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = subscriptions.map((sub) => {
      const hub = hubs?.find((h) => h.id === sub.hub_id)
      return {
        'Customer Name': sub.client_name || '',
        'Start Date': formatDate(sub.start_date),
        'End Date': formatDate(sub.end_date),
        'Pickup': sub.pickup || '',
        'Drop': sub.drop || '',
        'Distance (KM)': sub.distance_km || '',
        'Hub': hub?.name || '',
        'Status': sub.status || '',
      }
    })

    exportToCSV(exportData, 'subscriptions')
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <div className="flex gap-2">
          {selectedIds.size > 0 && can(PERMISSIONS.DELETE_SUBSCRIPTION) && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </button>
          {can(PERMISSIONS.CREATE_SUBSCRIPTION) && (
            <button
              onClick={onOpenAddModal}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Subscription
            </button>
          )}
        </div>
      </div>

      {showAddModal && can(PERMISSIONS.CREATE_SUBSCRIPTION) && (
        <div className="mb-6">
          <AddSubscriptionForm
            onSave={async (data) => {
              await createMutation.mutateAsync(data)
              onCloseAddModal()
            }}
            onCancel={onCloseAddModal}
            hubs={hubs || []}
          />
        </div>
      )}

      {editingSubscription && can(PERMISSIONS.EDIT_SUBSCRIPTION) && (
        <div className="mb-6">
          <EditSubscriptionForm
            subscription={editingSubscription}
            onSave={async (data) => {
              await updateMutation.mutateAsync({ id: editingSubscription.id, ...data })
              onCloseEdit()
            }}
            onCancel={onCloseEdit}
            hubs={hubs || []}
          />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    {can(PERMISSIONS.DELETE_SUBSCRIPTION) && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {(can(PERMISSIONS.EDIT_SUBSCRIPTION) || can(PERMISSIONS.DELETE_SUBSCRIPTION)) && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions?.map((subscription) => (
                  <tr key={subscription.id} className={`hover:bg-gray-50 ${selectedIds.has(subscription.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      {can(PERMISSIONS.DELETE_SUBSCRIPTION) && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(subscription.id)}
                          onChange={(e) => handleSelectItem(subscription.id, e.target.checked)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {subscription.customer?.name || subscription.client_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {subscription.pickup} → {subscription.drop}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(subscription.start_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(subscription.end_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {(subscription.hub as any)?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatCurrency(subscription.subscription_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          subscription.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : subscription.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {subscription.status}
                      </span>
                    </td>
                    {(can(PERMISSIONS.EDIT_SUBSCRIPTION) || can(PERMISSIONS.DELETE_SUBSCRIPTION)) && (
                      <td className="px-4 py-3 text-sm text-right space-x-2">
                        {can(PERMISSIONS.EDIT_SUBSCRIPTION) && (
                          <button
                            onClick={() => onEdit(subscription.id)}
                            className="text-primary hover:text-primary/80 font-medium"
                          >
                            Edit
                          </button>
                        )}
                        {can(PERMISSIONS.DELETE_SUBSCRIPTION) && (
                          <>
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to cancel this subscription? This will mark it as cancelled but keep the record.')) {
                                  await cancelMutation.mutateAsync(subscription.id)
                                }
                              }}
                              className="text-orange-600 hover:text-orange-800 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('⚠️ WARNING: This will permanently delete this subscription and all associated subscription rides. This action cannot be undone. Are you sure?')) {
                                  await deleteMutation.mutateAsync(subscription.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {subscriptions?.length === 0 && (
              <div className="text-center py-8 text-gray-500">No subscriptions found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EditSubscriptionForm({
  subscription,
  onSave,
  onCancel,
  hubs,
}: {
  subscription: any
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  hubs: any[]
}) {
  const [formData, setFormData] = useState({
    start_date: subscription.start_date || '',
    end_date: subscription.end_date || '',
    pickup: subscription.pickup || '',
    drop: subscription.drop || '',
    distance_km: subscription.distance_km || '',
    subscription_amount: subscription.subscription_amount ? subscription.subscription_amount / 100 : '',
    pickup_time: subscription.pickup_time || '',
    preferred_days: subscription.preferred_days || 'Mon-Sun',
    hub_id: subscription.hub_id || '',
    remarks: subscription.remarks || '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Edit Subscription</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({
            ...formData,
            subscription_amount: formData.subscription_amount ? parseFloat(formData.subscription_amount.toString()) * 100 : null,
            distance_km: formData.distance_km ? parseFloat(formData.distance_km.toString()) : null,
            hub_id: formData.hub_id || null,
          })
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup *</label>
          <input
            type="text"
            required
            value={formData.pickup}
            onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Drop *</label>
          <input
            type="text"
            required
            value={formData.drop}
            onChange={(e) => setFormData({ ...formData, drop: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
            <input
              type="number"
              step="0.01"
              value={formData.distance_km}
              onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={formData.subscription_amount}
              onChange={(e) => setFormData({ ...formData, subscription_amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time</label>
            <input
              type="time"
              value={formData.pickup_time}
              onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Days</label>
            <select
              value={formData.preferred_days}
              onChange={(e) => setFormData({ ...formData, preferred_days: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Mon-Fri">Mon-Fri</option>
              <option value="Mon-Sat">Mon-Sat</option>
              <option value="Mon-Sun">Mon-Sun</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
          <select
            value={formData.hub_id}
            onChange={(e) => setFormData({ ...formData, hub_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Hub</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function AddSubscriptionForm({
  onSave,
  onCancel,
  hubs,
}: {
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  hubs: any[]
}) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    start_date: '',
    end_date: '',
    pickup: '',
    drop: '',
    distance_km: '',
    subscription_amount: '',
    pickup_time: '',
    preferred_days: 'Mon-Sun' as 'Mon-Fri' | 'Mon-Sat' | 'Mon-Sun',
    hub_id: '',
    remarks: '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Add Subscription</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({
            ...formData,
            subscription_amount: formData.subscription_amount ? parseFloat(formData.subscription_amount.toString()) : undefined,
            distance_km: formData.distance_km ? parseFloat(formData.distance_km.toString()) : undefined,
            hub_id: formData.hub_id || undefined,
            customer_phone: formData.customer_phone || undefined,
          })
          setFormData({
            customer_name: '',
            customer_phone: '',
            start_date: '',
            end_date: '',
            pickup: '',
            drop: '',
            distance_km: '',
            subscription_amount: '',
            pickup_time: '',
            preferred_days: 'Mon-Sun',
            hub_id: '',
            remarks: '',
          })
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <CustomerNameAutocomplete
              value={formData.customer_name}
              onChange={(name, phone) => {
                setFormData({
                  ...formData,
                  customer_name: name,
                  customer_phone: phone || formData.customer_phone,
                })
              }}
              placeholder="Enter customer name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
            <input
              type="text"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup *</label>
          <input
            type="text"
            required
            value={formData.pickup}
            onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Drop *</label>
          <input
            type="text"
            required
            value={formData.drop}
            onChange={(e) => setFormData({ ...formData, drop: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
            <input
              type="number"
              step="0.01"
              value={formData.distance_km}
              onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={formData.subscription_amount}
              onChange={(e) => setFormData({ ...formData, subscription_amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time</label>
            <input
              type="time"
              value={formData.pickup_time}
              onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Days</label>
            <select
              value={formData.preferred_days}
              onChange={(e) => setFormData({ ...formData, preferred_days: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Mon-Fri">Mon-Fri</option>
              <option value="Mon-Sat">Mon-Sat</option>
              <option value="Mon-Sun">Mon-Sun</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
          <select
            value={formData.hub_id}
            onChange={(e) => setFormData({ ...formData, hub_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Hub</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

function EditCustomerForm({
  customer,
  onSave,
  onCancel,
}: {
  customer: { id: string; name: string; phone: string | null; email: string | null; notes: string | null }
  onSave: (data: { name: string; phone?: string; email?: string; notes?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone || '',
    email: customer.email || '',
    notes: customer.notes || '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Edit Customer</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave(formData)
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function AddCustomerForm({
  onSave,
  onCancel,
}: {
  onSave: (data: { name: string; phone?: string; email?: string; notes?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Add Customer</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave(formData)
          setFormData({ name: '', phone: '', email: '', notes: '' })
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

// Drivers Tab
function DriversTab({
  onEdit,
  editingId,
  onCloseEdit,
  showAddModal,
  onCloseAddModal,
  onOpenAddModal,
}: {
  onEdit: (id: string) => void
  editingId: string | null
  onCloseEdit: () => void
  showAddModal: boolean
  onCloseAddModal: () => void
  onOpenAddModal: () => void
}) {
  const { data: drivers, isLoading } = useAllDrivers()
  const { data: hubs } = useHubs()
  const { can } = useOperator()
  const createMutation = useCreateDriver()
  const updateMutation = useUpdateDriver()
  const deleteMutation = useDeleteDriver()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const editingDriver = drivers?.find((d) => d.id === editingId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} driver(s)? This action cannot be undone.`)) return
    
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)))
      setSelectedIds(new Set())
      alert(`Successfully deleted ${selectedIds.size} driver(s)`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(drivers?.map(d => d.id) || []))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const allSelected = drivers && drivers.length > 0 && selectedIds.size === drivers.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < (drivers?.length || 0)

  if (editingId && editingDriver) {
    return (
      <EditDriverForm
        driver={editingDriver}
        hubs={hubs || []}
        onSave={async (data) => {
          await updateMutation.mutateAsync({ id: editingId, ...data })
          onCloseEdit()
        }}
        onCancel={onCloseEdit}
      />
    )
  }

  if (showAddModal) {
    return (
      <AddDriverForm
        hubs={hubs || []}
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
          onCloseAddModal()
        }}
        onCancel={onCloseAddModal}
      />
    )
  }

  const handleExport = () => {
    if (!drivers || drivers.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = drivers.map((driver) => {
      const hub = hubs?.find((h) => h.id === driver.hub_id)
      return {
        'Driver ID': driver.driver_id || '',
        'Name': driver.name,
        'Phone': driver.phone,
        'Status': driver.status || '',
        'Hub': hub?.name || '',
      }
    })

    exportToCSV(exportData, 'drivers')
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Drivers</h2>
        <div className="flex gap-2">
          {selectedIds.size > 0 && can(PERMISSIONS.DELETE_DRIVER) && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </button>
          {can(PERMISSIONS.CREATE_DRIVER) && (
            <button
              onClick={onOpenAddModal}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Add Driver
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  {can(PERMISSIONS.DELETE_DRIVER) && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {drivers?.map((driver) => {
                const hub = hubs?.find((h) => h.id === driver.hub_id)
                return (
                  <tr key={driver.id} className={selectedIds.has(driver.id) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3">
                      {can(PERMISSIONS.DELETE_DRIVER) && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(driver.id)}
                          onChange={(e) => handleSelectItem(driver.id, e.target.checked)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">{driver.driver_id || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{driver.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.phone}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        driver.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{hub?.name || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {can(PERMISSIONS.EDIT_DRIVER) && (
                        <button
                          onClick={() => onEdit(driver.id)}
                          className="text-primary hover:text-primary/80 mr-3"
                        >
                          Edit
                        </button>
                      )}
                      {can(PERMISSIONS.DELETE_DRIVER) && (
                        <button
                          onClick={() => handleDelete(driver.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                      {!can(PERMISSIONS.EDIT_DRIVER) && !can(PERMISSIONS.DELETE_DRIVER) && (
                        <span className="text-gray-400 text-xs">No actions</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {drivers?.length === 0 && (
            <div className="text-center py-8 text-gray-500">No drivers found</div>
          )}
        </div>
      )}
    </div>
  )
}

function EditDriverForm({
  driver,
  hubs,
  onSave,
  onCancel,
}: {
  driver: { id: string; name: string; phone: string; driver_id: string | null; status: string; hub_id: string | null }
  hubs: Array<{ id: string; name: string }>
  onSave: (data: { name?: string; phone?: string; driver_id?: string; status?: string; hub_id?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: driver.name,
    phone: driver.phone,
    driver_id: driver.driver_id || '',
    status: driver.status,
    hub_id: driver.hub_id || '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Edit Driver</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({ ...formData, hub_id: formData.hub_id || undefined })
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            type="text"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
          <select
            value={formData.hub_id}
            onChange={(e) => setFormData({ ...formData, hub_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">None</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function AddDriverForm({
  hubs,
  onSave,
  onCancel,
}: {
  hubs: Array<{ id: string; name: string }>
  onSave: (data: { name: string; phone: string; driver_id?: string; status?: string; hub_id?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    driver_id: '',
    status: 'active',
    hub_id: '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Add Driver</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({ ...formData, hub_id: formData.hub_id || undefined })
          setFormData({ name: '', phone: '', driver_id: '', status: 'active', hub_id: '' })
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            type="text"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Driver ID</label>
          <input
            type="text"
            value={formData.driver_id}
            onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., DRV001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
          <select
            value={formData.hub_id}
            onChange={(e) => setFormData({ ...formData, hub_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">None</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

// Vehicles Tab
function VehiclesTab({
  onEdit,
  editingId,
  onCloseEdit,
  showAddModal,
  onCloseAddModal,
  onOpenAddModal,
}: {
  onEdit: (id: string) => void
  editingId: string | null
  onCloseEdit: () => void
  showAddModal: boolean
  onCloseAddModal: () => void
  onOpenAddModal: () => void
}) {
  const { data: vehicles, isLoading } = useAllVehicles()
  const { data: hubs } = useHubs()
  const { can } = useOperator()
  const createMutation = useCreateVehicle()
  const updateMutation = useUpdateVehicle()
  const deleteMutation = useDeleteVehicle()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const editingVehicle = vehicles?.find((v) => v.id === editingId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} vehicle(s)? This action cannot be undone.`)) return
    
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)))
      setSelectedIds(new Set())
      alert(`Successfully deleted ${selectedIds.size} vehicle(s)`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(vehicles?.map(v => v.id) || []))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const allSelected = vehicles && vehicles.length > 0 && selectedIds.size === vehicles.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < (vehicles?.length || 0)

  if (editingId && editingVehicle) {
    return (
      <EditVehicleForm
        vehicle={editingVehicle}
        hubs={hubs || []}
        onSave={async (data) => {
          await updateMutation.mutateAsync({ id: editingId, ...data })
          onCloseEdit()
        }}
        onCancel={onCloseEdit}
      />
    )
  }

  if (showAddModal) {
    return (
      <AddVehicleForm
        hubs={hubs || []}
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
          onCloseAddModal()
        }}
        onCancel={onCloseAddModal}
      />
    )
  }

  const handleExport = () => {
    if (!vehicles || vehicles.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = vehicles.map((vehicle) => {
      const hub = hubs?.find((h) => h.id === vehicle.current_hub_id)
      return {
        'Reg No': vehicle.reg_no,
        'Make': vehicle.make || '',
        'Model': vehicle.model || '',
        'Seats': vehicle.seats,
        'Status': vehicle.status === 'available' ? 'Available' :
                  vehicle.status === 'ets' ? 'ETS' :
                  vehicle.status === 'service' ? 'Service' :
                  vehicle.status,
        'Hub': hub?.name || '',
      }
    })

    exportToCSV(exportData, 'vehicles')
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Vehicles</h2>
        <div className="flex gap-2">
          {selectedIds.size > 0 && can(PERMISSIONS.DELETE_VEHICLE) && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </button>
          {can(PERMISSIONS.CREATE_VEHICLE) && (
            <button
              onClick={onOpenAddModal}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Add Vehicle
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  {can(PERMISSIONS.DELETE_VEHICLE) && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vehicles?.map((vehicle) => {
                const hub = hubs?.find((h) => h.id === vehicle.current_hub_id)
                return (
                  <tr key={vehicle.id} className={selectedIds.has(vehicle.id) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3">
                      {can(PERMISSIONS.DELETE_VEHICLE) && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(vehicle.id)}
                          onChange={(e) => handleSelectItem(vehicle.id, e.target.checked)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{vehicle.reg_no}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vehicle.make || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vehicle.model || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vehicle.seats}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        vehicle.status === 'available' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'ets' ? 'bg-blue-100 text-blue-800' :
                        vehicle.status === 'service' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.status === 'available' ? 'Available' :
                         vehicle.status === 'ets' ? 'ETS' :
                         vehicle.status === 'service' ? 'Service' :
                         vehicle.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{hub?.name || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {can(PERMISSIONS.EDIT_VEHICLE) && (
                        <button
                          onClick={() => onEdit(vehicle.id)}
                          className="text-primary hover:text-primary/80 mr-3"
                        >
                          Edit
                        </button>
                      )}
                      {can(PERMISSIONS.DELETE_VEHICLE) && (
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                      {!can(PERMISSIONS.EDIT_VEHICLE) && !can(PERMISSIONS.DELETE_VEHICLE) && (
                        <span className="text-gray-400 text-xs">No actions</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {vehicles?.length === 0 && (
            <div className="text-center py-8 text-gray-500">No vehicles found</div>
          )}
        </div>
      )}
    </div>
  )
}

function EditVehicleForm({
  vehicle,
  hubs,
  onSave,
  onCancel,
}: {
  vehicle: { id: string; reg_no: string; make: string | null; model: string | null; seats: number; status: string; current_hub_id: string | null }
  hubs: Array<{ id: string; name: string }>
  onSave: (data: { reg_no?: string; make?: string; model?: string; seats?: number; status?: string; current_hub_id?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    reg_no: vehicle.reg_no,
    make: vehicle.make || '',
    model: vehicle.model || '',
    seats: vehicle.seats,
    status: vehicle.status,
    current_hub_id: vehicle.current_hub_id || '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Edit Vehicle</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({ ...formData, current_hub_id: formData.current_hub_id || undefined })
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
          <input
            type="text"
            required
            value={formData.reg_no}
            onChange={(e) => setFormData({ ...formData, reg_no: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
          <input
            type="text"
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
          <input
            type="number"
            min="1"
            value={formData.seats}
            onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 4 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="available">Available</option>
            <option value="ets">ETS</option>
            <option value="service">Service</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
          <select
            value={formData.current_hub_id}
            onChange={(e) => setFormData({ ...formData, current_hub_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">None</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function AddVehicleForm({
  hubs,
  onSave,
  onCancel,
}: {
  hubs: Array<{ id: string; name: string }>
  onSave: (data: { reg_no: string; make?: string; model?: string; seats?: number; status?: string; current_hub_id?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    reg_no: '',
    make: '',
    model: '',
    seats: 4,
    status: 'available',
    current_hub_id: '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Add Vehicle</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({ ...formData, current_hub_id: formData.current_hub_id || undefined })
          setFormData({ reg_no: '', make: '', model: '', seats: 4, status: 'available', current_hub_id: '' })
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
          <input
            type="text"
            required
            value={formData.reg_no}
            onChange={(e) => setFormData({ ...formData, reg_no: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
          <input
            type="text"
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
          <input
            type="number"
            min="1"
            value={formData.seats}
            onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 4 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="available">Available</option>
            <option value="ets">ETS</option>
            <option value="service">Service</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
          <select
            value={formData.current_hub_id}
            onChange={(e) => setFormData({ ...formData, current_hub_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">None</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

// Hubs Tab
function HubsTab({
  onEdit,
  editingId,
  onCloseEdit,
  showAddModal,
  onCloseAddModal,
  onOpenAddModal,
}: {
  onEdit: (id: string) => void
  editingId: string | null
  onCloseEdit: () => void
  showAddModal: boolean
  onCloseAddModal: () => void
  onOpenAddModal: () => void
}) {
  const { data: hubs, isLoading } = useHubs()
  const { can } = useOperator()
  const createMutation = useCreateHub()
  const updateMutation = useUpdateHub()
  const deleteMutation = useDeleteHub()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const editingHub = hubs?.find((h) => h.id === editingId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hub?')) return
    try {
      await deleteMutation.mutateAsync(id)
      alert('Hub deleted successfully')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} hub(s)? This action cannot be undone.`)) return
    
    try {
      const count = selectedIds.size
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)))
      setSelectedIds(new Set())
      alert(`Successfully deleted ${count} hub(s)`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(hubs?.map(h => h.id) || []))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const allSelected = hubs && hubs.length > 0 && selectedIds.size === hubs.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < (hubs?.length || 0)

  if (editingId && editingHub) {
    return (
      <EditHubForm
        hub={editingHub}
        onSave={async (data) => {
          try {
            await updateMutation.mutateAsync({ id: editingId, ...data })
            alert('Hub updated successfully')
            onCloseEdit()
          } catch (error: any) {
            alert(`Error: ${error.message}`)
          }
        }}
        onCancel={onCloseEdit}
      />
    )
  }

  if (showAddModal) {
    return (
      <AddHubForm
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
          onCloseAddModal()
        }}
        onCancel={onCloseAddModal}
      />
    )
  }

  const handleExport = () => {
    if (!hubs || hubs.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = hubs.map((hub) => ({
      'Name': hub.name,
      'City': hub.city || '',
      'Latitude': hub.lat || '',
      'Longitude': hub.lng || '',
    }))

    exportToCSV(exportData, 'hubs')
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Hubs</h2>
        <div className="flex gap-2">
          {selectedIds.size > 0 && can(PERMISSIONS.DELETE_HUB) && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </button>
          {can(PERMISSIONS.CREATE_HUB) && (
            <button
              onClick={onOpenAddModal}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Add Hub
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : hubs && hubs.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  {can(PERMISSIONS.DELETE_HUB) && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latitude</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Longitude</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {hubs.map((hub) => (
                <tr key={hub.id} className={selectedIds.has(hub.id) ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3">
                    {can(PERMISSIONS.DELETE_HUB) && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(hub.id)}
                        onChange={(e) => handleSelectItem(hub.id, e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{hub.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{hub.city || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{hub.lat || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{hub.lng || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {can(PERMISSIONS.EDIT_HUB) && (
                      <button
                        onClick={() => onEdit(hub.id)}
                        className="text-primary hover:text-primary/80 mr-3"
                      >
                        Edit
                      </button>
                    )}
                    {can(PERMISSIONS.DELETE_HUB) && (
                      <button
                        onClick={() => handleDelete(hub.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                    {!can(PERMISSIONS.EDIT_HUB) && !can(PERMISSIONS.DELETE_HUB) && (
                      <span className="text-gray-400 text-xs">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium mb-2">No hubs found</p>
            <p className="text-sm text-gray-400 mb-4">
              {can(PERMISSIONS.CREATE_HUB)
                ? 'Get started by adding your first hub.'
                : 'No hubs are available. Contact an administrator to add hubs.'}
            </p>
            {can(PERMISSIONS.CREATE_HUB) && (
              <button
                onClick={onOpenAddModal}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                + Add Hub
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EditHubForm({
  hub,
  onSave,
  onCancel,
}: {
  hub: { id: string; name: string; city: string | null; lat: number | null; lng: number | null }
  onSave: (data: { name?: string; city?: string; lat?: number; lng?: number }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: hub.name,
    city: hub.city || '',
    lat: hub.lat?.toString() || '',
    lng: hub.lng?.toString() || '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Edit Hub</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({
            ...formData,
            lat: formData.lat ? parseFloat(formData.lat) : undefined,
            lng: formData.lng ? parseFloat(formData.lng) : undefined,
          })
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={formData.lng}
              onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function AddHubForm({
  onSave,
  onCancel,
}: {
  onSave: (data: { name: string; city?: string; lat?: number; lng?: number }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    lat: '',
    lng: '',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Add Hub</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({
            ...formData,
            lat: formData.lat ? parseFloat(formData.lat) : undefined,
            lng: formData.lng ? parseFloat(formData.lng) : undefined,
          })
          setFormData({ name: '', city: '', lat: '', lng: '' })
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={formData.lng}
              onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

// Rides Tab
function RidesTab() {
  const { can } = useOperator()
  const [selectedTrip, setSelectedTrip] = useState<TripListItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRides, setSelectedRides] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    customer: '',
    customerPhone: '',
    hub: '',
    driver: '',
    vehicle: '',
  })
  const { data: hubs } = useHubs()
  const { data: bookings, isLoading } = useAllBookings({
    showAllRides: true, // Show all rides regardless of date
    includePastIncomplete: true, // Always show incomplete trips, we'll mark old ones in the UI
    includeYesterdayIncomplete: false, // Don't show yesterday's incomplete trips here (only in Dashboard)
    type: filters.type || undefined,
    status: filters.status || undefined,
    customer: filters.customer || undefined,
    customerPhone: filters.customerPhone || undefined,
    hub: filters.hub || undefined,
    driver: filters.driver || undefined,
    vehicle: filters.vehicle || undefined,
  })
  const deleteMutation = useDeleteRide()

  const handleDelete = async (rideId: string, rideType: 'subscription' | 'airport' | 'rental' | 'manual') => {
    if (!confirm('Are you sure you want to delete this ride? This action cannot be undone.')) return
    try {
      console.log('Deleting ride:', { rideId, rideType })
      await deleteMutation.mutateAsync({ rideId, rideType })
      console.log('Ride deleted successfully')
      alert('Ride deleted successfully')
    } catch (error: any) {
      console.error('Error deleting ride:', error)
      alert(`Error: ${error.message || 'Failed to delete ride'}`)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRides.size === 0) return
    const count = selectedRides.size
    if (!confirm(`Are you sure you want to delete ${count} ride(s)? This action cannot be undone.`)) return
    
    try {
      console.log('Bulk deleting rides:', Array.from(selectedRides))
      const deletePromises = Array.from(selectedRides).map(key => {
        const [rideId, rideType] = key.split('|')
        console.log('Deleting:', { rideId, rideType })
        return deleteMutation.mutateAsync({ rideId, rideType: rideType.toLowerCase() as 'subscription' | 'airport' | 'rental' | 'manual' })
      })
      await Promise.all(deletePromises)
      setSelectedRides(new Set())
      console.log('All rides deleted successfully')
      alert(`Successfully deleted ${count} ride(s)`)
    } catch (error: any) {
      console.error('Error in bulk delete:', error)
      alert(`Error: ${error.message || 'Failed to delete some rides'}`)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && bookings) {
      const allKeys = bookings.map(b => `${b.id}|${b.type}`)
      setSelectedRides(new Set(allKeys))
    } else {
      setSelectedRides(new Set())
    }
  }

  const handleSelectItem = (key: string, checked: boolean) => {
    const newSelected = new Set(selectedRides)
    if (checked) {
      newSelected.add(key)
    } else {
      newSelected.delete(key)
    }
    setSelectedRides(newSelected)
  }

  const allSelected = bookings && bookings.length > 0 && selectedRides.size === bookings.length
  const someSelected = selectedRides.size > 0 && selectedRides.size < (bookings?.length || 0)

  const handleEdit = (booking: TripListItem) => {
    setSelectedTrip(booking)
    setDrawerOpen(true)
  }

  const canEdit = can(PERMISSIONS.EDIT_RIDE)
  const canDelete = can(PERMISSIONS.DELETE_RIDE)
  const showActions = canEdit || canDelete

  // Helper function to check if a trip is incomplete and older than 1 day
  const isIncompleteAndOld = (booking: TripListItem) => {
    if (!booking.start_time) return false
    const incompleteStatuses = ['created', 'assigned', 'enroute']
    if (!incompleteStatuses.includes(booking.status)) return false
    
    const tripDate = new Date(booking.start_time)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    return tripDate < yesterday
  }

  const handleExport = () => {
    if (!bookings || bookings.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = bookings.map((booking) => {
      const startTime = booking.start_time ? new Date(booking.start_time) : null
      return {
        'Type': booking.type,
        'Customer Name': booking.customer_name || '',
        'Customer Phone': booking.customer_phone || '',
        'Start Time': startTime ? startTime.toLocaleString('en-IN') : '',
        'Hub': booking.hub_name || '',
        'Route': booking.route || '',
        'Driver': booking.driver_name || '',
        'Vehicle': booking.vehicle_reg || '',
        'Status': booking.status,
        'Fare (₹)': booking.fare ? (booking.fare / 100).toFixed(2) : '',
        'Est KM': booking.est_km || '',
        'Actual KM': booking.actual_km || '',
      }
    })

    exportToCSV(exportData, 'rides')
  }

  const hasActiveFilters = filters.type || filters.status || filters.customer || filters.customerPhone || filters.hub || filters.driver || filters.vehicle

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      customer: '',
      customerPhone: '',
      hub: '',
      driver: '',
      vehicle: '',
    })
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">All Rides</h2>
          <p className="text-sm text-gray-600 mt-1">View all bookings (Subscription, Airport, Rental, Manual)</p>
        </div>
        <div className="flex items-center gap-4">
          {selectedRides.size > 0 && can(PERMISSIONS.DELETE_RIDE) && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Selected ({selectedRides.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="subscription">Subscription</option>
              <option value="airport">Airport</option>
              <option value="rental">Rental</option>
              <option value="manual">Manual Ride</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="created">Created</option>
              <option value="assigned">Assigned</option>
              <option value="enroute">Enroute</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <input
              type="text"
              value={filters.customer}
              onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
              placeholder="Search customer name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Mobile Number Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
            <input
              type="text"
              value={filters.customerPhone}
              onChange={(e) => setFilters({ ...filters, customerPhone: e.target.value })}
              placeholder="Search mobile number..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Hub Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hub</label>
            <select
              value={filters.hub}
              onChange={(e) => setFilters({ ...filters, hub: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Hubs</option>
              {hubs?.map((hub) => (
                <option key={hub.id} value={hub.name}>
                  {hub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Driver Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
            <input
              type="text"
              value={filters.driver}
              onChange={(e) => setFilters({ ...filters, driver: e.target.value })}
              placeholder="Search driver name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Vehicle Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
            <input
              type="text"
              value={filters.vehicle}
              onChange={(e) => setFilters({ ...filters, vehicle: e.target.value })}
              placeholder="Search vehicle reg no..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    {can(PERMISSIONS.DELETE_RIDE) && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fare</th>
                  {showActions && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings?.map((booking) => {
                  const rideKey = `${booking.id}|${booking.type}`
                  const isSelected = selectedRides.has(rideKey)
                  const isOldIncomplete = isIncompleteAndOld(booking)
                  
                  return (
                  <tr key={booking.id} className={`${isOldIncomplete ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''} ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      {can(PERMISSIONS.DELETE_RIDE) && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectItem(rideKey, e.target.checked)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {booking.type}
                      </span>
                      {isOldIncomplete && (
                        <span className="ml-2 px-2 py-1 rounded text-xs bg-red-200 text-red-800 font-semibold" title="Incomplete trip older than 1 day">
                          ⚠️ Old Incomplete
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{booking.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.customer_phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {booking.start_time ? new Date(booking.start_time).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.hub_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.driver_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.vehicle_reg || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'enroute' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {booking.fare ? `₹${(booking.fare / 100).toFixed(2)}` : '-'}
                    </td>
                    {showActions && (
                      <td className="px-4 py-3 text-right text-sm">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(booking)}
                            className="text-primary hover:text-primary/80 mr-3"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(booking.ref_id, booking.type)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-gray-400 text-xs">No actions</span>
                        )}
                      </td>
                    )}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {bookings?.length === 0 && (
            <div className="text-center py-8 text-gray-500">No rides found</div>
          )}
          {bookings && bookings.length > 100 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center border-t border-gray-200">
              Showing first 100 rides. Use Dashboard for full filtering and management.
            </div>
          )}
        </div>
      )}
      
      {/* Trip Drawer */}
      <TripDrawer
        trip={selectedTrip}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedTrip(null)
        }}
      />
    </div>
  )
}

