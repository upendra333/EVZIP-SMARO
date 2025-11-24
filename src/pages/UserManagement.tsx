import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useManageUsers'
import { useHubs } from '../hooks/useHubs'
import { useOperator } from '../hooks/useOperator'
import { PERMISSIONS } from '../utils/permissions'
import { ROLES } from '../utils/constants'
import type { Role } from '../utils/types'
import type { CreateUserData, UpdateUserData } from '../hooks/useManageUsers'

export function UserManagement() {
  const { data: users, isLoading } = useUsers()
  const { data: hubs } = useHubs()
  const { can } = useOperator()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const editingUser = users?.find((u) => u.id === editingUserId)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const canCreate = can(PERMISSIONS.MANAGE_USERS)
  const canEdit = can(PERMISSIONS.MANAGE_USERS)
  const canDelete = can(PERMISSIONS.MANAGE_USERS)

  if (editingUserId && editingUser) {
    return (
      <EditUserForm
        user={{
          ...editingUser,
          email: editingUser.email ?? null,
          phone: editingUser.phone ?? null,
        }}
        hubs={hubs || []}
        onSave={async (data) => {
          await updateMutation.mutateAsync({ id: editingUserId, ...data })
          setEditingUserId(null)
        }}
        onCancel={() => setEditingUserId(null)}
      />
    )
  }

  if (showAddModal) {
    return (
      <AddUserForm
        hubs={hubs || []}
        onSave={async (data) => {
          await createMutation.mutateAsync(data)
          setShowAddModal(false)
        }}
        onCancel={() => setShowAddModal(false)}
      />
    )
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and access permissions</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            + Add User
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hub</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users?.map((user) => {
                const hub = hubs?.find((h) => h.id === user.hub_id)
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">{user.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'supervisor' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{hub?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {canEdit && (
                        <button
                          onClick={() => setEditingUserId(user.id)}
                          className="text-primary hover:text-primary/80 mr-3"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-gray-400 text-xs">No actions</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {users?.length === 0 && (
            <div className="text-center py-8 text-gray-500">No users found</div>
          )}
        </div>
      )}
    </div>
  )
}

function EditUserForm({
  user,
  hubs,
  onSave,
  onCancel,
}: {
  user: { id: string; name: string; username: string; email: string | null | undefined; phone: string | null | undefined; role: Role; hub_id: string | null; status: string }
  hubs: Array<{ id: string; name: string }>
  onSave: (data: UpdateUserData) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: user.name,
    username: user.username,
    password: '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
    hub_id: user.hub_id || '',
    status: user.status,
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Edit User</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const updateData: UpdateUserData = {
            name: formData.name,
            username: formData.username,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            role: formData.role,
            hub_id: formData.hub_id || undefined,
            status: formData.status,
          }
          // Only include password if it's been changed
          if (formData.password.trim()) {
            updateData.password = formData.password
          }
          await onSave(updateData)
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter new password"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={ROLES.READ_ONLY}>Read Only</option>
            <option value={ROLES.SUPERVISOR}>Supervisor</option>
            <option value={ROLES.MANAGER}>Manager</option>
            <option value={ROLES.ADMIN}>Admin</option>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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

function AddUserForm({
  hubs,
  onSave,
  onCancel,
}: {
  hubs: Array<{ id: string; name: string }>
  onSave: (data: CreateUserData) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    role: ROLES.SUPERVISOR as Role,
    hub_id: '',
    status: 'active',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Add User</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({
            name: formData.name,
            username: formData.username,
            password: formData.password,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            role: formData.role,
            hub_id: formData.hub_id || undefined,
            status: formData.status,
          })
          setFormData({ name: '', username: '', password: '', email: '', phone: '', role: ROLES.SUPERVISOR as Role, hub_id: '', status: 'active' })
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., john.doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter password"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={ROLES.READ_ONLY}>Read Only</option>
            <option value={ROLES.SUPERVISOR}>Supervisor</option>
            <option value={ROLES.MANAGER}>Manager</option>
            <option value={ROLES.ADMIN}>Admin</option>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
            Add User
          </button>
        </div>
      </form>
    </div>
  )
}

