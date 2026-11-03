import { useMemo, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { AssetCategory } from '../../types/settings.types'
import { nextAssetCategory } from '../../lib/assetCategories'

interface Props {
  category: AssetCategory
  /** What the image is in the email, e.g. "Profile photo" */
  label: string
  /** What the fields' ids are made from, when two pickers have the same label (one per article, say) */
  id?: string
  url: string
  alt: string
  onChange: (patch: { url?: string; alt?: string }) => void
}

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  header: 'Headers', profile: 'Profiles', stripes: 'Stripes', logos: 'Logos', graphics: 'Graphics', images: 'Images', gifs: 'GIFs',
}

const INPUT = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary'
const LABEL = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1'

/** Replaces one image in a module from a category of the media library (Settings → Asset Library), or by URL. */
export function AssetLibraryPicker({ category, label, id, url, alt, onChange }: Props) {
  const { settings } = useSettings()
  const [search, setSearch] = useState('')
  // `category` is where the picker starts; "Browse … instead" goes round the library's other categories from there.
  const [chosen, setChosen] = useState<AssetCategory | null>(null)
  const active = chosen ?? category
  const withAssets = useMemo(() => new Set((settings.assets ?? []).map((a) => a.category)), [settings.assets])
  const next = nextAssetCategory(active, withAssets)
  const name = CATEGORY_LABEL[active]
  const all = useMemo(() => (settings.assets ?? []).filter((a) => a.category === active), [settings.assets, active])
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? all.filter((a) => a.name.toLowerCase().includes(q) || (a.altText ?? '').toLowerCase().includes(q)) : all
  }, [all, search])
  const slug = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</p>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{name}</p>
          {next && (
            <button type="button" onClick={() => { setChosen(next); setSearch('') }} className="text-[11px] text-brand-primary dark:text-brand-accent hover:underline">
              Browse {CATEGORY_LABEL[next]} instead
            </button>
          )}
        </div>
        {all.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No {name} in the media library yet. Add some in Settings → Asset Library, or paste a URL below.</p>
        ) : (
          <>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${name}…`}
              aria-label={`Search ${name}`}
              className={`${INPUT} mb-2 py-1.5 text-xs`}
            />
            {shown.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No {name} match your search.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {shown.map((asset) => {
                  const selected = url === asset.url
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      title={asset.name}
                      aria-pressed={selected}
                      onClick={() => onChange({ url: asset.url, alt: asset.altText || asset.name })}
                      className={`rounded-md overflow-hidden border-2 text-left ${selected ? 'border-brand-primary dark:border-brand-accent ring-2 ring-brand-primary/30' : 'border-gray-200 dark:border-gray-700 hover:border-brand-primary/50'}`}
                    >
                      <img src={asset.url} alt="" className="w-full object-cover bg-gray-50 dark:bg-gray-800" style={{ aspectRatio: '3/4' }} />
                      <span className="block px-1 py-1 text-[10px] truncate text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900">{asset.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <label htmlFor={`${slug}-url`} className={LABEL}>{label} URL</label>
        <input id={`${slug}-url`} className={INPUT} value={url} placeholder="https://…" onChange={(e) => onChange({ url: e.target.value })} />
      </div>
      <div>
        <label htmlFor={`${slug}-alt`} className={LABEL}>{label} alt text</label>
        <input id={`${slug}-alt`} className={INPUT} value={alt} placeholder="Describe the image for accessibility" onChange={(e) => onChange({ alt: e.target.value })} />
      </div>
    </div>
  )
}
