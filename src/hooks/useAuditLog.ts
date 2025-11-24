import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AuditLogEntry {
  id: string
  actor_user_id: string | null
  actor_name: string | null
  object: string
  object_id: string
  action: string
  diff_json: Record<string, any>
  at: string
}

export function useAuditLog(objectId: string, objectType: string) {
  return useQuery({
    queryKey: ['auditLog', objectId, objectType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('object', objectType)
        .eq('object_id', objectId)
        .order('at', { ascending: false })

      if (error) throw error
      return (data || []) as AuditLogEntry[]
    },
  })
}

