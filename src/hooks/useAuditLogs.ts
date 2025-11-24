import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AuditLogEntry {
  id: string
  at: string
  actor_name: string | null
  actor_user_id: string | null
  object: string
  object_id: string
  action: string
  diff_json: Record<string, any> | null
}

export interface AuditLogFilters {
  dateFrom?: string
  dateTo?: string
  actor?: string
  object?: string
  action?: string
  page?: number
  pageSize?: number
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const { dateFrom, dateTo, actor, object, action, page = 1, pageSize = 50 } = filters

  return useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('at', { ascending: false })

      // Date range filter
      if (dateFrom) {
        query = query.gte('at', `${dateFrom}T00:00:00`)
      }
      if (dateTo) {
        query = query.lte('at', `${dateTo}T23:59:59`)
      }

      // Actor filter
      if (actor) {
        query = query.eq('actor_name', actor)
      }

      // Object filter
      if (object) {
        query = query.eq('object', object)
      }

      // Action filter
      if (action) {
        query = query.eq('action', action)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      return {
        data: (data || []) as AuditLogEntry[],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      }
    },
  })
}

export function useAuditLogActors() {
  return useQuery({
    queryKey: ['auditLogActors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('actor_name')
        .not('actor_name', 'is', null)

      if (error) throw error

      // Get unique actor names
      const actors = [...new Set((data || []).map((d) => d.actor_name).filter(Boolean))]
      return actors.sort() as string[]
    },
  })
}

export function useAuditLogObjects() {
  return useQuery({
    queryKey: ['auditLogObjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('object')
        .not('object', 'is', null)

      if (error) throw error

      // Get unique object types
      const objects = [...new Set((data || []).map((d) => d.object).filter(Boolean))]
      return objects.sort() as string[]
    },
  })
}

export function useAuditLogActions() {
  return useQuery({
    queryKey: ['auditLogActions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('action')
        .not('action', 'is', null)

      if (error) throw error

      // Get unique actions
      const actions = [...new Set((data || []).map((d) => d.action).filter(Boolean))]
      return actions.sort() as string[]
    },
  })
}

