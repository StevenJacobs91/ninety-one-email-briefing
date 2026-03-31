import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '../../contexts/SettingsContext'
import type { CampaignEntry, CampaignSenderPreset } from '../../types/settings.types'
import { CLIENT_GROUPS, CHANNELS } from '../../lib/constants'

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
}

const EMPTY_PRESET: CampaignSenderPreset = { fromName: '', fromAddress: '', replyToEmail: '' }
const EMPTY_FORM: CampaignFormState = {
  name: '',
  clientGroups: [],
  channels: [],
  hasSenderPreset: false,
  preset: EMPTY_PRESET,
}

function formFromEntry(c: CampaignEntry): CampaignFormState {
  return {
    name: c.name,
    clientGroups: [...(c.clientGroups ?? [])],
    channels: [...c.channels],
    hasSenderPreset: !!c.senderPreset,
    preset: c.senderPreset ? { ...c.senderPreset } : { ...EMPTY_PRESET },
  }
}

function entryFromForm(id: string, form: CampaignFormState): CampaignEntry {
  return {
    id,
    name: form.name.trim(),
    regions: [],
    clientGroups: form.clientGroups,
    channels: form.channels,
    senderPreset: form.hasSenderPreset && form.preset.fromName.trim()
      ? { fromName: form.preset.fromName.trim(), fromAddress: form.preset.fromAddress.trim(), replyToEmail: form.preset.replyToEmail.trim() }
      : undefined,
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

function CampaignForm({
  form,
  onChange,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: CampaignFormState
  onChange: (patch: Partial<CampaignFormState>) => void
  onSave: () => void
  onCancel: () => void
  saveLabel: string
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState<CampaignFormState>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<CampaignFormState>(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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
        {!addingNew && (
          <button
            type="button"
            onClick={() => { setAddingNew(true); setNewForm(EMPTY_FORM) }}
            className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors shrink-0"
          >
            + Add Campaign
          </button>
        )}
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#cf6f13]/10 dark:bg-[#cf6f13]/20 text-[#cf6f13] dark:text-[#fcaa28] font-medium shrink-0">Sender preset</span>
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
