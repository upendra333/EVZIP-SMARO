import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Driver } from './useDrivers'

export function useCreateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; phone: string; license_no?: string; status?: string; hub_id?: string }) => {
      const { data: result, error } = await supabase
        .from('drivers')
        .insert([{ ...data, status: data.status || 'active' }])
        .select()
        .single()

      if (error) throw error
      return result as Driver
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
  })
}

export function useUpdateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; phone?: string; license_no?: string; status?: string; hub_id?: string }) => {
      const { data: result, error } = await supabase
        .from('drivers')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as Driver
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
  })
}

export function useDeleteDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
  })
}

