import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { useSubscriptions } from '../../hooks/useSubscriptions'
import { useCreateSubscriptionRide } from '../../hooks/useCreateBooking'

interface CreateSubscriptionRideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateSubscriptionRideModal({
  isOpen,
  onClose,
}: CreateSubscriptionRideModalProps) {
  const [formData, setFormData] = useState({
    subscription_id: '',
    date: new Date().toISOString().split('T')[0],
    direction: 'to_office',
    est_km: '',
    fare: '',
    notes: '',
  })

  const { data: subscriptions } = useSubscriptions()
  const createMutation = useCreateSubscriptionRide()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subscription_id) {
      alert('Please select a subscription')
      return
    }

    try {
      await createMutation.mutateAsync({
        subscription_id: formData.subscription_id,
        date: formData.date,
        direction: formData.direction,
        est_km: formData.est_km ? parseFloat(formData.est_km) : undefined,
        fare: formData.fare ? parseFloat(formData.fare) : undefined,
        notes: formData.notes || undefined,
      })

      // Reset form
      setFormData({
        subscription_id: '',
        date: new Date().toISOString().split('T')[0],
        direction: 'to_office',
        est_km: '',
        fare: '',
        notes: '',
      })

      onClose()
    } catch (error: any) {
      alert(`Error creating ride: ${error.message}`)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <Dialog.Title className="text-xl font-bold text-text mb-4">
            Create Subscription Ride
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.subscription_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subscription_id: e.target.value }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select subscription...</option>
                {subscriptions?.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.customer?.name || 'Unknown'} - {sub.pickup} → {sub.drop}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direction <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.direction}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, direction: e.target.value }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="to_office">To Office</option>
                <option value="from_office">From Office</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated KM
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.est_km}
                onChange={(e) => setFormData((prev) => ({ ...prev, est_km: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fare (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.fare}
                onChange={(e) => setFormData((prev) => ({ ...prev, fare: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Ride'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

