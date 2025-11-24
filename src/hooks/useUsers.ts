import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { User } from './useAuth'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, email, phone, role, hub_id, status, created_at, updated_at')
        .order('name')

      if (error) throw error
      return (data || []) as User[]
    },
  })
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, email, phone, role, hub_id, status, created_at, updated_at')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data as User
    },
    enabled: !!userId,
  })
}

