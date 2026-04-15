import { supabase } from './supabase'
import type { AppSettings } from '../types/settings.types'
import type { BriefPayload } from '../types/brief.types'
import type { KanbanCard } from '../types/kanban.types'

// ─── Settings ───────────────────────────────────────────────

export async function fetchSettings(teamId: string): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('data')
    .eq('team_id', teamId)
    .single()

  if (error || !data) return null
  return data.data as AppSettings
}

export async function upsertSettings(teamId: string, settings: AppSettings): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert(
      { team_id: teamId, data: settings, updated_at: new Date().toISOString() },
      { onConflict: 'team_id' }
    )

  if (error) throw new Error(`Failed to save settings: ${error.message}`)
}

// ─── Briefs ─────────────────────────────────────────────────

export async function insertBrief(
  teamId: string,
  userId: string,
  brief: BriefPayload
): Promise<void> {
  const { error } = await supabase.from('briefs').insert({
    team_id: teamId,
    brief_id: brief.meta.briefId,
    campaign_name: brief.campaign.campaignName,
    email_type: brief.campaign.emailType,
    theme: brief.campaign.theme,
    status: brief.meta.status,
    data: brief,
    created_by: userId,
  })

  if (error) throw new Error(`Failed to save brief: ${error.message}`)
}

export async function fetchBriefs(teamId: string): Promise<BriefPayload[]> {
  const { data, error } = await supabase
    .from('briefs')
    .select('data')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch briefs: ${error.message}`)
  return (data ?? []).map((row) => row.data as BriefPayload)
}

// ─── Kanban Cards ───────────────────────────────────────────

interface KanbanCardRow {
  id: string
  team_id: string
  brief_id: string
  email_name: string
  email_type: string
  theme: string
  subject_line: string
  region: string[]
  channel: string[]
  client_group: string[]
  send_date: string | null
  content_approval_date: string | null
  urgency: string
  column: string
  submitted_at: string
  column_history: Array<{ column: string; at: string }>
  notes: string
  tags: string
}

function rowToCard(row: KanbanCardRow): KanbanCard {
  return {
    id: row.id,
    briefId: row.brief_id,
    emailName: row.email_name,
    emailType: row.email_type,
    theme: row.theme,
    subjectLine: row.subject_line,
    region: row.region ?? [],
    channel: row.channel ?? [],
    clientGroup: row.client_group ?? [],
    sendDate: row.send_date ?? '',
    contentApprovalDate: row.content_approval_date ?? '',
    urgency: row.urgency as 'standard' | 'urgent',
    column: row.column as KanbanCard['column'],
    submittedAt: row.submitted_at,
    columnHistory: (row.column_history ?? []) as KanbanCard['columnHistory'],
    notes: row.notes ?? '',
    tags: row.tags ?? '',
  }
}

function cardToRow(card: KanbanCard, teamId: string): Record<string, unknown> {
  return {
    id: card.id,
    team_id: teamId,
    brief_id: card.briefId,
    email_name: card.emailName,
    email_type: card.emailType,
    theme: card.theme,
    subject_line: card.subjectLine,
    region: card.region,
    channel: card.channel,
    client_group: card.clientGroup,
    send_date: card.sendDate || null,
    content_approval_date: card.contentApprovalDate || null,
    urgency: card.urgency,
    column: card.column,
    submitted_at: card.submittedAt,
    column_history: card.columnHistory,
    notes: card.notes,
    tags: card.tags,
  }
}

export async function fetchKanbanCards(teamId: string): Promise<KanbanCard[]> {
  const { data, error } = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch kanban cards: ${error.message}`)
  return (data ?? []).map((row) => rowToCard(row as KanbanCardRow))
}

export async function insertKanbanCard(teamId: string, card: KanbanCard): Promise<void> {
  const { error } = await supabase.from('kanban_cards').insert(cardToRow(card, teamId))
  if (error) throw new Error(`Failed to insert kanban card: ${error.message}`)
}

