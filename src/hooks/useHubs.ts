import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Hub {
  id: string
  name: string
  city: string | null
  lat: number | null
  lng: number | null
}

export function useHubs() {
  return useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('id, name, city, lat, lng')
        .order('name')

      if (error) throw error
      return (data || []) as Hub[]
    },
  })
}

