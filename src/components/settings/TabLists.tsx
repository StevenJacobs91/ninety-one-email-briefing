import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '../../contexts/SettingsContext'
import type { CustomClientGroup, CustomChannel, CustomRegion } from '../../types/settings.types'
import { CLIENT_GROUPS, REGIONS, CHANNELS, EMAIL_TYPES, EMAIL_TYPE_LABELS } from '../../lib/constants'

// ─── Shared list item row ────────────────────────────────────

function ItemRow({
  label,
  sublabel,
  isBuiltIn,
  onEdit,
  onDelete,
}: {
  label: string
  sublabel?: string
  isBuiltIn?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md">
      <div className="min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isBuiltIn ? (
          <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">Built-in</span>
        ) : (
          <>
            {onEdit && !confirmDelete && (
              <button type="button" onClick={onEdit} className="text-xs text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent px-2 py-1 rounded transition-colors">Edit</button>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
                <button type="button" onClick={onDelete} className="text-xs bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700">Yes</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700">No</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded transition-colors">Delete</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Section wrapper ─────────────────────────────────────────

function ListSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      {children}
      <div className="border-b border-gray-100 dark:border-gray-800 pt-2" />
    </div>
  )
}

// ─── Email Types ─────────────────────────────────────────────

function EmailTypesList() {
  const { settings, updateSettings } = useSettings()
  const custom = settings.customEmailTypes ?? []
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ id: '', label: '' })

  function handleAdd() {
    if (!form.label.trim()) return
    const id = form.id.trim() || form.label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    updateSettings({ customEmailTypes: [...custom, { id, label: form.label.trim() }] })
    setForm({ id: '', label: '' })
    setAdding(false)
  }

  function handleEditSave() {
    updateSettings({ customEmailTypes: custom.map((t) => t.id === editId ? { ...t, label: form.label.trim() } : t) })
    setEditId(null)
  }

  function handleDelete(id: string) {
    updateSettings({ customEmailTypes: custom.filter((t) => t.id !== id) })
  }

  return (
    <ListSection title="Email Types" description="Add custom email types beyond the built-in set.">
      <div className="space-y-1.5">
        {EMAIL_TYPES.map((t) => (
          <ItemRow key={t} label={EMAIL_TYPE_LABELS[t as keyof typeof EMAIL_TYPE_LABELS] ?? t} sublabel={t} isBuiltIn />
        ))}
        {custom.map((t) => (
          editId === t.id ? (
            <div key={t.id} className="flex gap-2 items-center">
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                autoFocus
              />
              <button type="button" onClick={handleEditSave} disabled={!form.label.trim()} className="px-3 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover disabled:opacity-40">Save</button>
              <button type="button" onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            </div>
          ) : (
            <ItemRow key={t.id} label={t.label} sublabel={t.id}
              onEdit={() => { setEditId(t.id); setForm({ id: t.id, label: t.label }) }}
              onDelete={() => handleDelete(t.id)}
            />
          )
        ))}
      </div>
      {adding ? (
        <div className="border border-brand-primary/20 dark:border-brand-accent/20 rounded-lg p-3 bg-brand-bg-panel/60 dark:bg-gray-800/60 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Display Label *</label>
              <input type="text" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Fund Launch" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">ID (auto if blank)</label>
              <input type="text" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} placeholder="e.g. fund-launch" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={!form.label.trim()} className="px-4 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover disabled:opacity-40">Add</button>
            <button type="button" onClick={() => { setAdding(false); setForm({ id: '', label: '' }) }} className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors">
          + Add Email Type
        </button>
      )}
    </ListSection>
  )
}

// ─── Client Groups ───────────────────────────────────────────

