import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '../../contexts/SettingsContext'
import type { CampaignEntry, CampaignSenderPreset, CampaignContentPreset } from '../../types/settings.types'
import { CLIENT_GROUPS, CHANNELS, BRAND_THEMES } from '../../lib/constants'
import { PRESET_CAMPAIGNS } from '../../lib/campaignPresets'

const CHANNEL_LABELS: Record<string, string> = {
  Advisor: 'Advisor',
  Institutional: 'Institutional',
  'Corporate Solutions': 'Corporate Solutions',
  'Individual Investor': 'Individual Investor',
  Internal: 'Internal',
}

function ChipGroup({
  label,
  hint,
  options,
  optionLabels,
  selected,
  onChange,
}: {
  label: string
  hint?: string
  options: readonly string[]
  optionLabels?: Record<string, string>
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{' '}
        {hint && <span className="text-gray-400 font-normal">{hint}</span>}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              const next = selected.includes(opt)
                ? selected.filter((v) => v !== opt)
                : [...selected, opt]
              onChange(next)
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              selected.includes(opt)
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            {optionLabels ? (optionLabels[opt] ?? opt) : opt}
          </button>
        ))}
      </div>
    </div>
  )
}

interface CampaignFormState {
  name: string
  clientGroups: string[]
  channels: string[]
  hasSenderPreset: boolean
  preset: CampaignSenderPreset
  hasContentPreset: boolean
  contentPreset: CampaignContentPreset
}

const EMPTY_PRESET: CampaignSenderPreset = { fromName: '', fromAddress: '', replyToEmail: '' }
const EMPTY_CONTENT_PRESET: CampaignContentPreset = {
  theme: '',
  subjectLine: '',
  previewText: '',
  heroImageUrl: '',
  headline: '',
  subHeadline: '',
  signatureId: '',
  disclaimerId: '',
  distributionList: '',
  pardotListId: '',
}
const EMPTY_FORM: CampaignFormState = {
  name: '',
  clientGroups: [],
  channels: [],
  hasSenderPreset: false,
  preset: EMPTY_PRESET,
  hasContentPreset: false,
  contentPreset: EMPTY_CONTENT_PRESET,
}

function formFromEntry(c: CampaignEntry): CampaignFormState {
  return {
    name: c.name,
    clientGroups: [...(c.clientGroups ?? [])],
    channels: [...c.channels],
    hasSenderPreset: !!c.senderPreset,
    preset: c.senderPreset ? { ...c.senderPreset } : { ...EMPTY_PRESET },
    hasContentPreset: !!c.contentPreset,
    contentPreset: c.contentPreset ? { ...c.contentPreset } : { ...EMPTY_CONTENT_PRESET },
  }
}

function hasAnyContentPresetValue(cp: CampaignContentPreset): boolean {
  return Object.values(cp).some((v) => typeof v === 'string' && v.trim() !== '')
}

function entryFromForm(id: string, form: CampaignFormState): CampaignEntry {
  // Save contentPreset if the section is enabled OR if any field has a value —
  // prevents accidentally discarding filled-in data when the toggle state is stale.
  const contentPreset = hasAnyContentPresetValue(form.contentPreset)
    ? { ...form.contentPreset }
    : undefined

  return {
    id,
    name: form.name.trim(),
    regions: [],
    clientGroups: form.clientGroups,
    channels: form.channels,
    senderPreset: form.hasSenderPreset && form.preset.fromName.trim()
      ? { fromName: form.preset.fromName.trim(), fromAddress: form.preset.fromAddress.trim(), replyToEmail: form.preset.replyToEmail.trim() }
      : undefined,
    contentPreset,
  }
}

function SenderPresetFields({
  preset,
  onChange,
}: {
  preset: CampaignSenderPreset
  onChange: (patch: Partial<CampaignSenderPreset>) => void
}) {
  return (
    <div className="space-y-3 pt-1">
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">From Name</label>
        <input
          type="text"
          value={preset.fromName}
          onChange={(e) => onChange({ fromName: e.target.value })}
          placeholder="e.g. Ninety One"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">From Email Address</label>
        <input
          type="email"
          value={preset.fromAddress}
          onChange={(e) => onChange({ fromAddress: e.target.value })}
          placeholder="e.g. norespond@ninetyone.com"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Reply-to Email Address</label>
        <input
          type="email"
          value={preset.replyToEmail}
          onChange={(e) => onChange({ replyToEmail: e.target.value })}
          placeholder="e.g. marketing@ninetyone.com"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>
    </div>
  )
}

