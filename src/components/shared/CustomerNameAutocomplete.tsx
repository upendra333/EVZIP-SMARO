import { useState, useRef, useEffect } from 'react'
import { useSearchCustomers } from '../../hooks/useSearchCustomers'
import type { Customer } from '../../hooks/useCustomers'

interface CustomerNameAutocompleteProps {
  value: string
  onChange: (name: string, phone?: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export function CustomerNameAutocomplete({
  value,
  onChange,
  placeholder = 'Enter customer name',
  required = false,
  className = '',
}: CustomerNameAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: searchResults, isLoading: isSearching } = useSearchCustomers(
    searchTerm.length >= 2 ? searchTerm : ''
  )

  // Update search term when value changes externally
  useEffect(() => {
    if (value !== searchTerm) {
      setSearchTerm(value)
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    setShowDropdown(term.length >= 2)
    setSelectedIndex(-1)
    onChange(term)
  }

  const handleInputFocus = () => {
    if (searchTerm.length >= 2) {
      setShowDropdown(true)
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSearchTerm(customer.name)
    setShowDropdown(false)
    setSelectedIndex(-1)
    onChange(customer.name, customer.phone || undefined)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || !searchResults || searchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && searchResults[selectedIndex]) {
      e.preventDefault()
      handleSelectCustomer(searchResults[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }

  const displayResults = searchTerm.length >= 2 ? searchResults || [] : []
  const hasResults = displayResults.length > 0

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      />

      {showDropdown && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isSearching && (
            <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
          )}

          {!isSearching && hasResults && (
            <>
              {displayResults.map((customer, index) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium">{customer.name}</div>
                  {customer.phone && (
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  )}
                </button>
              ))}
            </>
          )}

          {!isSearching && !hasResults && searchTerm.length >= 2 && (
            <div className="px-4 py-2 text-sm text-gray-500">
              No matching customers found. Continue typing to create a new customer.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

