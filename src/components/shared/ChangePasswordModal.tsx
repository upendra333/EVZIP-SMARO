import { useState } from 'react'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (oldPassword: string, newPassword: string) => Promise<void>
  requireOldPassword?: boolean
  isLoading?: boolean
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  onSubmit,
  requireOldPassword = true,
  isLoading = false,
}: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (requireOldPassword && !oldPassword.trim()) {
      setError('Please enter your current password')
      return
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password')
      return
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    try {
      await onSubmit(oldPassword, newPassword)
      // Reset form on success
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    }
  }

  const handleClose = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {requireOldPassword ? 'Change Password' : 'Reset Password'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {requireOldPassword && (
            <div>
              <label htmlFor="old-password" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password *
              </label>
              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value)
                  setError('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
              {requireOldPassword ? 'New Password *' : 'New Password *'}
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setError('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter new password"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password *
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