function ContentPresetFields({
  contentPreset,
  onChange,
  signoffs,
  disclaimers,
}: {
  contentPreset: CampaignContentPreset
  onChange: (patch: Partial<CampaignContentPreset>) => void
  signoffs: { id: string; name: string }[]
  disclaimers: { id: string; label: string }[]
}) {
  return (
    <div className="space-y-3 pt-1">
      {/* Brand Theme */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Brand Theme</label>
        <select
          value={contentPreset.theme}
          onChange={(e) => onChange({ theme: e.target.value })}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        >
          <option value="">— None —</option>
          {BRAND_THEMES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        {contentPreset.theme && (() => {
          const t = BRAND_THEMES.find((bt) => bt.id === contentPreset.theme)
          return t ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: t.primary }} />
              <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: t.accent }} />
              <span className="text-[10px] text-gray-400">{t.primary} / {t.accent}</span>
            </div>
          ) : null
        })()}
      </div>

      {/* Subject Line */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Subject Line</label>
        <input
          type="text"
          value={contentPreset.subjectLine}
          onChange={(e) => onChange({ subjectLine: e.target.value })}
          placeholder="e.g. Taking Stock — March 2026"
          maxLength={60}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
        {contentPreset.subjectLine && (
          <p className="text-[10px] text-gray-400 mt-0.5 text-right">{contentPreset.subjectLine.length}/60</p>
        )}
      </div>

      {/* Preview Text */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Preview Text</label>
        <input
          type="text"
          value={contentPreset.previewText}
          onChange={(e) => onChange({ previewText: e.target.value })}
          placeholder="e.g. Your monthly investment insights"
          maxLength={90}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
        {contentPreset.previewText && (
          <p className="text-[10px] text-gray-400 mt-0.5 text-right">{contentPreset.previewText.length}/90</p>
        )}
      </div>

      {/* Hero Image URL */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Hero Image URL</label>
        <input
          type="url"
          value={contentPreset.heroImageUrl}
          onChange={(e) => onChange({ heroImageUrl: e.target.value })}
          placeholder="https://..."
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>

      {/* Headline */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Headline</label>
        <input
          type="text"
          value={contentPreset.headline}
          onChange={(e) => onChange({ headline: e.target.value })}
          placeholder="e.g. Monthly Investment Update"
          maxLength={80}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>

      {/* Sub-Headline */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Sub-Headline</label>
        <input
          type="text"
          value={contentPreset.subHeadline}
          onChange={(e) => onChange({ subHeadline: e.target.value })}
          placeholder="e.g. Insights from our investment team"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
      </div>

      {/* Two-column: Signature + Disclaimer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Signature</label>
          <select
            value={contentPreset.signatureId}
            onChange={(e) => onChange({ signatureId: e.target.value })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          >
            <option value="">— None —</option>
            {signoffs.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Disclaimer</label>
          <select
            value={contentPreset.disclaimerId}
            onChange={(e) => onChange({ disclaimerId: e.target.value })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          >
            <option value="">— None —</option>
            {disclaimers.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Two-column: Distribution List + Pardot List */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Distribution List</label>
          <input
            type="text"
            value={contentPreset.distributionList}
            onChange={(e) => onChange({ distributionList: e.target.value })}
            placeholder="e.g. SA Advisors"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Pardot List ID</label>
          <input
            type="text"
            value={contentPreset.pardotListId}
            onChange={(e) => onChange({ pardotListId: e.target.value })}
            placeholder="e.g. 12345"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
        </div>
      </div>
    </div>
  )
}

function CampaignForm({
  form,
  onChange,
  onSave,
  onCancel,
  saveLabel,
  signoffs,
  disclaimers,
}: {
  form: CampaignFormState
  onChange: (patch: Partial<CampaignFormState>) => void
  onSave: () => void
  onCancel: () => void
  saveLabel: string
  signoffs: { id: string; name: string }[]
  disclaimers: { id: string; label: string }[]
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Campaign Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. SA Intermediary Taking Stock"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          autoFocus
        />
      </div>

      <ChipGroup
        label="Client Groups"
        hint="(empty = all)"
        options={CLIENT_GROUPS}
        selected={form.clientGroups}
        onChange={(v) => onChange({ clientGroups: v })}
      />

      <ChipGroup
        label="Channels / Audiences"
        hint="(empty = all)"
        options={CHANNELS}
        optionLabels={CHANNEL_LABELS}
        selected={form.channels}
        onChange={(v) => onChange({ channels: v })}
      />

      {/* Sender Preset */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => onChange({ hasSenderPreset: !form.hasSenderPreset })}
          className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
        >
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Sender Details Preset</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Auto-fill From Name, From Email and Reply-to when this campaign is selected</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${form.hasSenderPreset ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-400'}`}>
            {form.hasSenderPreset ? 'Enabled ▲' : 'Add ▼'}
          </span>
        </button>
        {form.hasSenderPreset && (
          <div className="px-4 pb-4">
            <SenderPresetFields
              preset={form.preset}
              onChange={(patch) => onChange({ preset: { ...form.preset, ...patch } })}
            />
          </div>
        )}
      </div>

      {/* Content & Design Preset */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => onChange({ hasContentPreset: !form.hasContentPreset })}
          className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
        >
          <div>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Content &amp; Design Preset</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Auto-fill theme, subject, headline, hero image, signature, disclaimer, and distribution details</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${form.hasContentPreset ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-400'}`}>
            {form.hasContentPreset ? 'Enabled ▲' : 'Add ▼'}
          </span>
        </button>
        {form.hasContentPreset && (
          <div className="px-4 pb-4">
            <ContentPresetFields
              contentPreset={form.contentPreset}
              onChange={(patch) => onChange({ contentPreset: { ...form.contentPreset, ...patch } })}
              signoffs={signoffs}
              disclaimers={disclaimers}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={!form.name.trim()}
          className="px-4 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover transition-colors disabled:opacity-40"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function TabCampaigns() {
  const { settings, updateSettings } = useSettings()
  const campaigns = settings.campaigns ?? []
  const signoffs = (settings.signoffs ?? []).map((s) => ({ id: s.id, name: s.name }))
  const disclaimers = (settings.legalDisclaimers ?? []).map((d) => ({ id: d.id, label: d.label }))

  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState<CampaignFormState>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<CampaignFormState>(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [importDone, setImportDone] = useState(false)
  const [importConfirm, setImportConfirm] = useState(false)

  function handleImportPresets() {
    const existingNames = new Set(campaigns.map((c) => c.name))
    const newCampaigns: CampaignEntry[] = PRESET_CAMPAIGNS
      .filter((p) => !existingNames.has(p.name))
      .map((p) => ({ ...p, id: uuidv4() }))
    if (newCampaigns.length === 0) { setImportConfirm(false); return }
    saveCampaigns([...campaigns, ...newCampaigns])
    setImportConfirm(false)
    setImportDone(true)
    setTimeout(() => setImportDone(false), 3000)
  }

  function saveCampaigns(next: CampaignEntry[]) {
    updateSettings({ campaigns: next })
  }

  function handleAdd() {
    if (!newForm.name.trim()) return
    saveCampaigns([...campaigns, entryFromForm(uuidv4(), newForm)])
    setNewForm(EMPTY_FORM)
    setAddingNew(false)
  }

  function handleEditStart(c: CampaignEntry) {
    setEditingId(c.id)
    setEditForm(formFromEntry(c))
  }

  function handleEditSave() {
    if (!editForm.name.trim()) return
    saveCampaigns(campaigns.map((c) => c.id === editingId ? entryFromForm(c.id, editForm) : c))
    setEditingId(null)
  }

  function handleDelete(id: string) {
    saveCampaigns(campaigns.filter((c) => c.id !== id))
    setDeleteConfirmId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Campaigns appear in the brief form filtered by client group and audience. Leave filters empty to show a campaign for all. Add a sender preset to auto-fill the From Name, From Email and Reply-to fields when this campaign is selected.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {!addingNew && (
            <>
              {importConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Import {PRESET_CAMPAIGNS.filter(p => !campaigns.some(c => c.name === p.name)).length} new campaigns?
                  </span>
                  <button type="button" onClick={handleImportPresets}
                    className="text-xs px-2.5 py-1 bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover transition-colors">
                    Import
                  </button>
                  <button type="button" onClick={() => setImportConfirm(false)}
                    className="text-xs px-2.5 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setImportConfirm(true)}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Import Presets
                </button>
              )}
              {importDone && <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Imported</span>}
              <button
                type="button"
                onClick={() => { setAddingNew(true); setNewForm(EMPTY_FORM) }}
                className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors"
              >
                + Add Campaign
              </button>
            </>
          )}
        </div>
      </div>

      {/* New campaign form */}
      {addingNew && (
        <div className="border border-brand-primary/20 dark:border-brand-accent/20 rounded-lg p-4 bg-brand-bg-panel/60 dark:bg-gray-800/60">
          <p className="text-xs font-medium text-brand-primary dark:text-brand-accent uppercase tracking-wider mb-4">New Campaign</p>
          <CampaignForm
            form={newForm}
            onChange={(patch) => setNewForm((f) => ({ ...f, ...patch }))}
            onSave={handleAdd}
            onCancel={() => setAddingNew(false)}
            saveLabel="Save Campaign"
            signoffs={signoffs}
            disclaimers={disclaimers}
          />
        </div>
      )}

      {/* Empty state */}
      {campaigns.length === 0 && !addingNew && (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-8">
          No campaigns yet. Add your first campaign above.
        </p>
      )}

      {/* Campaign list */}
      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {editingId === c.id ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs font-medium text-brand-primary dark:text-brand-accent uppercase tracking-wider mb-4">Edit Campaign</p>
                <CampaignForm
                  form={editForm}
                  onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
                  onSave={handleEditSave}
                  onCancel={() => setEditingId(null)}
                  saveLabel="Save Changes"
                  signoffs={signoffs}
                  disclaimers={disclaimers}
                />
              </div>
            ) : deleteConfirmId === c.id ? (
              <div className="px-4 py-3 flex items-center justify-between gap-4 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-700 dark:text-red-400">Delete <strong>{c.name}</strong>?</p>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => handleDelete(c.id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                    {c.senderPreset && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#cf6f13]/10 dark:bg-[#cf6f13]/20 text-[#cf6f13] dark:text-[#fcaa28] font-medium shrink-0">Sender</span>
                    )}
                    {c.contentPreset && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-accent font-medium shrink-0">Content</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(c.clientGroups ?? []).length === 0 && c.channels.length === 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">All client groups · All audiences</span>
                    )}
                    {(c.clientGroups ?? []).map((cg) => (
                      <span key={cg} className="text-xs px-1.5 py-0.5 rounded bg-brand-primary/10 dark:bg-brand-primary/30 text-brand-primary dark:text-brand-accent">{cg}</span>
                    ))}
                    {c.channels.map((ch) => (
                      <span key={ch} className="text-xs px-1.5 py-0.5 rounded bg-[#cf6f13]/10 dark:bg-[#cf6f13]/20 text-[#cf6f13] dark:text-[#fcaa28]">{CHANNEL_LABELS[ch] ?? ch}</span>
                    ))}
                  </div>
                  {c.senderPreset && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      From: {c.senderPreset.fromName} &lt;{c.senderPreset.fromAddress}&gt;
                    </p>
                  )}
                  {c.contentPreset && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {[
                        c.contentPreset.theme && BRAND_THEMES.find((t) => t.id === c.contentPreset!.theme)?.label,
                        c.contentPreset.subjectLine && `"${c.contentPreset.subjectLine}"`,
                        c.contentPreset.headline,
                      ].filter(Boolean).join(' · ') || 'Content preset configured'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditStart(c)}
                    className="text-xs text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent px-2 py-1 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(c.id)}
                    className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
