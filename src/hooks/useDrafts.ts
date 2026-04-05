import { useState, useCallback, useEffect } from 'react'
import type { BriefFormData } from '../lib/schema'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchDrafts,
  insertDraft,
  deleteDraft as deleteDraftRemote,
  updateDraftName,
  type DraftRow,
} from '../lib/supabaseQueries'

export interface SavedDraft {
  id: string
  name: string
  savedAt: string
  campaignName: string
  emailType: string
  data: BriefFormData
}

function rowToDraft(row: DraftRow): SavedDraft {
  return {
    id: row.id,
    name: row.name,
    savedAt: row.saved_at,
    campaignName: row.campaign_name,
    emailType: row.email_type,
    data: row.data as unknown as BriefFormData,
  }
}

export function useDrafts() {
  const { profile, user } = useAuth()
  const teamId = profile?.teamId
  const userId = user?.id
  const [drafts, setDrafts] = useState<SavedDraft[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch drafts from Supabase on mount
  useEffect(() => {
    if (!teamId || !userId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchDrafts(teamId, userId).then((rows) => {
      if (!cancelled) {
        setDrafts(rows.map(rowToDraft))
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [teamId, userId])

  const saveDraft = useCallback((data: BriefFormData, name?: string) => {
    if (!teamId || !userId) return ''

    const draftName = name || data.campaign.campaignName || `Brief ${new Date().toLocaleDateString()}`
    const tempId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Optimistic local update
    const optimistic: SavedDraft = {
      id: tempId,
      name: draftName,
      savedAt: now,
      campaignName: data.campaign.campaignName,
      emailType: data.campaign.emailType,
      data,
    }
    setDrafts((prev) => [optimistic, ...prev])

    // Persist to Supabase and update with real ID
    insertDraft(teamId, userId, {
      name: draftName,
      campaignName: data.campaign.campaignName,
      emailType: data.campaign.emailType,
      data: data as unknown as Record<string, unknown>,
    }).then((realId) => {
      setDrafts((prev) => prev.map((d) => d.id === tempId ? { ...d, id: realId } : d))
    }).catch((err) => {
      console.error('Failed to save draft:', err)
      // Remove optimistic entry on failure
      setDrafts((prev) => prev.filter((d) => d.id !== tempId))
    })

    return tempId
  }, [teamId, userId])

  const deleteDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
    deleteDraftRemote(id).catch((err) =>
      console.error('Failed to delete draft:', err)
    )
  }, [])

  const renameDraft = useCallback((id: string, name: string) => {
    setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, name } : d))
    updateDraftName(id, name).catch((err) =>
      console.error('Failed to rename draft:', err)
    )
  }, [])

  const openDrawer = useCallback(() => setIsOpen(true), [])
  const closeDrawer = useCallback(() => setIsOpen(false), [])

  return { drafts, saveDraft, deleteDraft, renameDraft, isOpen, openDrawer, closeDrawer, loading }
}
