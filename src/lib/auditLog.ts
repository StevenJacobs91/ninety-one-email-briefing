import { supabase } from './supabase'
import type { AuditCategory, AuditConfig } from '../types/settings.types'

// ─── Types ──────────────────────────────────────────────────

export interface AuditEntry {
  id: string
  userId: string
  userEmail: string
  userName: string
  action: string
  category: AuditCategory
  entityType?: string
  entityId?: string
  details: Record<string, unknown>
  createdAt: string
}

export interface AuditLogParams {
  action: string
  category: AuditCategory
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}

interface AuditContext {
  teamId: string
  userId: string
  userEmail: string
  userName: string
}

// ─── Core logger ────────────────────────────────────────────

/**
 * Write an audit log entry. Silently no-ops if audit is disabled
 * or the category is toggled off.
 */
export async function writeAuditLog(
  ctx: AuditContext,
  config: AuditConfig,
  params: AuditLogParams
): Promise<void> {
  // Skip if audit is disabled globally or for this category
  if (!config.enabled) return
  if (!config.categories[params.category]) return

  try {
    await supabase.from('audit_log').insert({
      team_id: ctx.teamId,
      user_id: ctx.userId,
      user_email: ctx.userEmail,
      user_name: ctx.userName,
      action: params.action,
      category: params.category,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      details: params.details ?? {},
    })
  } catch {
    // Audit logging should never break the app
    console.warn('Audit log write failed silently')
  }
}

// ─── Query helpers ──────────────────────────────────────────

export interface AuditQueryOptions {
  teamId: string
  category?: AuditCategory
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  userId?: string
  search?: string
}

interface AuditRow {
  id: string
  user_id: string
  user_email: string
  user_name: string
  action: string
  category: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export async function fetchAuditLog(opts: AuditQueryOptions): Promise<{ entries: AuditEntry[]; total: number }> {
  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('team_id', opts.teamId)
    .order('created_at', { ascending: false })

  if (opts.category) query = query.eq('category', opts.category)
  if (opts.userId) query = query.eq('user_id', opts.userId)
  if (opts.startDate) query = query.gte('created_at', opts.startDate)
  if (opts.endDate) query = query.lte('created_at', opts.endDate)
  if (opts.search) query = query.ilike('action', `%${opts.search}%`)
  if (opts.limit) query = query.limit(opts.limit)
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)

  const { data, count, error } = await query

  if (error) throw new Error(`Failed to fetch audit log: ${error.message}`)

  const entries: AuditEntry[] = (data ?? []).map((row: AuditRow) => ({
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    action: row.action,
    category: row.category as AuditCategory,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    details: row.details ?? {},
    createdAt: row.created_at,
  }))

  return { entries, total: count ?? 0 }
}

export async function clearAuditLog(teamId: string, olderThanDays?: number): Promise<number> {
  let query = supabase.from('audit_log').delete({ count: 'exact' }).eq('team_id', teamId)

  if (olderThanDays && olderThanDays > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)
    query = query.lt('created_at', cutoff.toISOString())
  }

  const { count, error } = await query
  if (error) throw new Error(`Failed to clear audit log: ${error.message}`)
  return count ?? 0
}
