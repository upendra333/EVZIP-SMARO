import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Vehicle {
  id: string
  reg_no: string
  make: string | null
  model: string | null
  seats: number
  current_hub_id: string | null
  status: string
}

export function useVehicles(hubId?: string | null) {
  return useQuery({
    queryKey: ['vehicles', hubId],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('id, reg_no, make, model, seats, current_hub_id, status')
        .eq('status', 'available')

      if (hubId) {
        query = query.eq('current_hub_id', hubId)
      }

      const { data, error } = await query.order('reg_no')

      if (error) throw error
      return (data || []) as Vehicle[]
    },
  })
}

