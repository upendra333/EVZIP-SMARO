import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { ROLES } from '../../utils/constants'
import type { Operator } from '../../utils/types'
import { validateRolePassword, roleRequiresPassword } from '../../utils/rolePasswords'
import type { Role } from '../../utils/types'

interface OperatorModalProps {
  onClose: () => void
  onSetOperator: (name: string, role: string) => void
  currentOperator: Operator | null
}

export function OperatorModal({ onClose, onSetOperator, currentOperator }: OperatorModalProps) {
  const [name, setName] = useState(currentOperator?.name || '')
  const [role, setRole] = useState<string>(currentOperator?.role || ROLES.SUPERVISOR)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    
    if (!name.trim() || !role) {
      return
    }

    // Validate password if role requires it
    if (roleRequiresPassword(role as Role)) {
      if (!password.trim()) {
        setPasswordError('Password is required for this role')
        return
      }
      
      if (!validateRolePassword(role as Role, password)) {
        setPasswordError('Invalid password for this role')
        return
      }
    }

    // Password is valid or not required
    onSetOperator(name.trim(), role)
    setPassword('') // Clear password after successful submission
  }

  const handleRoleChange = (newRole: string) => {
    setRole(newRole)
    setPassword('') // Clear password when role changes
    setPasswordError('') // Clear error when role changes
  }

  const canClose = currentOperator !== null

  return (
    <Dialog open={true} onClose={canClose ? onClose : () => {}} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl p-6">
          <Dialog.Title className="text-xl font-bold text-text mb-4">
            {currentOperator ? 'Switch User' : 'Set User'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="operator-name" className="block text-sm font-medium text-gray-700 mb-2">
                User Name
              </label>
              <input
                id="operator-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label htmlFor="operator-role" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                id="operator-role"
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value={ROLES.READ_ONLY}>Read Only</option>
                <option value={ROLES.SUPERVISOR}>Supervisor</option>
                <option value={ROLES.MANAGER}>Manager</option>
                <option value={ROLES.ADMIN}>Admin</option>
              </select>
            </div>

            {roleRequiresPassword(role as Role) && (
              <div>
                <label htmlFor="operator-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  id="operator-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError('')
                  }}
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    passwordError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder={`Enter ${role} password`}
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {currentOperator ? 'Switch' : 'Continue'}
              </button>
              {canClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

