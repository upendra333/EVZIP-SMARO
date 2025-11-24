import { useState, useRef, useEffect } from 'react'
import { useCustomers } from '../../hooks/useCustomers'
import { useSearchCustomers } from '../../hooks/useSearchCustomers'
import { useCreateCustomer } from '../../hooks/useCreateCustomer'
import type { Customer } from '../../hooks/useCustomers'

interface CustomerSelectorProps {
  value: string // customer_id
  onChange: (customerId: string) => void
  required?: boolean
  error?: string
}

export function CustomerSelector({ value, onChange, required = false, error }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: allCustomers, error: customersError } = useCustomers()
  const { data: searchResults, isLoading: isSearching, error: searchError } = useSearchCustomers(searchTerm)
  const createCustomerMutation = useCreateCustomer()

  // Get selected customer details
  const selectedCustomer = allCustomers?.find((c) => c.id === value) || null

  // Show dropdown when searching
  useEffect(() => {
    if (searchTerm.length > 0) {
      setShowDropdown(true)
    }
  }, [searchTerm])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setIsNewCustomer(false)
        // Reset search if no customer selected
        if (!value) {
          setSearchTerm('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value])

  // Update search term when selected customer changes externally
  useEffect(() => {
    if (selectedCustomer && searchTerm !== selectedCustomer.name) {
      setSearchTerm(selectedCustomer.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id, value])

  const handleSelectCustomer = (customer: Customer) => {
    onChange(customer.id)
    setSearchTerm(customer.name)
    setShowDropdown(false)
    setIsNewCustomer(false)
  }

  const handleCreateNewCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      alert('Please enter customer name')
      return
    }

    try {
      const newCustomer = await createCustomerMutation.mutateAsync({
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone.trim() || undefined,
      })
      
      onChange(newCustomer.id)
      setSearchTerm(newCustomer.name)
      setShowDropdown(false)
      setIsNewCustomer(false)
      setNewCustomerData({ name: '', phone: '' })
    } catch (error: any) {
      alert(`Error creating customer: ${error.message}`)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    setIsNewCustomer(false)
    
    // If input is cleared, clear selection
    if (!term && value) {
      onChange('')
    }
  }

  const handleInputFocus = () => {
    setShowDropdown(true)
  }

  // Determine what to show in dropdown
  const displayResults = searchTerm.length >= 2 ? searchResults || [] : []
  const hasResults = displayResults.length > 0
  const showCreateOption = searchTerm.length >= 2 && !hasResults && !isNewCustomer

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={selectedCustomer ? selectedCustomer.name : "Search customer by name or phone..."}
          required={required}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {selectedCustomer && searchTerm === selectedCustomer.name && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {selectedCustomer.phone && `(${selectedCustomer.phone})`}
          </div>
        )}
      </div>

      {(error || customersError || searchError) && (
        <p className="mt-1 text-sm text-red-500">
          {error || customersError?.message || searchError?.message || 'Error loading customers'}
        </p>
      )}

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isSearching && (
            <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
          )}

          {!isSearching && searchTerm.length < 2 && (
            <div className="px-4 py-2 text-sm text-gray-500">
              Type at least 2 characters to search
            </div>
          )}

          {!isSearching && searchTerm.length >= 2 && hasResults && displayResults && (
            <>
              {displayResults.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                    value === customer.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium">{customer.name}</div>
                  {customer.phone && (
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  )}
                </button>
              ))}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(true)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors border-t border-gray-200"
                >
                  <div className="font-medium text-primary">
                    + Create new customer: "{searchTerm}"
                  </div>
                </button>
              )}
            </>
          )}

          {isNewCustomer && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm font-medium mb-2">Create New Customer</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCustomerData.name}
                  onChange={(e) =>
                    setNewCustomerData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Customer Name *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <input
                  type="tel"
                  value={newCustomerData.phone}
                  onChange={(e) =>
                    setNewCustomerData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Contact Number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleCreateNewCustomer}
                    disabled={createCustomerMutation.isPending || !newCustomerData.name.trim()}
                    className="flex-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createCustomerMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomer(false)
                      setNewCustomerData({ name: '', phone: '' })
                    }}
                    className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

