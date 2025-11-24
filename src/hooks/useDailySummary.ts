import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface DailySummaryRow {
  report_date: string
  total_rides: number
  total_revenue: number
  subscription_count: number
  subscription_revenue: number
  airport_count: number
  airport_revenue: number
  rental_count: number
  rental_revenue: number
  manual_count?: number
  manual_revenue?: number
}

export function useDailySummary(fromDate: string, toDate: string, hubId?: string | null) {
  return useQuery({
    queryKey: ['dailySummary', fromDate, toDate, hubId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('daily_summary', {
        p_from_date: fromDate,
        p_to_date: toDate,
        p_hub_id: hubId || null,
      })

      if (error) throw error
      return (data || []) as DailySummaryRow[]
    },
    enabled: !!fromDate && !!toDate,
  })
}