export async function updateKanbanCard(
  cardId: string,
  updates: Partial<Pick<KanbanCard, 'column' | 'columnHistory' | 'notes'>>
): Promise<void> {
  const row: Record<string, unknown> = {}
  if (updates.column !== undefined) row.column = updates.column
  if (updates.columnHistory !== undefined) row.column_history = updates.columnHistory
  if (updates.notes !== undefined) row.notes = updates.notes

  const { error } = await supabase.from('kanban_cards').update(row).eq('id', cardId)
  if (error) throw new Error(`Failed to update kanban card: ${error.message}`)
}

export async function deleteKanbanCard(cardId: string): Promise<void> {
  const { error } = await supabase.from('kanban_cards').delete().eq('id', cardId)
  if (error) throw new Error(`Failed to delete kanban card: ${error.message}`)
}

// ─── Drafts ─────────────────────────────────────────────────

export interface DraftRow {
  id: string
  name: string
  campaign_name: string
  email_type: string
  data: Record<string, unknown>
  saved_at: string
}

export async function fetchDrafts(teamId: string, userId: string): Promise<DraftRow[]> {
  const { data, error } = await supabase
    .from('drafts')
    .select('id, name, campaign_name, email_type, data, saved_at')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch drafts: ${error.message}`)
  return (data ?? []) as DraftRow[]
}

export async function insertDraft(
  teamId: string,
  userId: string,
  draft: { name: string; campaignName: string; emailType: string; data: Record<string, unknown> }
): Promise<string> {
  const { data, error } = await supabase
    .from('drafts')
    .insert({
      team_id: teamId,
      user_id: userId,
      name: draft.name,
      campaign_name: draft.campaignName,
      email_type: draft.emailType,
      data: draft.data,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save draft: ${error.message}`)
  return data.id
}

export async function deleteDraft(draftId: string): Promise<void> {
  const { error } = await supabase.from('drafts').delete().eq('id', draftId)
  if (error) throw new Error(`Failed to delete draft: ${error.message}`)
}

export async function updateDraftName(draftId: string, name: string): Promise<void> {
  const { error } = await supabase.from('drafts').update({ name }).eq('id', draftId)
  if (error) throw new Error(`Failed to rename draft: ${error.message}`)
}

// ─── Team Members (User Management) ────────────────────────

export type UserRole = 'admin' | 'producer' | 'requester'

export interface TeamMember {
  id: string
  email: string
  displayName: string
  role: UserRole
  teamId: string
  createdAt: string
  presetClientGroups: string[]
  presetRegions: string[]
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, email, display_name, role, team_id, created_at, preset_client_groups, preset_regions')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch team members: ${error.message}`)
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role as UserRole,
    teamId: row.team_id,
    createdAt: row.created_at,
    presetClientGroups: row.preset_client_groups ?? [],
    presetRegions: row.preset_regions ?? [],
  }))
}

export async function updateMemberRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw new Error(`Failed to update role: ${error.message}`)
}

export async function updateMemberDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)

  if (error) throw new Error(`Failed to update display name: ${error.message}`)
}

export async function updateMemberPresets(userId: string, clientGroups: string[], regions: string[]): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ preset_client_groups: clientGroups, preset_regions: regions })
    .eq('id', userId)

  if (error) throw new Error(`Failed to update presets: ${error.message}`)
}

export async function removeMember(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (error) throw new Error(`Failed to remove member: ${error.message}`)
}

export async function createTeamMember(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
): Promise<{ userId: string }> {
  // Explicitly retrieve the session token — functions.invoke() may fall back to
  // the anon key in some environments, which has no `sub` claim and fails our
  // admin check in the edge function.
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token
  if (!accessToken) throw new Error('Not authenticated')

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: { email, password, displayName, role },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (error) throw new Error(error.message ?? 'Failed to create user')
  if (data?.error) throw new Error(data.error)
  return { userId: data.userId }
}
