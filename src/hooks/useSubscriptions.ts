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
  // New fields
  client_name: string | null
  client_mobile: string | null
  subscription_month: number | null
  subscription_year: number | null
  no_of_days: number | null
  pickup_time: string | null // TIME format HH:MM:SS
  subscription_amount: number | null // in paise
  amount_paid_date: string | null // DATE format
  invoice_no: string | null
  remarks: string | null
  preferred_days: 'Mon-Fri' | 'Mon-Sat' | 'Mon-Sun' | null
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

