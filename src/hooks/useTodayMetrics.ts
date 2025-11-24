import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface TodayMetrics {
  active_trips: number
  due_next_60min: number
  due_today: number
  due_tomorrow: number
  delayed_trips: number
  on_time_percentage: number
  cancelled_no_show: number
  total_rides_today: number
  total_km_today: number
  total_revenue_today: number
}

export function useTodayMetrics(hubId?: string | null, date?: Date) {
  return useQuery({
    queryKey: ['todayMetrics', hubId, date?.toISOString().split('T')[0]],
    queryFn: async () => {
      const targetDate = date || new Date()
      const dateStr = targetDate.toISOString().split('T')[0]

      const { data, error } = await supabase.rpc('today_metrics', {
        p_hub_id: hubId || null,
        p_date: dateStr,
      })

      if (error) {
        // Provide more helpful error message
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          throw new Error('Database function "today_metrics" not found. Please run the database migrations (02_functions.sql) in Supabase SQL Editor.')
        }
        throw error
      }

      // RPC returns an array, get first result
      return (data?.[0] || {
        active_trips: 0,
        due_next_60min: 0,
        due_today: 0,
        due_tomorrow: 0,
        delayed_trips: 0,
        on_time_percentage: 0,
        cancelled_no_show: 0,
        total_rides_today: 0,
        total_km_today: 0,
        total_revenue_today: 0,
      }) as TodayMetrics
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}

