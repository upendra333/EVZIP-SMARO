import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useOperator } from './useOperator'

export interface ChangePasswordData {
  userId: string
  newPassword: string
  oldPassword?: string
  requireOldPassword?: boolean
}

export function useChangePassword() {
  const queryClient = useQueryClient()
  const { operator } = useOperator()

  return useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const { data: result, error } = await supabase.rpc('change_user_password', {
        p_user_id: data.userId,
        p_new_password: data.newPassword,
        p_old_password: data.oldPassword || null,
        p_require_old_password: data.requireOldPassword !== false,
      })

      if (error) {
        throw new Error(error.message || 'Failed to change password')
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Failed to change password')
      }

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_name: operator?.name || 'System',
        object: 'users',
        object_id: data.userId,
        action: 'password_change',
        diff_json: { password_changed: true },
      })

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
  })
}

