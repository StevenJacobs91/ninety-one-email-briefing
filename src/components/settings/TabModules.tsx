import { useState, useMemo } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { HtmlModuleConfig, ModuleCategory } from '../../types/settings.types'

const CATEGORIES: ModuleCategory[] = ['Headers', 'Content', 'CTAs', 'Events', 'Speakers', 'Articles', 'Media', 'Navigation', 'Footers']

export function TabModules() {
  const { settings, updateSettings } = useSettings()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<HtmlModuleConfig>({ id: '', label: '', description: '', category: 'Content', enabled: true })
  const [isAdding, setIsAdding] = useState(false)
  const [filterCategory, setFilterCategory] = useState<ModuleCategory | 'all'>('all')

  const modules = settings.htmlModules

  const grouped = useMemo(() => {
    const filtered = filterCategory === 'all' ? modules : modules.filter((m) => m.category === filterCategory)
    const map = new Map<ModuleCategory, HtmlModuleConfig[]>()
    for (const cat of CATEGORIES) {
      const items = filtered.filter((m) => m.category === cat)
      if (items.length > 0) map.set(cat, items)
    }
    return map
  }, [modules, filterCategory])

  const startEdit = (mod: HtmlModuleConfig) => {
    setEditingId(mod.id)
    setDraft({ ...mod })
    setIsAdding(false)
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setDraft({ id: '', label: '', description: '', category: 'Content', enabled: true })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
  }

  const saveEdit = () => {
    if (!draft.label.trim()) return
    updateSettings({
      htmlModules: modules.map((m) => (m.id === editingId ? { ...draft, id: editingId } : m)),
    })
    setEditingId(null)
  }

  const saveNew = () => {
    if (!draft.label.trim() || !draft.id.trim()) return
    if (modules.some((m) => m.id === draft.id)) return
    updateSettings({
      htmlModules: [...modules, draft],
    })
    setIsAdding(false)
  }

  const removeModule = (id: string) => {
    updateSettings({
      htmlModules: modules.filter((m) => m.id !== id),
    })
    if (editingId === id) setEditingId(null)
  }

  const toggleEnabled = (id: string) => {
    updateSettings({
      htmlModules: modules.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
    })
  }

  const enabledCount = modules.filter((m) => m.enabled).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Email Modules ({enabledCount}/{modules.length} enabled)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage the library of email modules available in the content step.
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="text-xs font-medium text-[#134848] dark:text-[#fbaa96] border border-[#134848]/30 dark:border-[#fbaa96]/30 px-3 py-1.5 rounded-md hover:bg-[#134848]/5 dark:hover:bg-[#fbaa96]/5 transition-colors"
        >
          + Add Module
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-[#134848] text-white dark:bg-[#fbaa96] dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All ({modules.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = modules.filter((m) => m.category === cat).length
          if (count === 0) return null
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-[#134848] text-white dark:bg-[#fbaa96] dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Add new module */}
      {isAdding && (
        <ModuleEditRow draft={draft} onChange={setDraft} onSave={saveNew} onCancel={cancelEdit} isNew />
      )}

      {/* Module list grouped by category */}
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">{category}</h4>
          <div className="space-y-0.5">
            {items.map((mod) => (
              <div key={mod.id}>
                {editingId === mod.id ? (
                  <ModuleEditRow draft={draft} onChange={setDraft} onSave={saveEdit} onCancel={cancelEdit} />
                ) : (
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors ${!mod.enabled ? 'opacity-50' : ''}`}>
                    {/* Enable/disable toggle */}
                    <button
                      type="button"
                      onClick={() => toggleEnabled(mod.id)}
                      className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${
                        mod.enabled ? 'bg-[#134848] dark:bg-[#fbaa96]' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      title={mod.enabled ? 'Disable module' : 'Enable module'}
                    >
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                        mod.enabled ? 'left-[17px]' : 'left-0.5'
                      }`} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{mod.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{mod.description}</p>
                    </div>

                    <span className="text-[10px] font-mono text-gray-400 hidden sm:block shrink-0">{mod.id}</span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button type="button" onClick={() => startEdit(mod)} className="p-1 text-gray-400 hover:text-[#134848] dark:hover:text-[#fbaa96]" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button type="button" onClick={() => removeModule(mod.id)} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ModuleEditRow({
  draft,
  onChange,
  onSave,
  onCancel,
  isNew,
}: {
  draft: HtmlModuleConfig
  onChange: (d: HtmlModuleConfig) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-2 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
        {isNew ? 'New Module' : 'Edit Module'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {isNew && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Module ID</label>
            <input
              type="text"
              value={draft.id}
              onChange={(e) => onChange({ ...draft, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder="my-custom-module"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-mono px-3 py-1.5 dark:text-gray-100"
            />
          </div>
        )}
        <div>
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={draft.label}
            onChange={(e) => onChange({ ...draft, label: e.target.value })}
            placeholder="Module display name"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
          <select
            value={draft.category}
            onChange={(e) => onChange({ ...draft, category: e.target.value as ModuleCategory })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            placeholder="Brief description of this module"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onSave} className="text-xs font-medium bg-[#134848] text-white px-3 py-1.5 rounded-md hover:bg-[#0d3232] transition-colors">
          {isNew ? 'Add Module' : 'Save Changes'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-medium text-gray-500 px-3 py-1.5 hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
