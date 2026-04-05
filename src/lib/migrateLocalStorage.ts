import { supabase } from './supabase'
import type { AppSettings } from '../types/settings.types'
import type { KanbanCard } from '../types/kanban.types'
import type { BriefFormData } from './schema'

const MIGRATION_FLAG = 'ni-migrated-to-supabase'

const LS_KEYS = {
  settings: 'ni-email-brief-settings',
  settingsVersion: 'ni-email-brief-settings-version',
  kanban: 'ni-kanban-cards',
  drafts: 'ni-email-brief-saved-drafts',
  draft: 'ni-email-brief-draft',
  draftVersion: 'ni-email-brief-draft-version',
} as const

interface SavedDraft {
  id: string
  name: string
  savedAt: string
  campaignName: string
  emailType: string
  data: BriefFormData
}

/**
 * On first authenticated login, migrate any existing localStorage data
 * to Supabase and clear the local keys.
 */
export async function migrateLocalStorageToSupabase(teamId: string, userId: string): Promise<void> {
  // Already migrated?
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return

  let didMigrate = false

  // 1. Settings
  try {
    const raw = localStorage.getItem(LS_KEYS.settings)
    if (raw) {
      const settings = JSON.parse(raw) as AppSettings
      const { error } = await supabase
        .from('settings')
        .upsert(
          { team_id: teamId, data: settings, updated_at: new Date().toISOString() },
          { onConflict: 'team_id' }
        )
      if (!error) didMigrate = true
    }
  } catch {
    // Skip settings migration on error
  }

  // 2. Kanban cards
  try {
    const raw = localStorage.getItem(LS_KEYS.kanban)
    if (raw) {
      const cards = JSON.parse(raw) as KanbanCard[]
      if (cards.length > 0) {
        const rows = cards.map((c) => ({
          team_id: teamId,
          brief_id: c.briefId,
          email_name: c.emailName,
          email_type: c.emailType,
          theme: c.theme,
          subject_line: c.subjectLine,
          region: c.region,
          channel: c.channel,
          client_group: c.clientGroup,
          send_date: c.sendDate || null,
          content_approval_date: c.contentApprovalDate || null,
          urgency: c.urgency,
          column: c.column,
          submitted_at: c.submittedAt,
          column_history: c.columnHistory,
          notes: c.notes,
          tags: c.tags,
        }))
        const { error } = await supabase.from('kanban_cards').insert(rows)
        if (!error) didMigrate = true
      }
    }
  } catch {
    // Skip kanban migration on error
  }

  // 3. Saved drafts
  try {
    const raw = localStorage.getItem(LS_KEYS.drafts)
    if (raw) {
      const drafts = JSON.parse(raw) as SavedDraft[]
      if (drafts.length > 0) {
        const rows = drafts.map((d) => ({
          team_id: teamId,
          user_id: userId,
          name: d.name,
          campaign_name: d.campaignName,
          email_type: d.emailType,
          data: d.data,
          saved_at: d.savedAt,
        }))
        const { error } = await supabase.from('drafts').insert(rows)
        if (!error) didMigrate = true
      }
    }
  } catch {
    // Skip drafts migration on error
  }

  // Mark as migrated and clear localStorage keys
  localStorage.setItem(MIGRATION_FLAG, '1')

  if (didMigrate) {
    for (const key of Object.values(LS_KEYS)) {
      localStorage.removeItem(key)
    }
    console.info('localStorage data migrated to Supabase successfully.')
  }
}
