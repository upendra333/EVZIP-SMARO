import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Customer } from './useCustomers'

export interface CreateCustomerData {
  name: string
  phone?: string
  email?: string
  notes?: string
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCustomerData) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        })
        .select()
        .single()

      if (error) throw error
      return customer as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