function ClientGroupsList() {
  const { settings, updateSettings } = useSettings()
  const custom = settings.customClientGroups ?? []
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<{ name: string; regions: string[] }>({ name: '', regions: [] })
  const [regionInput, setRegionInput] = useState('')

  const allKnownRegions = [...REGIONS, ...(settings.customRegions ?? []).map((r) => r.name)]

  function handleAdd() {
    if (!form.name.trim()) return
    const entry: CustomClientGroup = { id: uuidv4(), name: form.name.trim(), regions: form.regions }
    updateSettings({ customClientGroups: [...custom, entry] })
    setForm({ name: '', regions: [] })
    setAdding(false)
  }

  function handleEditSave() {
    updateSettings({ customClientGroups: custom.map((g) => g.id === editId ? { ...g, name: form.name.trim(), regions: form.regions } : g) })
    setEditId(null)
  }

  function handleDelete(id: string) {
    updateSettings({ customClientGroups: custom.filter((g) => g.id !== id) })
  }

  function toggleRegion(region: string) {
    setForm((f) => ({
      ...f,
      regions: f.regions.includes(region) ? f.regions.filter((r) => r !== region) : [...f.regions, region],
    }))
  }

  function addCustomRegion() {
    const name = regionInput.trim()
    if (!name || form.regions.includes(name)) return
    setForm((f) => ({ ...f, regions: [...f.regions, name] }))
    setRegionInput('')
  }

  const FormContent = () => (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Client Group Name *</label>
        <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Middle East" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" autoFocus />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Regions in this group</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {allKnownRegions.map((r) => (
            <button key={r} type="button" onClick={() => toggleRegion(r)} className={`px-2 py-0.5 rounded text-xs border transition-colors ${form.regions.includes(r) ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>{r}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={regionInput} onChange={(e) => setRegionInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomRegion() } }} placeholder="Add a new region name…" className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" />
          <button type="button" onClick={addCustomRegion} disabled={!regionInput.trim()} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40">Add</button>
        </div>
        {form.regions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {form.regions.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-primary/10 dark:bg-brand-primary/30 text-brand-primary dark:text-brand-accent">
                {r}
                <button type="button" onClick={() => toggleRegion(r)} className="hover:text-red-500 transition-colors leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <ListSection title="Client Groups" description="Add custom client groups with their associated regions.">
      <div className="space-y-1.5">
        {CLIENT_GROUPS.map((g) => (
          <ItemRow key={g} label={g} isBuiltIn />
        ))}
        {custom.map((g) => (
          editId === g.id ? (
            <div key={g.id} className="border border-brand-primary/20 dark:border-brand-accent/20 rounded-lg p-3 bg-brand-bg-panel/60 dark:bg-gray-800/60 space-y-3">
              <FormContent />
              <div className="flex gap-2">
                <button type="button" onClick={handleEditSave} disabled={!form.name.trim()} className="px-4 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover disabled:opacity-40">Save</button>
                <button type="button" onClick={() => setEditId(null)} className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              </div>
            </div>
          ) : (
            <ItemRow key={g.id} label={g.name} sublabel={g.regions.length > 0 ? g.regions.join(', ') : 'No regions assigned'}
              onEdit={() => { setEditId(g.id); setForm({ name: g.name, regions: [...g.regions] }); setRegionInput('') }}
              onDelete={() => handleDelete(g.id)}
            />
          )
        ))}
      </div>
      {adding ? (
        <div className="border border-brand-primary/20 dark:border-brand-accent/20 rounded-lg p-3 bg-brand-bg-panel/60 dark:bg-gray-800/60 space-y-3">
          <p className="text-xs font-medium text-brand-primary dark:text-brand-accent uppercase tracking-wider">New Client Group</p>
          <FormContent />
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={!form.name.trim()} className="px-4 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover disabled:opacity-40">Add Group</button>
            <button type="button" onClick={() => { setAdding(false); setForm({ name: '', regions: [] }); setRegionInput('') }} className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setAdding(true); setForm({ name: '', regions: [] }) }} className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors">
          + Add Client Group
        </button>
      )}
    </ListSection>
  )
}

// ─── Channels ────────────────────────────────────────────────

function ChannelsList() {
  const { settings, updateSettings } = useSettings()
  const custom = settings.customChannels ?? []
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomChannel>({ id: '', label: '' })

  function handleAdd() {
    if (!form.label.trim()) return
    const id = form.id.trim() || form.label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    updateSettings({ customChannels: [...custom, { id, label: form.label.trim() }] })
    setForm({ id: '', label: '' })
    setAdding(false)
  }

  function handleEditSave() {
    updateSettings({ customChannels: custom.map((c) => c.id === editId ? { ...c, label: form.label.trim() } : c) })
    setEditId(null)
  }

  function handleDelete(id: string) {
    updateSettings({ customChannels: custom.filter((c) => c.id !== id) })
  }

  return (
    <ListSection title="Channels / Audiences" description="Add custom audience channels beyond the built-in set.">
      <div className="space-y-1.5">
        {CHANNELS.map((c) => (
          <ItemRow key={c} label={c} isBuiltIn />
        ))}
        {custom.map((c) => (
          editId === c.id ? (
            <div key={c.id} className="flex gap-2 items-center">
              <input type="text" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" autoFocus />
              <button type="button" onClick={handleEditSave} disabled={!form.label.trim()} className="px-3 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover disabled:opacity-40">Save</button>
              <button type="button" onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            </div>
          ) : (
            <ItemRow key={c.id} label={c.label} sublabel={c.id}
              onEdit={() => { setEditId(c.id); setForm({ ...c }) }}
              onDelete={() => handleDelete(c.id)}
            />
          )
        ))}
      </div>
      {adding ? (
        <div className="border border-brand-primary/20 dark:border-brand-accent/20 rounded-lg p-3 bg-brand-bg-panel/60 dark:bg-gray-800/60 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Display Label *</label>
              <input type="text" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Family Office" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">ID (auto if blank)</label>
              <input type="text" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} placeholder="e.g. family-office" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={!form.label.trim()} className="px-4 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover disabled:opacity-40">Add</button>
            <button type="button" onClick={() => { setAdding(false); setForm({ id: '', label: '' }) }} className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors">
          + Add Channel
        </button>
      )}
    </ListSection>
  )
}

// ─── Regions (custom only) ───────────────────────────────────

function RegionsList() {
  const { settings, updateSettings } = useSettings()
  const custom = settings.customRegions ?? []
  const allClientGroups = [
    ...CLIENT_GROUPS,
    ...(settings.customClientGroups ?? []).map((g) => g.name),
  ]
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<CustomRegion>({ name: '', clientGroup: '' })

  function handleAdd() {
    if (!form.name.trim()) return
    updateSettings({ customRegions: [...custom, { name: form.name.trim(), clientGroup: form.clientGroup }] })
    setForm({ name: '', clientGroup: '' })
    setAdding(false)
  }

  function handleDelete(name: string) {
    updateSettings({ customRegions: custom.filter((r) => r.name !== name) })
  }

  return (
    <ListSection title="Regions" description="Add regions not in the built-in list. Built-in regions cannot be deleted.">
      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
        Built-in regions: {[...REGIONS].join(', ')}.
      </p>
      <div className="space-y-1.5">
        {custom.map((r) => (
          <ItemRow key={r.name} label={r.name} sublabel={r.clientGroup ? `Client group: ${r.clientGroup}` : undefined}
            onDelete={() => handleDelete(r.name)}
          />
        ))}
        {custom.length === 0 && !adding && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No custom regions yet.</p>
        )}
      </div>
      {adding ? (
        <div className="border border-brand-primary/20 dark:border-brand-accent/20 rounded-lg p-3 bg-brand-bg-panel/60 dark:bg-gray-800/60 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Region Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Kenya" className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Client Group</label>
              <select value={form.clientGroup} onChange={(e) => setForm((f) => ({ ...f, clientGroup: e.target.value }))} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary">
                <option value="">None</option>
                {allClientGroups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={!form.name.trim()} className="px-4 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover disabled:opacity-40">Add</button>
            <button type="button" onClick={() => { setAdding(false); setForm({ name: '', clientGroup: '' }) }} className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors">
          + Add Region
        </button>
      )}
    </ListSection>
  )
}

// ─── Main export ─────────────────────────────────────────────

export function TabLists() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Built-in entries cannot be edited or deleted. Custom entries are appended and appear in the briefing form alongside the defaults.
      </p>
      <EmailTypesList />
      <ClientGroupsList />
      <ChannelsList />
      <RegionsList />
    </div>
  )
}
