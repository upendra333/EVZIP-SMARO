import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Driver {
  id: string
  name: string
  phone: string
  license_no: string | null
  status: string
  hub_id: string | null
}

export function useAllDrivers() {
  return useQuery({
    queryKey: ['allDrivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, phone, license_no, status, hub_id')
        .order('name')

      if (error) throw error
      return (data || []) as Driver[]
    },
  })
}

