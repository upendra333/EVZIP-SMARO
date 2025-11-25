import { useState, useRef, useEffect } from 'react'
import { useSearchVehicles } from '../../hooks/useSearchVehicles'
import { useAllVehicles } from '../../hooks/useAllVehicles'
import type { Vehicle } from '../../hooks/useAllVehicles'

interface VehicleAutocompleteProps {
  value: string // vehicle_id
  onChange: (vehicleId: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  availableOnly?: boolean
  hubId?: string | null
}

export function VehicleAutocomplete({
  value,
  onChange,
  placeholder = 'Type to search vehicle...',
  required = false,
  className = '',
  availableOnly = true,
  hubId,
}: VehicleAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: allVehicles } = useAllVehicles()
  const { data: searchResults, isLoading: isSearching } = useSearchVehicles(
    searchTerm.length >= 2 ? searchTerm : '',
    availableOnly
  )

  // Get selected vehicle details
  const selectedVehicle = allVehicles?.find((v) => v.id === value) || null

  // Update search term when value changes externally
  useEffect(() => {
    if (selectedVehicle && searchTerm !== selectedVehicle.reg_no) {
      setSearchTerm(selectedVehicle.reg_no)
    } else if (!value && searchTerm) {
      // Clear search if value is cleared
      setSearchTerm('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selectedVehicle?.id])

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
    setShowDropdown(true) // Always show dropdown when typing
    setSelectedIndex(-1)
    // Clear selection if input is cleared
    if (!term && value) {
      onChange('')
    }
  }

  const handleInputFocus = () => {
    setShowDropdown(true) // Show all items when focused
  }

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSearchTerm(vehicle.reg_no)
    setShowDropdown(false)
    setSelectedIndex(-1)
    onChange(vehicle.id)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const results = getFilteredResults()
    if (!showDropdown || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault()
      handleSelectVehicle(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }

  // Filter all vehicles locally for quick filtering, or use search results for complex searches
  const getFilteredResults = (): Vehicle[] => {
    let results: Vehicle[] = []
    
    if (searchTerm.length >= 2) {
      // Use search results for complex searches
      results = searchResults || []
    } else {
      // Use all vehicles and filter locally
      results = (allVehicles || []).filter((vehicle) => {
        // Filter by available status
        if (availableOnly) {
          const status = vehicle.status ? String(vehicle.status).trim().toLowerCase() : ''
          const isAvailable = status === 'available' || status === 'active' || status === '' || vehicle.status === null
          if (!isAvailable) return false
        }
        
        // Filter by hub
        if (hubId) {
          if (vehicle.current_hub_id !== hubId && vehicle.current_hub_id) return false
        }
        
        // Filter by search term (if any)
        if (searchTerm.length > 0) {
          const term = searchTerm.toLowerCase()
          const matchesRegNo = vehicle.reg_no.toLowerCase().includes(term)
          const matchesMake = vehicle.make?.toLowerCase().includes(term) || false
          const matchesModel = vehicle.model?.toLowerCase().includes(term) || false
          if (!matchesRegNo && !matchesMake && !matchesModel) return false
        }
        
        return true
      })
    }
    
    // Apply hub filter to search results
    if (hubId && searchTerm.length >= 2) {
      results = results.filter((vehicle) => vehicle.current_hub_id === hubId || !vehicle.current_hub_id)
    }
    
    return results
  }

  const displayResults = getFilteredResults()
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
        placeholder={
          selectedVehicle
            ? `${selectedVehicle.reg_no}${selectedVehicle.make && selectedVehicle.model ? ` (${selectedVehicle.make} ${selectedVehicle.model})` : ''}`
            : placeholder
        }
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isSearching && (
            <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
          )}

          {!isSearching && hasResults && (
            <>
              {displayResults.map((vehicle, index) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => handleSelectVehicle(vehicle)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium">{vehicle.reg_no}</div>
                  {(vehicle.make || vehicle.model) && (
                    <div className="text-sm text-gray-500">
                      {vehicle.make} {vehicle.model}
                      {vehicle.seats && ` • ${vehicle.seats} seats`}
                    </div>
                  )}
                </button>
              ))}
            </>
          )}

          {!isSearching && !hasResults && (
            <div className="px-4 py-2 text-sm text-gray-500">
              {searchTerm.length > 0
                ? `No matching ${availableOnly ? 'available ' : ''}vehicles found.`
                : `No ${availableOnly ? 'available ' : ''}vehicles available.`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

