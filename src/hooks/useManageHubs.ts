import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Hub } from './useHubs'

export function useCreateHub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; city?: string; lat?: number; lng?: number }) => {
      const { data: result, error } = await supabase
        .from('hubs')
        .insert([data])
        .select()
        .single()

      if (error) throw error
      return result as Hub
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] })
    },
  })
}

export function useUpdateHub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; city?: string; lat?: number; lng?: number }) => {
      const { data: result, error } = await supabase
        .from('hubs')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as Hub
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] })
    },
  })
}

export function useDeleteHub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hubs')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] })
    },
  })
}

