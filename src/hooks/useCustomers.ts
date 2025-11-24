import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      return (data || []) as Customer[]
    },
  })
}

