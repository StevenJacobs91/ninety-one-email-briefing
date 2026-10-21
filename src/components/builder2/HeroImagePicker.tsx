import { useCallback, useMemo, useRef, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { ImageCropper } from './ImageCropper'

interface Props {
  url: string
  alt: string
  themeId: string
  headline: string
  subHeadline: string
  onChange: (patch: { url?: string; alt?: string }) => void
}

const INPUT = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary'
const LABEL = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1'

// The background image for header types that need one: pick from the header
// library, paste a URL, or upload and crop to 640 x 270.
export function HeroImagePicker({ url, alt, themeId, headline, subHeadline, onChange }: Props) {
  const { settings } = useSettings()
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const theme = (settings.brandThemes ?? []).find((t) => t.id === themeId)
  const allHeaders = useMemo(() => (settings.assets ?? []).filter((a) => a.category === 'header'), [settings.assets])
  const library = useMemo(() => {
    const primary = theme?.primary?.toLowerCase() ?? ''
    const forTheme = primary ? allHeaders.filter((a) => !a.colourOverlay || a.colourOverlay.toLowerCase() === primary) : allHeaders
    const base = forTheme.length === 0 ? allHeaders : forTheme
    const q = search.trim().toLowerCase()
    return q ? base.filter((a) => a.name.toLowerCase().includes(q) || (a.altText ?? '').toLowerCase().includes(q)) : base
  }, [allHeaders, theme?.primary, search])

  const readFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setCropSrc(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const shownUrl = preview ?? url
  const fromLibrary = allHeaders.some((h) => h.url === url)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Background image</p>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">Recommended 640 × 270 px.</p>

      {allHeaders.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Header library</p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search headers…"
            aria-label="Search the header library"
            className={`${INPUT} mb-2 py-1.5 text-xs`}
          />
          {library.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">No headers match your search.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {library.map((asset) => {
                const selected = url === asset.url
                return (
                  <button
                    key={asset.id}
                    type="button"
                    title={asset.name}
                    onClick={() => { onChange({ url: asset.url, alt: asset.altText || asset.name }); setPreview(null); setMode('url') }}
                    className={`relative rounded-md overflow-hidden border-2 text-left ${selected ? 'border-brand-primary dark:border-brand-accent ring-2 ring-brand-primary/30' : 'border-gray-200 dark:border-gray-700 hover:border-brand-primary/50'}`}
                  >
                    <img src={asset.url} alt={asset.altText || asset.name} className="w-full object-cover" style={{ aspectRatio: '640/270' }} />
                    <p className="px-1.5 py-1 text-[10px] truncate text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900">{asset.name}</p>
                  </button>
                )
              })}
            </div>
          )}
          {url && fromLibrary && (
            <button type="button" onClick={() => onChange({ url: '', alt: '' })} className="mt-1.5 text-xs text-gray-400 hover:text-red-500">
              Clear selection
            </button>
          )}
          <p className="text-center text-[10px] text-gray-400 my-2">or add manually</p>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 w-fit">
        {(['url', 'upload'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded ${mode === m ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {m === 'url' ? 'URL' : 'Upload & Crop'}
          </button>
        ))}
      </div>

      {mode === 'url' ? (
        <div>
          <label htmlFor="hero-url" className={LABEL}>Image URL</label>
          <input
            id="hero-url"
            className={INPUT}
            value={url.startsWith('data:') ? '' : url}
            placeholder="https://cdn.example.com/hero.jpg"
            onChange={(e) => { setPreview(null); onChange({ url: e.target.value }) }}
          />
          {url.startsWith('data:') && <p className="text-[10px] text-gray-400 mt-1">An uploaded image is in use. Paste a URL to replace it.</p>}
        </div>
      ) : (
        <div>
          {cropSrc && (
            <ImageCropper
              src={cropSrc}
              onCrop={(dataUrl) => { setPreview(dataUrl); setCropSrc(null); onChange({ url: dataUrl }) }}
              onCancel={() => { setCropSrc(null); if (fileInput.current) fileInput.current.value = '' }}
              overlay={{ logoUrl: theme?.logoUrl, stripeUrl: theme?.stripeUrl, accent: theme?.accent ?? '#fbaa96', headline, subHeadline }}
            />
          )}

          {!cropSrc && shownUrl && (
            <div className="relative mb-2">
              <img src={shownUrl} alt="Background image preview" className="w-full rounded-md border border-gray-200 dark:border-gray-700" style={{ aspectRatio: '640/270', objectFit: 'cover' }} />
              <button
                type="button"
                aria-label="Remove background image"
                onClick={() => { setPreview(null); onChange({ url: '' }); if (fileInput.current) fileInput.current.value = '' }}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
              >
                &times;
              </button>
              <button type="button" onClick={() => setCropSrc(shownUrl)} className="absolute bottom-2 right-2 text-xs bg-white/90 text-gray-700 px-2 py-1 rounded border border-gray-300 hover:bg-white">
                Re-crop
              </button>
            </div>
          )}

          {!cropSrc && !shownUrl && (
            <div
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center ${dragging ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file && file.type.startsWith('image/')) readFile(file)
              }}
            >
              <input
                ref={fileInput}
                id="hero-file-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f) }}
              />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {dragging ? 'Drop to upload' : <>Drag &amp; drop or <label htmlFor="hero-file-input" className="text-brand-primary dark:text-brand-accent cursor-pointer hover:underline">browse</label></>}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — cropped to 640 × 270 px</p>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="hero-alt" className={LABEL}>Image alt text</label>
        <input
          id="hero-alt"
          className={INPUT}
          value={alt}
          placeholder={'Describe the image for accessibility'}
          onChange={(e) => onChange({ alt: e.target.value })}
        />
      </div>
    </div>
  )
}
