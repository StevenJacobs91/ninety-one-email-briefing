import { useEffect, useId, useState, useRef } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { AssetEntry, AssetCategory } from '../../types/settings.types'
import { v4 as uuidv4 } from 'uuid'
import { assetSearchParts, matchesSearch } from '../../lib/settingsSearch'
import { SettingsSearchField } from './SettingsSearchField'
import { BRAND_PRIMARIES } from '../../lib/brandTints'

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'header',   label: 'Headers' },
  { value: 'profile',  label: 'Profile' },
  { value: 'stripes',  label: 'Stripes' },
  { value: 'logos',    label: 'Logos' },
  { value: 'graphics', label: 'Graphics' },
  { value: 'images',   label: 'Images' },
]

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  header:   'Header',
  profile:  'Profile',
  stripes:  'Stripes',
  logos:    'Logos',
  graphics: 'Graphics',
  images:   'Images',
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

function OverlayChoice({ group, label, colour, selected, onPick }: { group: string; label: string; colour: string; selected: boolean; onPick: () => void }) {
  return (
    <label title={label} className={`relative w-8 h-8 rounded-full cursor-pointer border-2 flex items-center justify-center ${selected ? 'border-brand-primary dark:border-brand-accent ring-2 ring-brand-primary/30' : 'border-gray-300 dark:border-gray-600'}`}>
      <input type="radio" name={group} aria-label={label} checked={selected} onChange={onPick} className="sr-only" />
      {colour ? (
        <span className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: colour }} />
      ) : (
        <span className="w-5 h-5 rounded-full border border-dashed border-gray-400 relative overflow-hidden" aria-hidden="true">
          <span className="absolute inset-0 -rotate-45 border-t border-gray-400 top-1/2" />
        </span>
      )}
    </label>
  )
}

