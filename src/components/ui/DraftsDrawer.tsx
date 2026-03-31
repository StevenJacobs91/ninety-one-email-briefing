import { useState, useEffect } from 'react'
import type { SavedDraft } from '../../hooks/useDrafts'
import type { BriefFormData } from '../../lib/schema'

interface DraftsDrawerProps {
  isOpen: boolean
  onClose: () => void
  drafts: SavedDraft[]
  currentData: BriefFormData
  onSave: (data: BriefFormData, name?: string) => void
  onLoad: (draft: SavedDraft) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function DraftsDrawer({ isOpen, onClose, drafts, currentData, onSave, onLoad, onDelete, onRename }: DraftsDrawerProps) {
  const [saveNameInput, setSaveNameInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    const name = saveNameInput.trim() || currentData.campaign.campaignName || undefined
    onSave(currentData, name)
    setSaveNameInput('')
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Saved Drafts</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {drafts.length} of 10 slots used
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Save current */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Save current brief</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveNameInput}
              onChange={(e) => setSaveNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={currentData.campaign.campaignName || 'Draft name…'}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={drafts.length >= 10}
              className="px-3 py-1.5 bg-brand-primary text-white text-xs font-medium rounded-md hover:bg-brand-primary-hover disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {justSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          {drafts.length >= 10 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">Maximum 10 drafts reached. Delete one to save a new draft.</p>
          )}
        </div>

        {/* Drafts list */}
        <div className="flex-1 overflow-y-auto">
          {drafts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No saved drafts yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Save your current brief above to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {drafts.map((draft) => (
                <li key={draft.id} className="px-6 py-4">
                  {editingId === draft.id ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { onRename(draft.id, editingName); setEditingId(null) }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                      <button type="button" onClick={() => { onRename(draft.id, editingName); setEditingId(null) }} className="text-xs text-brand-primary dark:text-brand-accent font-medium">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{draft.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {draft.emailType.replace(/-/g, ' ')} · {timeAgo(draft.savedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onLoad(draft)}
                          className="text-xs px-2 py-1 text-brand-primary dark:text-brand-accent font-medium hover:underline"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingId(draft.id); setEditingName(draft.name) }}
                          className="text-xs px-1.5 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Rename"
                        >
                          ✎
                        </button>
                        {deletingId === draft.id ? (
                          <>
                            <button type="button" onClick={() => { onDelete(draft.id); setDeletingId(null) }} className="text-xs text-red-600 dark:text-red-400 font-medium px-1">Confirm</button>
                            <button type="button" onClick={() => setDeletingId(null)} className="text-xs text-gray-400 px-1">Cancel</button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(draft.id)}
                            className="text-xs px-1.5 py-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
                            title="Delete"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
