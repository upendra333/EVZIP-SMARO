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

export function useDrivers(hubId?: string | null) {
  return useQuery({
    queryKey: ['drivers', hubId],
    queryFn: async () => {
      let query = supabase
        .from('drivers')
        .select('id, name, phone, license_no, status, hub_id')
        .eq('status', 'active')

      if (hubId) {
        query = query.eq('hub_id', hubId)
      }

      const { data, error } = await query.order('name')

      if (error) throw error
      return (data || []) as Driver[]
    },
  })
}