/** The image's exact size in pixels, read from the file itself once it loads. */
function useImageSize(url: string): { state: 'none' | 'loading' | 'error' | 'ready'; width: number; height: number } {
  const [size, setSize] = useState<{ url: string; width: number; height: number } | { url: string; error: true } | null>(null)
  useEffect(() => {
    if (!url.trim()) return
    let current = true
    const img = new Image()
    img.onload = () => { if (current) setSize({ url, width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { if (current) setSize({ url, error: true }) }
    img.src = url
    return () => { current = false }
  }, [url])
  if (!url.trim()) return { state: 'none', width: 0, height: 0 }
  if (!size || size.url !== url) return { state: 'loading', width: 0, height: 0 }
  if ('error' in size) return { state: 'error', width: 0, height: 0 }
  return { state: 'ready', width: size.width, height: size.height }
}

function dimensionsText(s: ReturnType<typeof useImageSize>): string {
  if (s.state === 'ready') return `${s.width} × ${s.height} px`
  if (s.state === 'loading') return 'Reading…'
  if (s.state === 'error') return 'Could not read the image'
  return 'Shown once a URL is entered'
}

function AssetForm({ initial, onSave, onCancel, title }: AssetFormProps) {
  const [draft, setDraft] = useState(initial)
  const size = useImageSize(draft.url)
  // Each open form is its own group of choices, so picking in one never un-picks another.
  const overlayGroup = useId()
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
          <p id="overlay-label" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Colour Overlay</p>
          <div role="radiogroup" aria-labelledby="overlay-label" className="flex flex-wrap items-center gap-2">
            <OverlayChoice group={overlayGroup} label="No overlay" colour="" selected={!draft.colourOverlay} onPick={() => set('colourOverlay', '')} />
            {BRAND_PRIMARIES.map((c) => (
              <OverlayChoice key={c.hex} group={overlayGroup} label={c.name} colour={c.hex} selected={draft.colourOverlay?.toLowerCase() === c.hex} onPick={() => set('colourOverlay', c.hex)} />
            ))}
            {/* An asset saved with another colour keeps it until a brand colour is chosen. */}
            {draft.colourOverlay && !BRAND_PRIMARIES.some((c) => c.hex === draft.colourOverlay?.toLowerCase()) && (
              <OverlayChoice group={overlayGroup} label={`Custom ${draft.colourOverlay}`} colour={draft.colourOverlay} selected onPick={() => {}} />
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 font-mono">
            {draft.colourOverlay ? `${BRAND_PRIMARIES.find((c) => c.hex === draft.colourOverlay?.toLowerCase())?.name ?? 'Custom'} · ${draft.colourOverlay}` : 'Header images are matched to a theme by this colour'}
          </p>
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

      <div>
        <label htmlFor="asset-dimensions" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dimensions</label>
        <output id="asset-dimensions" className="block w-full text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          {dimensionsText(size)}
        </output>
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

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(field.trim())
      field = ''
    } else {
      field += ch
    }
  }
  result.push(field.trim())
  return result
}

export function TabAssets() {
  const { settings, updateSettings } = useSettings()
  const [activeCategory, setActiveCategory] = useState<AssetCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [naturalSizes, setNaturalSizes] = useState<Record<string, string>>({})
  const [csvImportCount, setCsvImportCount] = useState<number | null>(null)
  const [csvImportError, setCsvImportError] = useState<string | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const assets = settings.assets ?? []

  const inCategory = activeCategory === 'all'
    ? assets
    : assets.filter((a) => a.category === activeCategory)
  const filtered = inCategory.filter((a) => matchesSearch(query, assetSearchParts(a)))

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

  function handleCsvFile(file: File) {
    setCsvImportError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split(/\r?\n/).filter((l) => l.trim())
        if (lines.length < 2) {
          setCsvImportError('CSV must have a header row and at least one data row.')
          return
        }
        const dataLines = lines.slice(1) // skip header row
        const newAssets: AssetEntry[] = []
        for (const line of dataLines) {
          const cols = parseCSVLine(line)
          const [name, url, category, colourOverlay, altText] = cols
          if (!name || !url) continue
          try { new URL(url) } catch { continue }
          const validCat = CATEGORIES.find(
            (c) => c.value === (category ?? '').toLowerCase().trim()
          )?.value ?? 'graphics'
          newAssets.push({
            id: uuidv4(),
            name,
            url,
            category: validCat,
            colourOverlay: colourOverlay ?? '',
            altText: altText ?? '',
          })
        }
        if (newAssets.length === 0) {
          setCsvImportError('No valid assets found. Check that each row has a name and a valid URL.')
          return
        }
        const existingUrls = new Set(assets.map((a) => a.url))
        const unique = newAssets.filter((a) => !existingUrls.has(a.url))
        updateSettings({ assets: [...assets, ...unique] })
        setCsvImportCount(unique.length)
        setTimeout(() => setCsvImportCount(null), 4000)
      } catch {
        setCsvImportError('Failed to parse CSV. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {assets.length} asset{assets.length !== 1 ? 's' : ''} in library
        </p>
        <SettingsSearchField className="flex-1 min-w-[200px] max-w-md" value={query} onChange={setQuery} label="Search assets" placeholder="Search by name, description, address or colour…" />
        <div className="flex items-center gap-2 shrink-0">
          {/* Hidden CSV file input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleCsvFile(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import Assets via CSV
          </button>
          <button
            type="button"
            onClick={() => { setIsAdding(true); setEditingId(null) }}
            disabled={isAdding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Asset
          </button>
        </div>
      </div>

      {/* CSV import feedback */}
      {csvImportCount !== null && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs text-green-700 dark:text-green-400 font-medium">
            {csvImportCount} asset{csvImportCount !== 1 ? 's' : ''} imported successfully.
          </span>
        </div>
      )}
      {csvImportError && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <span className="text-xs text-red-600 dark:text-red-400">{csvImportError}</span>
          <button type="button" onClick={() => setCsvImportError(null)} className="text-red-400 hover:text-red-600 text-sm leading-none">×</button>
        </div>
      )}

      {/* CSV format hint — shown when no assets yet */}
      {assets.length === 0 && !isAdding && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-md border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CSV format</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">
            Each row: <code className="font-mono bg-white dark:bg-gray-700 px-1 rounded border border-gray-200 dark:border-gray-600">name,url,category,colourOverlay,altText</code>
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Valid categories: <span className="font-mono">header</span>, <span className="font-mono">profile</span>, <span className="font-mono">stripes</span>, <span className="font-mono">logos</span>, <span className="font-mono">graphics</span>, <span className="font-mono">images</span>
          </p>
        </div>
      )}

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

      {query.trim() !== '' && (
        <p className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">{filtered.length} of {inCategory.length} assets</p>
      )}

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
      {filtered.length === 0 && !isAdding && query.trim() !== '' ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
          No assets match “{query.trim()}”.{' '}
          <button type="button" onClick={() => setQuery('')} className="text-brand-primary dark:text-brand-accent hover:underline">Show all assets</button>
        </p>
      ) : filtered.length === 0 && !isAdding ? (
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
                      onLoad={(e) => { const { naturalWidth: w, naturalHeight: h } = e.currentTarget; setNaturalSizes((prev) => ({ ...prev, [asset.id]: `${w} × ${h} px` })) }}
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
                    {naturalSizes[asset.id] && <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{naturalSizes[asset.id]}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
