import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface WeeklySummaryRow {
  week_start: string
  week_end: string
  total_rides: number
  total_revenue: number
  total_km?: number
  subscription_count: number
  subscription_revenue: number
  subscription_km?: number
  airport_count: number
  airport_revenue: number
  airport_km?: number
  rental_count: number
  rental_revenue: number
  rental_km?: number
  outstation_count?: number
  outstation_revenue?: number
  outstation_km?: number
  manual_count?: number
  manual_revenue?: number
  manual_km?: number
  cash_revenue?: number
  upi_revenue?: number
  others_revenue?: number
  cash_count?: number
  upi_count?: number
  others_count?: number
}

export function useWeeklySummary(fromDate: string, toDate: string, hubId?: string | null) {
  return useQuery({
    queryKey: ['weeklySummary', fromDate, toDate, hubId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('weekly_summary', {
        p_from_date: fromDate,
        p_to_date: toDate,
        p_hub_id: hubId || null,
      })

      if (error) {
        if (error.code === '42501' || error.message?.toLowerCase().includes('permission denied')) {
          throw new Error('Permission denied for weekly_summary. Run database/27_fix_smaro_reports_analytics_access.sql in Supabase SQL Editor.')
        }
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          throw new Error('Database function weekly_summary not found. Run required DB migrations (02_functions.sql or later).')
        }
        throw error
      }
      return (data || []) as WeeklySummaryRow[]
    },
    enabled: !!fromDate && !!toDate,
  })
}

