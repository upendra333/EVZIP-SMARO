import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Driver {
  id: string
  name: string
  phone: string
  driver_id: string | null
  status: string
  hub_id: string | null
}

export function useAllDrivers() {
  return useQuery({
    queryKey: ['allDrivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, phone, driver_id, status, hub_id')
        .order('name')

      if (error) throw error
      return (data || []) as Driver[]
    },
  })
}

