import { useState, useEffect } from 'react'
import { useCustomers } from '../hooks/useCustomers'
import { useAllDrivers } from '../hooks/useAllDrivers'
import { useAllVehicles } from '../hooks/useAllVehicles'
import { useHubs } from '../hooks/useHubs'
import { useAllBookings } from '../hooks/useAllBookings'
import { useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../hooks/useManageCustomers'
import { useCreateDriver, useUpdateDriver, useDeleteDriver } from '../hooks/useManageDrivers'
import { useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '../hooks/useManageVehicles'
import { useCreateHub, useUpdateHub, useDeleteHub } from '../hooks/useManageHubs'
import { useOperator } from '../hooks/useOperator'
import { PERMISSIONS, type Permission } from '../utils/permissions'
import { useDeleteRide } from '../hooks/useDeleteRide'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../utils/constants'

type TabType = 'customers' | 'drivers' | 'vehicles' | 'hubs' | 'rides'

export function DataManagement() {
  const { can } = useOperator()
  const [activeTab, setActiveTab] = useState<TabType>('customers')
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null)
  const [editingDriver, setEditingDriver] = useState<string | null>(null)
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null)
  const [editingHub, setEditingHub] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Define tabs with their required permissions
  const availableTabs: Array<{ key: TabType; permission: Permission }> = [
    { key: 'customers', permission: PERMISSIONS.VIEW_CUSTOMERS },
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
        <p className="text-gray-600 mt-1">Manage customers, drivers, vehicles, hubs, and rides</p>
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

  const editingCustomer = customers?.find((c) => c.id === editingId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

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

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Customers</h2>
        {can(PERMISSIONS.CREATE_CUSTOMER) && (
          <button
            onClick={onOpenAddModal}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            + Add Customer
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers?.map((customer) => (
                <tr key={customer.id}>
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

  const editingDriver = drivers?.find((d) => d.id === editingId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

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

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Drivers</h2>
        {can(PERMISSIONS.CREATE_DRIVER) && (
          <button
            onClick={onOpenAddModal}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            + Add Driver
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {drivers?.map((driver) => {
                const hub = hubs?.find((h) => h.id === driver.hub_id)
                return (
                  <tr key={driver.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{driver.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{driver.license_no || '-'}</td>
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
  driver: { id: string; name: string; phone: string; license_no: string | null; status: string; hub_id: string | null }
  hubs: Array<{ id: string; name: string }>
  onSave: (data: { name?: string; phone?: string; license_no?: string; status?: string; hub_id?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: driver.name,
    phone: driver.phone,
    license_no: driver.license_no || '',
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
          <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
          <input
            type="text"
            value={formData.license_no}
            onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
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
  onSave: (data: { name: string; phone: string; license_no?: string; status?: string; hub_id?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_no: '',
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
          setFormData({ name: '', phone: '', license_no: '', status: 'active', hub_id: '' })
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
          <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
          <input
            type="text"
            value={formData.license_no}
            onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
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

  const editingVehicle = vehicles?.find((v) => v.id === editingId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

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

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Vehicles</h2>
        {can(PERMISSIONS.CREATE_VEHICLE) && (
          <button
            onClick={onOpenAddModal}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            + Add Vehicle
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
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
                  <tr key={vehicle.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{vehicle.reg_no}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vehicle.make || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vehicle.model || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vehicle.seats}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        vehicle.status === 'available' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                        vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.status}
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
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
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
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
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

  const editingHub = hubs?.find((h) => h.id === editingId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hub?')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  if (editingId && editingHub) {
    return (
      <EditHubForm
        hub={editingHub}
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
      <AddHubForm
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
          onCloseAddModal()
        }}
        onCancel={onCloseAddModal}
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Hubs</h2>
        {can(PERMISSIONS.CREATE_HUB) && (
          <button
            onClick={onOpenAddModal}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            + Add Hub
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latitude</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Longitude</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {hubs?.map((hub) => (
                <tr key={hub.id}>
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
          {hubs?.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hubs found</div>
          )}
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
  const { data: bookings, isLoading } = useAllBookings()
  const { can } = useOperator()
  const deleteMutation = useDeleteRide()
  const navigate = useNavigate()

  const handleDelete = async (rideId: string, rideType: 'subscription' | 'airport' | 'rental' | 'manual') => {
    if (!confirm('Are you sure you want to delete this ride? This action cannot be undone.')) return
    try {
      await deleteMutation.mutateAsync({ rideId, rideType })
      alert('Ride deleted successfully')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleEdit = () => {
    // Navigate to dashboard where user can click on the trip to edit
    navigate(ROUTES.DASHBOARD)
  }

  const canEdit = can(PERMISSIONS.EDIT_RIDE)
  const canDelete = can(PERMISSIONS.DELETE_RIDE)
  const showActions = canEdit || canDelete

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">All Rides</h2>
        <p className="text-sm text-gray-600 mt-1">View all bookings (Subscription, Airport, Rental, Manual)</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
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
                {bookings?.slice(0, 100).map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {booking.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{booking.customer_name || '-'}</td>
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
                            onClick={handleEdit}
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
                ))}
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
    </div>
  )
}

