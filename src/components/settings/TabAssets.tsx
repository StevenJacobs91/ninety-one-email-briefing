import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { AssetEntry, AssetCategory } from '../../types/settings.types'
import { v4 as uuidv4 } from 'uuid'

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'header',   label: 'Headers' },
  { value: 'profile',  label: 'Profile' },
  { value: 'stripes',  label: 'Stripes' },
  { value: 'logos',    label: 'Logos' },
  { value: 'graphics', label: 'Graphics' },
]

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  header:   'Header',
  profile:  'Profile',
  stripes:  'Stripes',
  logos:    'Logos',
  graphics: 'Graphics',
}

const EMPTY_DRAFT: Omit<AssetEntry, 'id'> = {
  name: '',
  url: '',
  category: 'header',
  colourOverlay: '',
  altText: '',
}

interface AssetFormProps {
  initial: Omit<AssetEntry, 'id'>
  onSave: (data: Omit<AssetEntry, 'id'>) => void
  onCancel: () => void
  title: string
}

function AssetForm({ initial, onSave, onCancel, title }: AssetFormProps) {
  const [draft, setDraft] = useState(initial)
  const [urlError, setUrlError] = useState('')

  function set<K extends keyof typeof draft>(key: K, value: typeof draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!draft.name.trim()) return
    if (!draft.url.trim()) return
    try { new URL(draft.url) } catch { setUrlError('Enter a valid URL'); return }
    setUrlError('')
    onSave(draft)
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. 706930897"
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category <span className="text-red-500">*</span></label>
          <select
            value={draft.category}
            onChange={(e) => set('category', e.target.value as AssetCategory)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">URL <span className="text-red-500">*</span></label>
        <input
          type="url"
          value={draft.url}
          onChange={(e) => { set('url', e.target.value); setUrlError('') }}
          placeholder="https://..."
          className={`w-full text-sm border rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${urlError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Colour Overlay</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.colourOverlay || '#134848'}
              onChange={(e) => set('colourOverlay', e.target.value)}
              className="w-9 h-9 rounded border border-gray-300 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800 cursor-pointer"
            />
            <input
              type="text"
              value={draft.colourOverlay || ''}
              onChange={(e) => set('colourOverlay', e.target.value)}
              placeholder="#221b3b"
              className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-mono"
            />
            {draft.colourOverlay && (
              <button type="button" onClick={() => set('colourOverlay', '')}
                className="text-gray-400 hover:text-red-500 text-lg leading-none" title="Clear">×</button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Alt Text</label>
          <input
            type="text"
            value={draft.altText || ''}
            onChange={(e) => set('altText', e.target.value)}
            placeholder="Describe the image…"
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>
      </div>

      {/* URL preview */}
      {draft.url && !urlError && (
        <div className="rounded-md overflow-hidden border border-gray-200 dark:border-gray-700" style={{ aspectRatio: '640/270' }}>
          <img src={draft.url} alt={draft.altText || draft.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={handleSave}
          disabled={!draft.name.trim() || !draft.url.trim()}
          className="px-4 py-1.5 text-xs font-medium bg-brand-primary text-white rounded-md hover:bg-[#0d3232] transition-colors disabled:opacity-40">
          Save Asset
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

export function TabAssets() {
  const { settings, updateSettings } = useSettings()
  const [activeCategory, setActiveCategory] = useState<AssetCategory | 'all'>('all')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const assets = settings.assets ?? []

  const filtered = activeCategory === 'all'
    ? assets
    : assets.filter((a) => a.category === activeCategory)

  const countFor = (cat: AssetCategory) => assets.filter((a) => a.category === cat).length

  function handleAdd(data: Omit<AssetEntry, 'id'>) {
    updateSettings({ assets: [...assets, { ...data, id: uuidv4() }] })
    setIsAdding(false)
  }

  function handleEdit(id: string, data: Omit<AssetEntry, 'id'>) {
    updateSettings({ assets: assets.map((a) => a.id === id ? { ...data, id } : a) })
    setEditingId(null)
  }

  function handleDelete(id: string) {
    updateSettings({ assets: assets.filter((a) => a.id !== id) })
    setDeleteConfirmId(null)
  }

  return (
    <div className="space-y-5">
      {/* Category filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeCategory === 'all' ? 'bg-brand-primary text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          All ({assets.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeCategory === cat.value ? 'bg-brand-primary text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            {cat.label} ({countFor(cat.value)})
          </button>
        ))}
      </div>

      {/* Add form */}
      {isAdding && (
        <AssetForm
          title="New Asset"
          initial={EMPTY_DRAFT}
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Asset grid */}
      {filtered.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="text-gray-300 dark:text-gray-600 mb-3" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No {activeCategory === 'all' ? '' : CATEGORY_LABELS[activeCategory] + ' '}assets yet.
          </p>
          <button type="button" onClick={() => setIsAdding(true)}
            className="mt-3 text-xs text-brand-primary dark:text-brand-accent hover:underline">
            + Add one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((asset) => (
            <div key={asset.id}>
              {editingId === asset.id ? (
                <AssetForm
                  title={`Edit — ${asset.name}`}
                  initial={{ name: asset.name, url: asset.url, category: asset.category, colourOverlay: asset.colourOverlay, altText: asset.altText }}
                  onSave={(data) => handleEdit(asset.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="group relative bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {/* Image */}
                  <div className="relative" style={{ aspectRatio: '640/270' }}>
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Colour overlay swatch */}
                    {asset.colourOverlay && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="w-3 h-3 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: asset.colourOverlay }} />
                        <span className="text-[10px] text-white font-mono">{asset.colourOverlay}</span>
                      </div>
                    )}
                    {/* Category badge */}
                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <span className="text-[10px] text-white uppercase tracking-wider">{CATEGORY_LABELS[asset.category]}</span>
                    </div>
                    {/* Action overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-2 gap-1.5 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => { setEditingId(asset.id); setIsAdding(false) }}
                        className="bg-white text-gray-700 text-xs font-medium px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors shadow"
                      >
                        Edit
                      </button>
                      {deleteConfirmId === asset.id ? (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => handleDelete(asset.id)}
                            className="bg-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-md hover:bg-red-700 transition-colors shadow">
                            Delete
                          </button>
                          <button type="button" onClick={() => setDeleteConfirmId(null)}
                            className="bg-white text-gray-700 text-xs font-medium px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors shadow">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirmId(asset.id)}
                          className="bg-white text-gray-700 text-xs font-medium px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors shadow">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Card footer */}
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{asset.name}</p>
                    {asset.altText && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{asset.altText}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add button — shown when not already adding */}
      {!isAdding && filtered.length > 0 && (
        <button
          type="button"
          onClick={() => { setIsAdding(true); setEditingId(null) }}
          className="text-xs font-medium text-brand-primary dark:text-brand-accent border border-brand-primary/30 dark:border-brand-accent/30 px-3 py-1.5 rounded-md hover:bg-brand-primary/5 dark:hover:bg-brand-accent/5 transition-colors"
        >
          + Add Asset
        </button>
      )}
    </div>
  )
}
