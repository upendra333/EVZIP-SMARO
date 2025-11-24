import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Vehicle } from './useVehicles'

export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { reg_no: string; make?: string; model?: string; seats?: number; status?: string; current_hub_id?: string }) => {
      const { data: result, error } = await supabase
        .from('vehicles')
        .insert([{ ...data, seats: data.seats || 4, status: data.status || 'available' }])
        .select()
        .single()

      if (error) throw error
      return result as Vehicle
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; reg_no?: string; make?: string; model?: string; seats?: number; status?: string; current_hub_id?: string }) => {
      const { data: result, error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as Vehicle
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}

