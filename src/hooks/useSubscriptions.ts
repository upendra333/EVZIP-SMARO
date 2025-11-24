import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Subscription {
  id: string
  customer_id: string
  plan_id: string | null
  start_date: string
  end_date: string | null
  pickup: string
  drop: string
  distance_km: number | null
  status: string
  hub_id: string | null
  customer?: {
    name: string
  }
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, customer:customers(name)')
        .eq('status', 'active')
        .order('start_date', { ascending: false })

      if (error) throw error
      return (data || []) as Subscription[]
    },
  })
}

