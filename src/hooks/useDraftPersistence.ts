import { useEffect, useCallback, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { BriefFormData } from '../lib/schema'

const STORAGE_KEY = 'ni-email-brief-draft'
const DRAFT_VERSION_KEY = 'ni-email-brief-draft-version'
const CURRENT_VERSION = 5 // Bump when schema changes
const DEBOUNCE_MS = 500

export function useDraftPersistence(form: UseFormReturn<BriefFormData>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Restore draft on mount — clear stale drafts from old schema versions
  useEffect(() => {
    try {
      const version = localStorage.getItem(DRAFT_VERSION_KEY)
      if (version !== String(CURRENT_VERSION)) {
        // Schema changed — discard old draft to avoid validation mismatches
        localStorage.removeItem(STORAGE_KEY)
        localStorage.setItem(DRAFT_VERSION_KEY, String(CURRENT_VERSION))
        return
      }

      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as BriefFormData
        // Ensure new required arrays exist
        if (!draft.audience?.clientGroup) {
          draft.audience.clientGroup = []
        }
        if (!draft.content?.modules) {
          draft.content.modules = []
        }
        form.reset(draft)
      }
    } catch {
      // Ignore corrupt data
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [form])

  // Watch and persist with debounce
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
          localStorage.setItem(DRAFT_VERSION_KEY, String(CURRENT_VERSION))
        } catch {
          // Storage full or unavailable
        }
      }, DEBOUNCE_MS)
    })

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [form])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { clearDraft }
}
