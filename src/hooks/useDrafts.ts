import { useState, useCallback, useEffect } from 'react'
import type { BriefFormData } from '../lib/schema'

export interface SavedDraft {
  id: string
  name: string
  savedAt: string
  campaignName: string
  emailType: string
  data: BriefFormData
}

const STORAGE_KEY = 'ni-email-brief-saved-drafts'
const MAX_DRAFTS = 10

function loadDrafts(): SavedDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as SavedDraft[]
  } catch {
    // ignore corrupt data
  }
  return []
}

function persistDrafts(drafts: SavedDraft[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  } catch {
    // storage full
  }
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<SavedDraft[]>(loadDrafts)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    persistDrafts(drafts)
  }, [drafts])

  const saveDraft = useCallback((data: BriefFormData, name?: string) => {
    const now = new Date().toISOString()
    const draftName = name || data.campaign.campaignName || `Brief ${new Date().toLocaleDateString()}`
    const draft: SavedDraft = {
      id: crypto.randomUUID(),
      name: draftName,
      savedAt: now,
      campaignName: data.campaign.campaignName,
      emailType: data.campaign.emailType,
      data,
    }
    setDrafts((prev) => [draft, ...prev].slice(0, MAX_DRAFTS))
    return draft.id
  }, [])

  const deleteDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const renameDraft = useCallback((id: string, name: string) => {
    setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, name } : d))
  }, [])

  const openDrawer = useCallback(() => setIsOpen(true), [])
  const closeDrawer = useCallback(() => setIsOpen(false), [])

  return { drafts, saveDraft, deleteDraft, renameDraft, isOpen, openDrawer, closeDrawer }
}
