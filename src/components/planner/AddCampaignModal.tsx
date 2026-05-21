import { useState, useEffect, useRef } from 'react'
import type { KanbanColumn, ManualCardInput } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'

const COLUMN_OPTIONS: { value: KanbanColumn; label: string }[] = [
  { value: 'briefed', label: 'Briefed' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'distributed', label: 'Distributed' },
]

const EMAIL_TYPES = [
  'campaign', 'newsletter', 'fund-update', 'event-invitation',
  'thought-leadership', 'client-announcement',
]

const BRAND_THEMES = [
  { id: 'leatherback-coral', label: 'Leatherback / Cape Coral' },
  { id: 'leatherback-yellowood', label: 'Leatherback / Warm Yellowwood' },
  { id: 'marula-gold', label: 'Marula / Gazania Gold' },
  { id: 'marula-coral', label: 'Marula / Cape Coral' },
  { id: 'pinotage-coral', label: 'Pinotage / Cape Coral' },
  { id: 'agulhas-gold', label: 'Agulhas / Gazania Gold' },
  { id: 'agulhas-teal', label: 'Agulhas / Ocean Teal' },
  { id: 'agulhas-red', label: 'Agulhas / Protea Red' },
  { id: 'agulhas-coral', label: 'Agulhas / Cape Coral' },
  { id: 'galjoen-coral', label: 'Galjoen / Cape Coral' },
  { id: 'galjoen-green', label: 'Galjoen / Leatherback Green' },
]

interface AddCampaignModalProps {
  onClose: () => void
}

export function AddCampaignModal({ onClose }: AddCampaignModalProps) {
  const { addManualCard } = useKanban()
  const modalRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<{
    emailName: string
    emailType: string
    theme: string
    subjectLine: string
    sendDate: string
    contentApprovalDate: string
    startDate: string
    urgency: 'standard' | 'urgent'
    column: KanbanColumn
    assignee: string
    tags: string
    notes: string
  }>({
    emailName: '',
    emailType: 'campaign',
    theme: 'leatherback-coral',
    subjectLine: '',
    sendDate: '',
    contentApprovalDate: '',
    startDate: '',
    urgency: 'standard',
    column: 'briefed',
    assignee: '',
    tags: '',
    notes: '',
  })

  const [errors, setErrors] = useState<{ emailName?: string; sendDate?: string }>({})

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus trap
  useEffect(() => {
    const el = modalRef.current?.querySelector<HTMLElement>('input, select, textarea, button')
    el?.focus()
  }, [])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'emailName') setErrors((e) => ({ ...e, emailName: undefined }))
    if (key === 'sendDate') setErrors((e) => ({ ...e, sendDate: undefined }))
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!form.emailName.trim()) errs.emailName = 'Campaign name is required'
    if (!form.sendDate) errs.sendDate = 'Send date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const data: ManualCardInput = {
      emailName: form.emailName.trim(),
      emailType: form.emailType,
      theme: form.theme,
      subjectLine: form.subjectLine,
      sendDate: form.sendDate,
      contentApprovalDate: form.contentApprovalDate,
      startDate: form.startDate || undefined,
      urgency: form.urgency,
      column: form.column,
      assignee: form.assignee || undefined,
      tags: form.tags,
      notes: form.notes,
    }
    addManualCard(data)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add campaign"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-brand-primary px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-0.5">Campaign Planner</p>
            <h2 className="font-ni-display text-[#e8e5ce] text-lg leading-none">Add Campaign</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Campaign name */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.emailName}
              onChange={(e) => set('emailName', e.target.value)}
              placeholder="e.g. Q1 Fund Update — SA Intermediaries"
              className={`w-full border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent transition-colors ${errors.emailName ? 'border-red-400' : 'border-brand-border-field dark:border-gray-600'}`}
            />
            {errors.emailName && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.emailName}</p>}
          </div>

          {/* 2-col row: Email type + Theme */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Email Type</label>
              <select
                value={form.emailType}
                onChange={(e) => set('emailType', e.target.value)}
                className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                {EMAIL_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Brand Theme</label>
              <select
                value={form.theme}
                onChange={(e) => set('theme', e.target.value)}
                className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                {BRAND_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject line */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Subject Line</label>
            <input
              type="text"
              value={form.subjectLine}
              onChange={(e) => set('subjectLine', e.target.value)}
              placeholder="Email subject line (optional)"
              className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Approval Date</label>
              <input
                type="date"
                value={form.contentApprovalDate}
                onChange={(e) => set('contentApprovalDate', e.target.value)}
                className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
                Send Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.sendDate}
                onChange={(e) => set('sendDate', e.target.value)}
                className={`w-full border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary transition-colors ${errors.sendDate ? 'border-red-400' : 'border-brand-border-field dark:border-gray-600'}`}
              />
              {errors.sendDate && <p className="text-xs text-red-600 mt-1">{errors.sendDate}</p>}
            </div>
          </div>

          {/* Column + Urgency + Assignee */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Status</label>
              <select
                value={form.column}
                onChange={(e) => set('column', e.target.value as KanbanColumn)}
                className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                {COLUMN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => set('urgency', e.target.value as 'standard' | 'urgent')}
                className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Assignee</label>
              <input
                type="text"
                value={form.assignee}
                onChange={(e) => set('assignee', e.target.value)}
                placeholder="Name or email"
                className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="e.g. Q1, evergreen, fund-launch"
              className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Optional notes about this campaign..."
              className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-700 px-6 py-4 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 text-sm font-medium bg-brand-primary text-white hover:bg-[#0d3232] transition-colors rounded"
          >
            Add to Planner
          </button>
        </div>
      </div>
    </>
  )
}
