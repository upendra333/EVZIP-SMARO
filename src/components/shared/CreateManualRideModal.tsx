import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { useCreateManualRide } from '../../hooks/useCreateBooking'
import { useHubs } from '../../hooks/useHubs'
import { CustomerNameAutocomplete } from './CustomerNameAutocomplete'

interface CreateManualRideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateManualRideModal({
  isOpen,
  onClose,
}: CreateManualRideModalProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    pickup_at: '',
    pickup: '',
    drop: '',
    est_km: '',
    fare: '',
    notes: '',
    hub_id: '',
  })

  const { data: hubs } = useHubs()
  const createMutation = useCreateManualRide()

  // Set HQ as default hub when modal opens or hubs load
  useEffect(() => {
    if (isOpen && hubs && hubs.length > 0) {
      const hqHub = hubs.find(hub => hub.name === 'HQ')
      if (hqHub && !formData.hub_id) {
        setFormData(prev => ({ ...prev, hub_id: hqHub.id }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hubs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_name || !formData.pickup_at || !formData.pickup || !formData.drop) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Convert datetime-local to ISO string preserving local time
      // datetime-local format: "YYYY-MM-DDTHH:mm" (no timezone)
      // We need to treat it as local time and convert to ISO with timezone
      let pickupAtISO = ''
      if (formData.pickup_at) {
        // Parse the datetime-local value and create a Date object in local timezone
        const [datePart, timePart] = formData.pickup_at.split('T')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hours, minutes] = timePart.split(':').map(Number)
        
        // Create date object using local time components
        const localDate = new Date(year, month - 1, day, hours, minutes)
        pickupAtISO = localDate.toISOString()
      }

      await createMutation.mutateAsync({
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim() || undefined,
        pickup_at: pickupAtISO,
        pickup: formData.pickup,
        drop: formData.drop,
        est_km: formData.est_km ? parseFloat(formData.est_km) : undefined,
        fare: formData.fare ? parseFloat(formData.fare) : undefined,
        notes: formData.notes || undefined,
        hub_id: formData.hub_id || undefined,
      })

      // Reset form
      setFormData({
        customer_name: '',
        customer_phone: '',
        pickup_at: '',
        pickup: '',
        drop: '',
        est_km: '',
        fare: '',
        notes: '',
        hub_id: '',
      })

      onClose()
    } catch (error: any) {
      alert(`Error creating manual ride: ${error.message}`)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-bold text-text mb-4">
            Create Manual Ride
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <CustomerNameAutocomplete
                value={formData.customer_name}
                onChange={(name, phone) => {
                  setFormData((prev) => ({
                    ...prev,
                    customer_name: name,
                    customer_phone: phone || prev.customer_phone,
                  }))
                }}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, customer_phone: e.target.value }))}
                placeholder="Enter mobile number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.pickup_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, pickup_at: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pickup}
                onChange={(e) => setFormData((prev) => ({ ...prev, pickup: e.target.value }))}
                required
                placeholder="e.g., Address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drop Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.drop}
                onChange={(e) => setFormData((prev) => ({ ...prev, drop: e.target.value }))}
                required
                placeholder="e.g., Address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hub</label>
              <select
                value={formData.hub_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, hub_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select hub...</option>
                {hubs?.map((hub) => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name}
                  </option>
                ))}
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

