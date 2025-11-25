import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Vehicle } from './useAllVehicles'

export function useSearchVehicles(searchTerm: string, availableOnly: boolean = true) {
  return useQuery({
    queryKey: ['vehicles', 'search', searchTerm, availableOnly],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return []
      }

      const term = searchTerm.trim().toLowerCase()

      // Escape special characters in search term
      const escapedTerm = term.replace(/%/g, '\\%').replace(/_/g, '\\_')

      let query = supabase
        .from('vehicles')
        .select('id, reg_no, make, model, seats, current_hub_id, status')
        .or(`reg_no.ilike.%${escapedTerm}%,make.ilike.%${escapedTerm}%,model.ilike.%${escapedTerm}%`)
        .order('reg_no')
        .limit(10)

      // Filter for available/active vehicles only if requested
      // Note: We'll filter in JavaScript after fetching since Supabase doesn't support complex OR conditions easily

      const { data, error } = await query

      if (error) throw error
      
      let results = (data || []) as Vehicle[]
      
      // Filter for available/active vehicles only if requested
      if (availableOnly) {
        results = results.filter((vehicle) => {
          const status = vehicle.status ? String(vehicle.status).trim().toLowerCase() : ''
          return status === 'available' || status === 'active' || status === '' || vehicle.status === null
        })
      }
      
      return results
    },
    enabled: searchTerm.trim().length >= 2,
  })
}

