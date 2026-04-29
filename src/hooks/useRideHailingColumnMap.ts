import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type RideHailingColumnMap = {
  timestamp?: string
  hub?: string
  pilotId?: string
  service?: string
  upi?: string
  cash?: string
  uber?: string
  tip?: string
}

const QUERY_KEY = ['rideHailingColumnMap']

function readLegacyColumnMap(): RideHailingColumnMap {
  try {
    return JSON.parse(localStorage.getItem('rideHailing.columnMap') || '{}') as RideHailingColumnMap
  } catch {
    return {}
  }
}

export function useRideHailingColumnMap() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ride_hailing_column_map')

      if (error) {
        // Fallback for environments where migration is not yet applied.
        if (error.code === '42883' || error.message?.includes('function')) {
          return readLegacyColumnMap()
        }
        throw error
      }

      if (!data || typeof data !== 'object') return {}
      return data as RideHailingColumnMap
    },
    staleTime: 60_000,
  })
}

export function useUpdateRideHailingColumnMap() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (columnMap: RideHailingColumnMap) => {
      const { data, error } = await supabase.rpc('update_ride_hailing_column_map', {
        p_column_map: columnMap,
      })

      if (error) {
        if (error.code === '42883' || error.message?.includes('function')) {
          throw new Error(
            'Database function not found. Please run migration: database/23_create_ride_hailing_source_config.sql'
          )
        }
        throw error
      }

      const result = data as { success?: boolean; error?: string } | null
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to update mapping')
      }

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
