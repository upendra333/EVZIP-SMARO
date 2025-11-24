import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Role } from '../utils/types'

export interface User {
  id: string
  name: string
  username: string
  role: Role
  hub_id: string | null
  status: string
  email?: string | null
  phone?: string | null
}

export interface LoginCredentials {
  username: string
  password: string
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: credentials.username,
        p_password: credentials.password,
      })

      if (error) {
        throw new Error(error.message || 'Authentication failed')
      }

      if (!data || data.length === 0) {
        throw new Error('Invalid username or password')
      }

      // Map the returned columns to User interface
      const result = data[0] as any
      const user: User = {
        id: result.user_id,
        name: result.user_name,
        username: result.user_username,
        role: result.user_role,
        hub_id: result.user_hub_id,
        status: result.user_status,
      }
      return user
    },
    onSuccess: (user) => {
      // Store user in localStorage
      localStorage.setItem('currentUser', JSON.stringify(user))
      queryClient.setQueryData(['currentUser'], user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Clear localStorage
      localStorage.removeItem('currentUser')
      localStorage.removeItem('operatorName')
      localStorage.removeItem('role')
      queryClient.setQueryData(['currentUser'], null)
    },
  })
}

