import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Driver } from './useAllDrivers'

export function useSearchDrivers(searchTerm: string, activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['drivers', 'search', searchTerm, activeOnly],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return []
      }

      const term = searchTerm.trim().toLowerCase()

      // Escape special characters in search term
      const escapedTerm = term.replace(/%/g, '\\%').replace(/_/g, '\\_')

      let query = supabase
        .from('drivers')
        .select('id, name, phone, driver_id, status, hub_id')
        .or(`name.ilike.%${escapedTerm}%,phone.ilike.%${escapedTerm}%,driver_id.ilike.%${escapedTerm}%`)
        .order('name')
        .limit(10)

      // Filter for active drivers only if requested
      // Note: We'll filter in JavaScript after fetching since Supabase doesn't support complex OR conditions easily

      const { data, error } = await query

      if (error) throw error
      
      let results = (data || []) as Driver[]
      
      // Filter for active drivers only if requested
      if (activeOnly) {
        results = results.filter((driver) => {
          const status = driver.status ? String(driver.status).trim().toLowerCase() : ''
          return status === 'active' || status === '' || driver.status === null
        })
      }
      
      return results
    },
    enabled: searchTerm.trim().length >= 2,
  })
}

