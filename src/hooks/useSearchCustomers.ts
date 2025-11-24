import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Customer } from './useCustomers'

export function useSearchCustomers(searchTerm: string) {
  return useQuery({
    queryKey: ['customers', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return []
      }

      const term = searchTerm.trim().toLowerCase()

      // Escape special characters in search term
      const escapedTerm = term.replace(/%/g, '\\%').replace(/_/g, '\\_')

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${escapedTerm}%,phone.ilike.%${escapedTerm}%`)
        .order('name')
        .limit(10)

      if (error) throw error
      return (data || []) as Customer[]
    },
    enabled: searchTerm.trim().length >= 2,
  })
}

