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

export function useAllVehicles() {
  return useQuery({
    queryKey: ['allVehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, reg_no, make, model, seats, current_hub_id, status')
        .order('reg_no')

      if (error) throw error
      return (data || []) as Vehicle[]
    },
  })
}

