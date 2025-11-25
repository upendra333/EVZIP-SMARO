import { useState, useRef, useEffect } from 'react'
import { useSearchDrivers } from '../../hooks/useSearchDrivers'
import { useAllDrivers } from '../../hooks/useAllDrivers'
import type { Driver } from '../../hooks/useAllDrivers'

interface DriverAutocompleteProps {
  value: string // driver_id
  onChange: (driverId: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  activeOnly?: boolean
  hubId?: string | null
}

export function DriverAutocomplete({
  value,
  onChange,
  placeholder = 'Type to search driver...',
  required = false,
  className = '',
  activeOnly = true,
  hubId,
}: DriverAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: allDrivers } = useAllDrivers()
  const { data: searchResults, isLoading: isSearching } = useSearchDrivers(
    searchTerm.length >= 2 ? searchTerm : '',
    activeOnly
  )

  // Get selected driver details
  const selectedDriver = allDrivers?.find((d) => d.id === value) || null

  // Update search term when value changes externally
  useEffect(() => {
    if (selectedDriver && searchTerm !== selectedDriver.name) {
      setSearchTerm(selectedDriver.name)
    } else if (!value && searchTerm) {
      // Clear search if value is cleared
      setSearchTerm('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selectedDriver?.id])

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

  const handleSelectDriver = (driver: Driver) => {
    setSearchTerm(driver.name)
    setShowDropdown(false)
    setSelectedIndex(-1)
    onChange(driver.id)
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
      handleSelectDriver(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }

  // Filter all drivers locally for quick filtering, or use search results for complex searches
  const getFilteredResults = (): Driver[] => {
    let results: Driver[] = []
    
    if (searchTerm.length >= 2) {
      // Use search results for complex searches
      results = searchResults || []
    } else {
      // Use all drivers and filter locally
      results = (allDrivers || []).filter((driver) => {
        // Filter by active status
        if (activeOnly) {
          const status = driver.status ? String(driver.status).trim().toLowerCase() : ''
          const isActive = status === 'active' || status === '' || driver.status === null
          if (!isActive) return false
        }
        
        // Filter by hub
        if (hubId) {
          if (driver.hub_id !== hubId && driver.hub_id) return false
        }
        
        // Filter by search term (if any)
        if (searchTerm.length > 0) {
          const term = searchTerm.toLowerCase()
          const matchesName = driver.name.toLowerCase().includes(term)
          const matchesPhone = driver.phone?.toLowerCase().includes(term) || false
          const matchesDriverId = driver.driver_id?.toLowerCase().includes(term) || false
          if (!matchesName && !matchesPhone && !matchesDriverId) return false
        }
        
        return true
      })
    }
    
    // Apply hub filter to search results
    if (hubId && searchTerm.length >= 2) {
      results = results.filter((driver) => driver.hub_id === hubId || !driver.hub_id)
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
        placeholder={selectedDriver ? `${selectedDriver.name} (${selectedDriver.phone})` : placeholder}
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
              {displayResults.map((driver, index) => (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => handleSelectDriver(driver)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium">{driver.name}</div>
                  <div className="text-sm text-gray-500">
                    {driver.phone}
                    {driver.driver_id && ` • ${driver.driver_id}`}
                  </div>
                </button>
              ))}
            </>
          )}

          {!isSearching && !hasResults && (
            <div className="px-4 py-2 text-sm text-gray-500">
              {searchTerm.length > 0
                ? `No matching ${activeOnly ? 'active ' : ''}drivers found.`
                : `No ${activeOnly ? 'active ' : ''}drivers available.`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

