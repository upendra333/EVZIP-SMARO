import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { useCreateSubscription } from '../../hooks/useCreateBooking'
import { useHubs } from '../../hooks/useHubs'
import { CustomerNameAutocomplete } from './CustomerNameAutocomplete'

interface CreateSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateSubscriptionModal({
  isOpen,
  onClose,
}: CreateSubscriptionModalProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    subscription_month: '',
    subscription_year: '',
    start_date: '',
    no_of_days: '',
    distance_km: '',
    pickup: '',
    pickup_time: '',
    drop: '',
    subscription_amount: '',
    amount_paid_date: '',
    invoice_no: '',
    end_date: '',
    remarks: '',
    hub_id: '',
    preferred_days: 'Mon-Sun', // Default to all days
  })

  const { data: hubs } = useHubs()
  const createMutation = useCreateSubscription()

  // Set HQ as default hub when modal opens or hubs load
  useEffect(() => {
    if (isOpen && hubs && hubs.length > 0) {
      const hqHub = hubs.find(hub => hub.name === 'HQ')
      if (hqHub && !formData.hub_id) {
        setFormData(prev => ({ ...prev, hub_id: hqHub.id }))
      }
    }
    // Set current month and year as defaults
    if (isOpen) {
      const now = new Date()
      if (!formData.subscription_month) {
        setFormData(prev => ({ ...prev, subscription_month: String(now.getMonth() + 1) }))
      }
      if (!formData.subscription_year) {
        setFormData(prev => ({ ...prev, subscription_year: String(now.getFullYear()) }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hubs])

  // Auto-calculate no_of_days when start_date or end_date changes
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      if (diffDays > 0) {
        setFormData(prev => ({ ...prev, no_of_days: String(diffDays) }))
      }
    }
  }, [formData.start_date, formData.end_date])

  // Auto-calculate month and year from start_date if not manually set
  useEffect(() => {
    if (formData.start_date && !formData.subscription_month) {
      const start = new Date(formData.start_date)
      setFormData(prev => ({ 
        ...prev, 
        subscription_month: String(start.getMonth() + 1),
        subscription_year: String(start.getFullYear())
      }))
    }
  }, [formData.start_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_name || !formData.start_date || !formData.pickup || !formData.drop) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await createMutation.mutateAsync({
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim() || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        subscription_month: formData.subscription_month ? parseInt(formData.subscription_month) : undefined,
        subscription_year: formData.subscription_year ? parseInt(formData.subscription_year) : undefined,
        no_of_days: formData.no_of_days ? parseInt(formData.no_of_days) : undefined,
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : undefined,
        pickup: formData.pickup.trim(),
        pickup_time: formData.pickup_time || undefined,
        drop: formData.drop.trim(),
        subscription_amount: formData.subscription_amount ? parseFloat(formData.subscription_amount) : undefined,
        amount_paid_date: formData.amount_paid_date || undefined,
        invoice_no: formData.invoice_no.trim() || undefined,
        remarks: formData.remarks.trim() || undefined,
        hub_id: formData.hub_id || undefined,
        preferred_days: formData.preferred_days as 'Mon-Fri' | 'Mon-Sat' | 'Mon-Sun',
      })

      // Reset form
      const now = new Date()
      setFormData({
        customer_name: '',
        customer_phone: '',
        subscription_month: String(now.getMonth() + 1),
        subscription_year: String(now.getFullYear()),
        start_date: '',
        no_of_days: '',
        distance_km: '',
        pickup: '',
        pickup_time: '',
        drop: '',
        subscription_amount: '',
        amount_paid_date: '',
        invoice_no: '',
        end_date: '',
        remarks: '',
        hub_id: '',
        preferred_days: 'Mon-Sun',
      })

      onClose()
    } catch (error: any) {
      alert(`Error creating subscription: ${error.message}`)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-bold text-text mb-4">
            Create Subscription Booking
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  Mobile No
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="Enter mobile number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={formData.subscription_month}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscription_month: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select month</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.subscription_year}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscription_year: e.target.value }))}
                  placeholder="YYYY"
                  min="2000"
                  max="2100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No of Days
                </label>
                <input
                  type="number"
                  value={formData.no_of_days}
                  onChange={(e) => setFormData((prev) => ({ ...prev, no_of_days: e.target.value }))}
                  min="1"
                  placeholder="Auto-calculated"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total KMs
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.distance_km}
                  onChange={(e) => setFormData((prev) => ({ ...prev, distance_km: e.target.value }))}
                  placeholder="Enter total kilometers"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Time
                </label>
                <input
                  type="time"
                  value={formData.pickup_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pickup_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pick Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pickup}
                onChange={(e) => setFormData((prev) => ({ ...prev, pickup: e.target.value }))}
                required
                placeholder="Enter pickup location"
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
                placeholder="Enter drop location"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.subscription_amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subscription_amount: e.target.value }))}
                  placeholder="Enter subscription amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={formData.amount_paid_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount_paid_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice No
                </label>
                <input
                  type="text"
                  value={formData.invoice_no}
                  onChange={(e) => setFormData((prev) => ({ ...prev, invoice_no: e.target.value }))}
                  placeholder="Enter invoice number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid till
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                  min={formData.start_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hub
                </label>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Days <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.preferred_days}
                onChange={(e) => setFormData((prev) => ({ ...prev, preferred_days: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Mon-Fri">Monday - Friday (Exclude Weekends)</option>
                <option value="Mon-Sat">Monday - Saturday (Exclude Sunday)</option>
                <option value="Mon-Sun">Monday - Sunday (All Days)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Rides will be generated only for the selected days
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                rows={3}
                placeholder="Enter any remarks or notes"
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
                {createMutation.isPending ? 'Creating...' : 'Create Subscription'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

