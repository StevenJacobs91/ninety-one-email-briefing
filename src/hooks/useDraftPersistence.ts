import { useEffect, useCallback, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { BriefFormData } from '../lib/schema'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'ni-email-brief-draft'
const DRAFT_VERSION_KEY = 'ni-email-brief-draft-version'
const CURRENT_VERSION = 5
const DEBOUNCE_MS = 500
const SUPABASE_DEBOUNCE_MS = 2000

export type SaveStatus = 'idle' | 'saving' | 'saved'

/**
 * Auto-save draft to localStorage (fast) and Supabase (debounced).
 * On mount, picks the newer of local vs remote auto-draft.
 */
export function useDraftPersistence(form: UseFormReturn<BriefFormData>) {
  const { profile, user } = useAuth()
  const teamId = profile?.teamId
  const userId = user?.id

  const localTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const remoteTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Restore draft on mount — check both localStorage and Supabase
  useEffect(() => {
    let cancelled = false

    async function restore() {
      // 1. Load local draft
      let localDraft: BriefFormData | null = null
      let localTime = 0
      try {
        const version = localStorage.getItem(DRAFT_VERSION_KEY)
        if (version === String(CURRENT_VERSION)) {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            localDraft = JSON.parse(raw) as BriefFormData
            localTime = localDraft?.meta?.updatedAt
              ? new Date(localDraft.meta.updatedAt).getTime()
              : 0
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }

      // 2. Load remote auto-draft (if authenticated)
      let remoteDraft: BriefFormData | null = null
      let remoteTime = 0
      if (teamId && userId) {
        try {
          const { data } = await supabase
            .from('drafts')
            .select('data, saved_at')
            .eq('team_id', teamId)
            .eq('user_id', userId)
            .eq('name', '__auto_draft__')
            .single()

          if (data) {
            remoteDraft = data.data as unknown as BriefFormData
            remoteTime = new Date(data.saved_at).getTime()
          }
        } catch {
          // No remote auto-draft — that's fine
        }
      }

      if (cancelled) return

      // 3. Use whichever is newer
      const best = remoteTime > localTime ? remoteDraft : localDraft
      if (best) {
        // Ensure required arrays exist
        if (!best.audience?.clientGroup) best.audience.clientGroup = []
        if (!best.content?.modules) best.content.modules = []
        form.reset(best)
        setSaveStatus('saved')
      }
    }

    restore()
    return () => { cancelled = true }
  }, [form, teamId, userId])

  // Watch and persist with debounce — dual-write
  useEffect(() => {
    const subscription = form.watch((values) => {
      setSaveStatus('saving')

      // --- localStorage (fast, 500ms debounce) ---
      if (localTimerRef.current) clearTimeout(localTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

      localTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
          localStorage.setItem(DRAFT_VERSION_KEY, String(CURRENT_VERSION))
          setSaveStatus('saved')
          savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
        } catch {
          setSaveStatus('idle')
        }
      }, DEBOUNCE_MS)

      // --- Supabase (slower, 2s debounce) ---
      if (teamId && userId) {
        if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current)
        remoteTimerRef.current = setTimeout(() => {
          supabase
            .from('drafts')
            .upsert(
              {
                team_id: teamId,
                user_id: userId,
                name: '__auto_draft__',
                campaign_name: (values as BriefFormData)?.campaign?.campaignName ?? '',
                email_type: (values as BriefFormData)?.campaign?.emailType ?? '',
                data: values,
                saved_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,name' }
            )
            .then(({ error }) => {
              if (error) console.error('Auto-draft Supabase save failed:', error.message)
            })
        }, SUPABASE_DEBOUNCE_MS)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (localTimerRef.current) clearTimeout(localTimerRef.current)
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [form, teamId, userId])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSaveStatus('idle')

    // Also clear remote auto-draft
    if (teamId && userId) {
      supabase
        .from('drafts')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('name', '__auto_draft__')
        .then(({ error }) => {
          if (error) console.error('Failed to clear remote auto-draft:', error.message)
        })
    }
  }, [teamId, userId])

  return { clearDraft, saveStatus }
}
