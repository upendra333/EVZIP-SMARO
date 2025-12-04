import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { useCreateRentalBooking } from '../../hooks/useCreateBooking'
import { useHubs } from '../../hooks/useHubs'
import { CustomerNameAutocomplete } from './CustomerNameAutocomplete'
import { validateMobileNumber, validateFutureDateTime, validateEndAfterStart, validatePositiveNumber } from '../../utils/validation'

interface CreateRentalBookingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateRentalBookingModal({
  isOpen,
  onClose,
}: CreateRentalBookingModalProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    start_at: '',
    end_at: '',
    pickup: '',
    drop: '',
    package_hours: '4',
    package_km: '80',
    est_km: '',
    extra_km_rate: '',
    per_hour_rate: '',
    fare: '',
    notes: '',
    hub_id: '',
  })

  const { data: hubs } = useHubs()
  const createMutation = useCreateRentalBooking()

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

    if (!formData.customer_name || !formData.start_at || !formData.end_at || !formData.pickup || !formData.drop) {
      alert('Please fill in all required fields')
      return
    }

    // Validate mobile number
    const mobileValidation = validateMobileNumber(formData.customer_phone)
    if (!mobileValidation.isValid) {
      alert(mobileValidation.error)
      return
    }

    // Validate start time is in future
    const startTimeValidation = validateFutureDateTime(formData.start_at)
    if (!startTimeValidation.isValid) {
      alert(startTimeValidation.error)
      return
    }

    // Validate end time is after start time
    const endTimeValidation = validateEndAfterStart(formData.start_at, formData.end_at)
    if (!endTimeValidation.isValid) {
      alert(endTimeValidation.error)
      return
    }

    // Validate positive numbers
    if (formData.est_km) {
      const estKmValidation = validatePositiveNumber(formData.est_km, 'Estimated KM')
      if (!estKmValidation.isValid) {
        alert(estKmValidation.error)
        return
      }
    }

    if (formData.fare) {
      const fareValidation = validatePositiveNumber(formData.fare, 'Fare')
      if (!fareValidation.isValid) {
        alert(fareValidation.error)
        return
      }
    }

    if (formData.extra_km_rate) {
      const extraKmValidation = validatePositiveNumber(formData.extra_km_rate, 'Extra KM Rate')
      if (!extraKmValidation.isValid) {
        alert(extraKmValidation.error)
        return
      }
    }

    if (formData.per_hour_rate) {
      const perHourValidation = validatePositiveNumber(formData.per_hour_rate, 'Per Hour Rate')
      if (!perHourValidation.isValid) {
        alert(perHourValidation.error)
        return
      }
    }

    try {
      // Convert datetime-local to ISO string preserving local time
      // datetime-local format: "YYYY-MM-DDTHH:mm" (no timezone)
      // We need to treat it as local time and convert to ISO with timezone
      const convertToISO = (datetimeLocal: string) => {
        if (!datetimeLocal) return ''
        // Parse the datetime-local value and create a Date object in local timezone
        const [datePart, timePart] = datetimeLocal.split('T')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hours, minutes] = timePart.split(':').map(Number)
        
        // Create date object using local time components
        const localDate = new Date(year, month - 1, day, hours, minutes)
        return localDate.toISOString()
      }

      const startAtISO = convertToISO(formData.start_at)
      const endAtISO = convertToISO(formData.end_at)

      await createMutation.mutateAsync({
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim() || undefined,
        start_at: startAtISO,
        end_at: endAtISO,
        pickup: formData.pickup.trim(),
        drop: formData.drop.trim(),
        package_hours: parseInt(formData.package_hours),
        package_km: parseInt(formData.package_km),
        est_km: formData.est_km ? parseFloat(formData.est_km) : undefined,
        extra_km_rate: formData.extra_km_rate ? parseFloat(formData.extra_km_rate) : undefined,
        per_hour_rate: formData.per_hour_rate ? parseFloat(formData.per_hour_rate) : undefined,
        fare: formData.fare ? parseFloat(formData.fare) : undefined,
        notes: formData.notes || undefined,
        hub_id: formData.hub_id || undefined,
      })

      // Reset form
      setFormData({
        customer_name: '',
        customer_phone: '',
        start_at: '',
        end_at: '',
        pickup: '',
        drop: '',
        package_hours: '4',
        package_km: '80',
        est_km: '',
        extra_km_rate: '',
        per_hour_rate: '',
        fare: '',
        notes: '',
        hub_id: '',
      })

      onClose()
    } catch (error: any) {
      alert(`Error creating booking: ${error.message}`)
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-bold text-text mb-4">
            Create Rental Booking
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
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setFormData((prev) => ({ ...prev, customer_phone: value }))
                }}
                placeholder="Enter 10 digit mobile number"
                required
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, start_at: e.target.value }))
                  // Update end_at min if start_at changes
                  if (e.target.value && prev.end_at && e.target.value > prev.end_at) {
                    setFormData((prev) => ({ ...prev, end_at: '' }))
                  }
                }}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_at: e.target.value }))}
                required
                min={formData.start_at || new Date().toISOString().slice(0, 16)}
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
                placeholder="e.g., Customer Address"
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
                placeholder="e.g., Destination Address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package Hours <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.package_hours}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, package_hours: e.target.value }))
                  }
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package KM <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.package_km}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, package_km: e.target.value }))
                  }
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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
                min="0.1"
                value={formData.est_km}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || parseFloat(value) >= 0) {
                    setFormData((prev) => ({ ...prev, est_km: value }))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extra KM Rate (₹/km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.extra_km_rate}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || parseFloat(value) >= 0) {
                      setFormData((prev) => ({ ...prev, extra_km_rate: value }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Hour Rate (₹/hr)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.per_hour_rate}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || parseFloat(value) >= 0) {
                      setFormData((prev) => ({ ...prev, per_hour_rate: value }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fare (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.fare}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || parseFloat(value) >= 0) {
                    setFormData((prev) => ({ ...prev, fare: value }))
                  }
                }}
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
                {createMutation.isPending ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

