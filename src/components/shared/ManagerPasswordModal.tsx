import { useState } from 'react'
import { Dialog } from '@headlessui/react'

interface ManagerPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onValidate: (password: string) => Promise<boolean>
  isValidating: boolean
}

export function ManagerPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  onValidate,
  isValidating,
}: ManagerPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError('Please enter the manager password')
      return
    }

    const isValid = await onValidate(password)
    if (isValid) {
      setPassword('')
      onSuccess()
    } else {
      setError('Invalid password. Please try again.')
      setPassword('')
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl p-6">
          <Dialog.Title className="text-xl font-bold text-text mb-4">
            Manager Authentication Required
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="manager-password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Manager Password
              </label>
              <input
                id="manager-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                required
                disabled={isValidating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                placeholder="Enter password"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isValidating}
                className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
              >
                {isValidating ? 'Validating...' : 'Authenticate'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isValidating}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

