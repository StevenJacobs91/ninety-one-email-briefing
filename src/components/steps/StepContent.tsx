import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_MODULES, REGION_LEGAL_DISCLAIMERS, BRAND_THEMES, LOGO_VARIANTS } from '../../lib/constants'
import { useSettings } from '../../contexts/SettingsContext'
import { FieldText } from '../ui/FieldText'
import { FieldTextarea } from '../ui/FieldTextarea'
import { FieldToggle } from '../ui/FieldToggle'
import { RichTextarea } from '../ui/RichTextarea'
import { formatFileSize } from '../../lib/formatFileSize'
import { appendUtm } from '../../lib/utm'
import { SubSection } from '../ui/SubSection'

// ─── Logo Preview ──────────────────────────────────────────────────────────────
function LogoPreview({ variant }: { variant: string }) {
  return (
    <div className="flex items-center justify-center h-10 w-full rounded bg-brand-primary/10 dark:bg-brand-primary/20 border border-brand-primary/20">
      {variant === 'horizontal' && (
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded bg-brand-primary flex items-center justify-center">
            <span className="text-[7px] font-bold text-brand-accent">N1</span>
          </div>
          <div className="w-8 h-1.5 bg-brand-primary rounded-sm" />
        </div>
      )}
      {variant === 'stacked' && (
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-5 h-5 rounded bg-brand-primary flex items-center justify-center">
            <span className="text-[7px] font-bold text-brand-accent">N1</span>
          </div>
          <div className="w-8 h-1 bg-brand-primary rounded-sm" />
        </div>
      )}
      {variant === 'icon' && (
        <div className="w-6 h-6 rounded bg-brand-primary flex items-center justify-center">
          <span className="text-[9px] font-bold text-brand-accent">N1</span>
        </div>
      )}
    </div>
  )
}

// ─── Image Cropper ─────────────────────────────────────────────────────────────
const CROP_W = 640
const CROP_H = 270

interface ImageCropperProps {
  src: string
  onCrop: (dataUrl: string) => void
  onCancel: () => void
}

function ImageCropper({ src, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const coverScale = Math.max(CROP_W / img.naturalWidth, CROP_H / img.naturalHeight)
      const scaledW = img.naturalWidth * coverScale
      const scaledH = img.naturalHeight * coverScale
      setScale(coverScale)
      setOffsetX(-(scaledW - CROP_W) / 2)
      setOffsetY(-(scaledH - CROP_H) / 2)
      setLoaded(true)
    }
    img.src = src
  }, [src])

  useEffect(() => {
    if (!loaded || !imgRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = imgRef.current
    ctx.clearRect(0, 0, CROP_W, CROP_H)
    ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale)
  }, [loaded, scale, offsetX, offsetY])

  const clampOffsets = useCallback((ox: number, oy: number, s: number) => {
    const img = imgRef.current
    if (!img) return { ox, oy }
    const scaledW = img.naturalWidth * s
    const scaledH = img.naturalHeight * s
    return {
      ox: Math.min(0, Math.max(ox, CROP_W - scaledW)),
      oy: Math.min(0, Math.max(oy, CROP_H - scaledH)),
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY }
  }, [offsetX, offsetY])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const { ox, oy } = clampOffsets(dragStart.current.ox + dx, dragStart.current.oy + dy, scale)
    setOffsetX(ox)
    setOffsetY(oy)
  }, [clampOffsets, scale])

  const handleMouseUp = useCallback(() => { dragStart.current = null }, [])

  const handleScaleChange = useCallback((newScale: number) => {
    const { ox, oy } = clampOffsets(offsetX, offsetY, newScale)
    setScale(newScale)
    setOffsetX(ox)
    setOffsetY(oy)
  }, [clampOffsets, offsetX, offsetY])

  const handleCropAndUse = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCrop(canvas.toDataURL('image/jpeg', 0.92))
  }, [onCrop])

  const minScale = imgRef.current
    ? Math.max(CROP_W / imgRef.current.naturalWidth, CROP_H / imgRef.current.naturalHeight)
    : 0.1

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Crop Hero Image</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Drag to reposition · Output: 640 × 270 px</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none px-2"
          aria-label="Cancel crop"
        >
          &times;
        </button>
      </div>
      <div className="p-4">
        <div className="w-full overflow-hidden rounded border border-gray-300 dark:border-gray-600 mb-4" style={{ aspectRatio: `${CROP_W}/${CROP_H}` }}>
          {!loaded && (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading…</div>
          )}
          <canvas
            ref={canvasRef}
            width={CROP_W}
            height={CROP_H}
            className="block w-full cursor-move select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Zoom</label>
            <span className="text-xs text-gray-400 font-mono">{(scale * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={0.001}
            value={scale}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="w-full accent-brand-primary"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              const img = imgRef.current
              if (!img) return
              const s = Math.max(CROP_W / img.naturalWidth, CROP_H / img.naturalHeight)
              const ox = -(img.naturalWidth * s - CROP_W) / 2
              const oy = -(img.naturalHeight * s - CROP_H) / 2
              setScale(s); setOffsetX(ox); setOffsetY(oy)
            }}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCropAndUse}
            className="px-4 py-1.5 text-xs bg-brand-primary text-white font-medium rounded-md hover:bg-brand-primary-hover transition-colors"
          >
            Crop & Use (640 × 270)
          </button>
        </div>
      </div>
    </div>
  )
}


// Derive unique categories from module list
const ALL_CATEGORIES = Array.from(new Set(EMAIL_MODULES.map((m) => m.category)))

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Headers': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="5" rx="1"/>
      <rect x="3" y="10" width="18" height="3" rx="1" opacity="0.4"/>
      <rect x="3" y="15" width="12" height="3" rx="1" opacity="0.4"/>
    </svg>
  ),
  'Content': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="3" rx="1"/>
      <rect x="3" y="8" width="18" height="3" rx="1"/>
      <rect x="3" y="13" width="14" height="3" rx="1"/>
      <rect x="3" y="18" width="10" height="3" rx="1"/>
    </svg>
  ),
  'CTAs': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="8" rx="4"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  'Events': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="17" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  'Speakers': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="3"/>
      <circle cx="16" cy="8" r="3"/>
      <path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6"/>
    </svg>
  ),
  'Articles': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="8" height="8" rx="1"/>
      <rect x="13" y="3" width="8" height="3" rx="1"/>
      <rect x="13" y="8" width="8" height="3" rx="1"/>
      <rect x="3" y="13" width="18" height="3" rx="1"/>
      <rect x="3" y="18" width="14" height="3" rx="1"/>
    </svg>
  ),
  'Media': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <polygon points="10,9 10,15 15,12" fill="currentColor" stroke="none"/>
    </svg>
  ),
  'Navigation': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="10" width="18" height="4" rx="2"/>
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  'Footers': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="3" rx="1" opacity="0.4"/>
      <rect x="3" y="8" width="18" height="3" rx="1" opacity="0.4"/>
      <rect x="3" y="16" width="18" height="5" rx="1"/>
    </svg>
  ),
}

export function StepContent() {
  const { register, watch, control, formState: { errors }, setValue, getValues } = useFormContext<BriefFormData>()
  const { settings } = useSettings()

  // Default headline to campaign name if headline is empty
  const campaignName = watch('campaign.campaignName')
  useEffect(() => {
    const currentHeadline = getValues('content.headline')
    if (!currentHeadline && campaignName) {
      setValue('content.headline', campaignName)
    }
  }, [campaignName, getValues, setValue])

  // Pre-select default sign-off when none is chosen yet
  useEffect(() => {
    const currentId = getValues('content.footerSignoffId')
    const currentCustom = getValues('content.footerSignoff')
    if (!currentId && !currentCustom) {
      const defaultSignoff = (settings.signoffs ?? []).find((s) => s.isDefault) ?? (settings.signoffs ?? [])[0]
      if (defaultSignoff) {
        setValue('content.footerSignoffId', defaultSignoff.id, { shouldValidate: false })
      }
    }
  }, [settings.signoffs, getValues, setValue])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'content.sections',
  })

  const headline = watch('content.headline') ?? ''
  const subHeadline = watch('content.subHeadline') ?? ''
  const bodyIntro = watch('content.bodyIntro') ?? ''
  const ctaLabel = watch('content.cta.label') ?? ''
  const selectedModules = watch('content.modules') ?? []
  const moduleNotes = watch('content.moduleNotes') ?? {}
  const selectedRegions = watch('audience.region') ?? []
  const legalDisclaimer = watch('content.legalDisclaimer') ?? ''
  const footerSignoffId = watch('content.footerSignoffId') ?? ''
  const selectedTheme = watch('campaign.theme')
  const accentColour = useMemo(() => {
    const theme = BRAND_THEMES.find((t) => t.id === selectedTheme)
    return theme?.accent ?? '#fbaa96'
  }, [selectedTheme])

  // Derive region default disclaimer for helper text
  const regionDefaultDisclaimer = useMemo(() => {
    if (selectedRegions.length === 0) return null
    // Use the first matched region that has a disclaimer
    for (const region of selectedRegions) {
      if (REGION_LEGAL_DISCLAIMERS[region]) return REGION_LEGAL_DISCLAIMERS[region]
    }
    return null
  }, [selectedRegions])

  // Module category filter
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const filteredModules = useMemo(
    () => activeCategory ? EMAIL_MODULES.filter((m) => m.category === activeCategory) : EMAIL_MODULES,
    [activeCategory]
  )

  // Collapsed section state — new sections start expanded
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleModule(moduleId: string) {
    const next = selectedModules.includes(moduleId)
      ? selectedModules.filter((m) => m !== moduleId)
      : [...selectedModules, moduleId]
    setValue('content.modules', next, { shouldValidate: true })
  }

  function moveModuleUp(index: number) {
    if (index === 0) return
    const next = [...selectedModules]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setValue('content.modules', next, { shouldValidate: true })
  }

  function moveModuleDown(index: number) {
    if (index === selectedModules.length - 1) return
    const next = [...selectedModules]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setValue('content.modules', next, { shouldValidate: true })
  }

  function setModuleNote(moduleId: string, note: string) {
    const current = getValues('content.moduleNotes') ?? {}
    setValue('content.moduleNotes', { ...current, [moduleId]: note }, { shouldValidate: false })
  }

  // ── Assets fields ──
  const { fields: assetUrlFields, append: appendAssetUrl, remove: removeAssetUrl } = useFieldArray({
    control,
    name: 'assets.additionalAssetUrls' as never,
  })

  const heroImageUrl = watch('assets.heroImageUrl') ?? ''
  const stripeColour = watch('assets.stripeColour') ?? ''
  const attachments = watch('assets.attachments') ?? []

  const [isDragging, setIsDragging] = useState(false)
  const [heroImageMode, setHeroImageMode] = useState<'url' | 'upload'>('url')
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [headerSearch, setHeaderSearch] = useState('')
  const heroFileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((fileList: FileList) => {
    const current = getValues('assets.attachments') ?? []
    const newAttachments = Array.from(fileList).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    setValue('assets.attachments', [...current, ...newAttachments].slice(0, 10), { shouldValidate: true })
  }, [getValues, setValue])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const removeAttachment = useCallback((index: number) => {
    const current = getValues('assets.attachments') ?? []
    setValue('assets.attachments', current.filter((_, i) => i !== index), { shouldValidate: true })
  }, [getValues, setValue])

  const handleHeroFileSelected = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => { setCropSrc(e.target?.result as string) }
    reader.readAsDataURL(file)
  }, [])

  const handleCropComplete = useCallback((croppedDataUrl: string) => {
    setHeroImagePreview(croppedDataUrl)
    setCropSrc(null)
    setValue('assets.heroImageUrl', croppedDataUrl, { shouldValidate: true })
  }, [setValue])

  const handleCropCancel = useCallback(() => {
    setCropSrc(null)
    if (heroFileInputRef.current) heroFileInputRef.current.value = ''
  }, [])

  return (
    <div>
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-8">Content</h2>

      <SubSection title="Assets">
        {/* Logo variant + Stripe colour — two column */}
        <div className="grid grid-cols-2 gap-6">
          {/* Logo Variant */}
          <div>
            <p id="logo-variant-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Logo Variant<span className="text-red-500 ml-0.5">*</span>
            </p>
            <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="logo-variant-label">
              {LOGO_VARIANTS.map((variant) => {
                const selected = watch('assets.logoVariant') === variant
                return (
                  <label
                    key={variant}
                    className={`flex flex-col gap-1.5 p-2 rounded-md border cursor-pointer transition-colors ${
                      selected
                        ? 'bg-brand-primary/5 dark:bg-brand-primary/10 border-brand-primary dark:border-brand-accent ring-1 ring-brand-primary dark:ring-brand-accent'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <input type="radio" {...register('assets.logoVariant')} value={variant} className="sr-only" />
                    <LogoPreview variant={variant} />
                    <span className="text-xs font-medium text-center text-gray-700 dark:text-gray-300 capitalize">{variant}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Stripe Colour */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Stripe / Accent Colour
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={stripeColour || '#fbaa96'}
                onChange={(e) => setValue('assets.stripeColour', e.target.value, { shouldValidate: true })}
                className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800"
                title="Pick stripe colour"
              />
              <input
                {...register('assets.stripeColour')}
                placeholder="e.g. #fbaa96"
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                onChange={(e) => {
                  const val = e.target.value
                  register('assets.stripeColour').onChange(e)
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) setValue('assets.stripeColour', val)
                }}
              />
            </div>
            {stripeColour && /^#[0-9A-Fa-f]{6}$/.test(stripeColour) && (
              <div
                className="h-5 rounded border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: stripeColour }}
                title={`Preview: ${stripeColour}`}
              />
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Overrides the selected theme's default accent colour.
            </p>
          </div>
        </div>

        {/* Hero Image */}
        <div>
          <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hero Image</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Recommended: 640 × 270 px. Select from the library, upload and crop in-browser, or paste a CDN URL.
          </p>

          {/* Header Library */}
          {(() => {
            const allHeaders = (settings.assets ?? []).filter((a) => a.category === 'header')
            if (allHeaders.length === 0) return null

            // Theme-colour filter: match colourOverlay to selected theme's primary
            const selectedThemeId = watch('campaign.theme') as string
            const selectedTheme = (settings.brandThemes ?? []).find((t) => t.id === selectedThemeId)
              ?? BRAND_THEMES.find((t) => t.id === selectedThemeId)
            const themePrimary = selectedTheme?.primary?.toLowerCase() ?? ''

            const themeHeaders = themePrimary
              ? allHeaders.filter((a) => !a.colourOverlay || a.colourOverlay.toLowerCase() === themePrimary)
              : allHeaders
            const showingAll = themeHeaders.length === 0
            const baseHeaders = showingAll ? allHeaders : themeHeaders

            // Search filter
            const searchQ = headerSearch.trim().toLowerCase()
            const headers = searchQ
              ? baseHeaders.filter((a) => a.name.toLowerCase().includes(searchQ) || (a.altText ?? '').toLowerCase().includes(searchQ))
              : baseHeaders

            return (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Header Library
                  </p>
                  {showingAll && themePrimary && (
                    <span className="text-[10px] text-amber-500 dark:text-amber-400">
                      No headers for this theme — showing all
                    </span>
                  )}
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    placeholder="Search headers…"
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                  />
                  {headerSearch && (
                    <button type="button" onClick={() => setHeaderSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>

                {headers.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No headers match your search.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {headers.map((asset) => {
                      const isSelected = heroImageUrl === asset.url
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => {
                            setValue('assets.heroImageUrl', asset.url, { shouldValidate: true })
                            setValue('assets.heroImageAlt', asset.altText || asset.name, { shouldValidate: true })
                            setHeroImageMode('url')
                            setHeroImagePreview(null)
                          }}
                          className={`relative group rounded-lg overflow-hidden border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                            isSelected
                              ? 'border-brand-primary dark:border-brand-accent ring-2 ring-brand-primary dark:ring-brand-accent'
                              : 'border-gray-200 dark:border-gray-700 hover:border-brand-primary/50 dark:hover:border-brand-accent/50'
                          }`}
                          title={asset.name}
                        >
                          <div style={{ aspectRatio: '640/270' }} className="relative">
                            <img
                              src={asset.url}
                              alt={asset.altText || asset.name}
                              className="w-full h-full object-cover"
                            />
                            {asset.colourOverlay && (
                              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                                <span className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0" style={{ backgroundColor: asset.colourOverlay }} />
                                <span className="text-[9px] text-white font-mono leading-none">{asset.colourOverlay}</span>
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute inset-0 bg-brand-primary/20 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center shadow-lg">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className={`px-2 py-1.5 ${isSelected ? 'bg-brand-primary/5 dark:bg-brand-primary/10' : 'bg-white dark:bg-gray-900'}`}>
                            <p className={`text-xs font-medium truncate ${isSelected ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-700 dark:text-gray-300'}`}>
                              {asset.name}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {heroImageUrl && allHeaders.some((h) => h.url === heroImageUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue('assets.heroImageUrl', '', { shouldValidate: true })
                      setValue('assets.heroImageAlt', '', { shouldValidate: true })
                    }}
                    className="mt-2 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Clear selection
                  </button>
                )}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
                  <div className="relative flex justify-center"><span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400 dark:text-gray-500">or add manually</span></div>
                </div>
              </div>
            )
          })()}

          {/* Mode toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 mb-4 w-fit">
            {(['url', 'upload'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setHeroImageMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  heroImageMode === mode
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {mode === 'url' ? 'URL' : 'Upload & Crop'}
              </button>
            ))}
          </div>

          {heroImageMode === 'url' ? (
            <FieldText
              label="Hero Image URL"
              registration={register('assets.heroImageUrl')}
              error={errors.assets?.heroImageUrl as never}
              placeholder="https://cdn.example.com/hero.jpg"
              validateUrl
            />
          ) : (
            <div className="mb-4">
              {cropSrc && (
                <ImageCropper
                  src={cropSrc}
                  onCrop={handleCropComplete}
                  onCancel={handleCropCancel}
                />
              )}

              {!cropSrc && heroImagePreview && (
                <div className="relative mb-2">
                  <img
                    src={heroImagePreview}
                    alt="Hero image preview"
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700"
                    style={{ aspectRatio: '640/270', objectFit: 'cover' }}
                  />
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                    640 × 270 px
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHeroImagePreview(null)
                      setValue('assets.heroImageUrl', '', { shouldValidate: true })
                      if (heroFileInputRef.current) heroFileInputRef.current.value = ''
                    }}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
                    title="Remove hero image"
                    aria-label="Remove hero image"
                  >
                    &times;
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (heroImagePreview) setCropSrc(heroImagePreview) }}
                    className="absolute bottom-2 right-2 text-xs bg-white/90 text-gray-700 px-2 py-1 rounded hover:bg-white transition-colors border border-gray-300"
                  >
                    Re-crop
                  </button>
                </div>
              )}

              {!cropSrc && !heroImagePreview && (
                <label className="relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center cursor-pointer border-gray-300 dark:border-gray-600 hover:border-brand-primary dark:hover:border-brand-accent transition-colors bg-gray-50 dark:bg-gray-800/50">
                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleHeroFileSelected(file)
                    }}
                    className="sr-only"
                  />
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Click to upload hero image</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, WebP — will be cropped to 640 × 270 px</p>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Hero image alt text */}
        <FieldText
          label="Hero Image Alt Text"
          registration={register('assets.heroImageAlt')}
          error={errors.assets?.heroImageAlt as never}
          required={!!heroImageUrl}
          placeholder={heroImageUrl ? 'Required — describe the image for accessibility' : 'Required once a hero image is set'}
        />
      </SubSection>

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      <FieldText
        label="Headline"
        registration={register('content.headline')}
        error={errors.content?.headline}
        required
        placeholder="Max 80 characters"
        maxLength={80}
        currentLength={headline.length}
      />

      <FieldText
        label="Sub-headline"
        registration={register('content.subHeadline')}
        error={errors.content?.subHeadline}
        placeholder="Max 80 characters — maps to header subheading in email template"
        maxLength={80}
        currentLength={subHeadline.length}
      />

      <RichTextarea
        label="Body Intro"
        value={bodyIntro}
        onChange={(html) => setValue('content.bodyIntro', html, { shouldValidate: true })}
        maxLength={1000}
        required
        error={errors.content?.bodyIntro}
        placeholder="Max 1000 characters — use the toolbar to bold, italicise, underline, or add links"
        rows={6}
        accentColour={accentColour}
      />

      {/* Email Modules */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Modules
          </label>
          {selectedModules.length > 0 && (
            <span className="text-xs text-brand-primary dark:text-brand-accent font-medium">
              {selectedModules.length} selected
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Select the template modules to include in your email.
        </p>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === null
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            All ({EMAIL_MODULES.length})
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const count = EMAIL_MODULES.filter((m) => m.category === cat).length
            const selectedInCat = EMAIL_MODULES.filter((m) => m.category === cat && selectedModules.includes(m.id)).length
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                {cat} ({count}){selectedInCat > 0 && <span className="ml-1 opacity-75">·{selectedInCat}</span>}
              </button>
            )
          })}
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-72 overflow-y-auto">
          {filteredModules.map((mod) => {
            const isSelected = selectedModules.includes(mod.id)
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => toggleModule(mod.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors ${
                  isSelected ? 'bg-brand-primary/5 dark:bg-brand-primary/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 text-xs ${
                    isSelected
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isSelected ? '\u2713' : ''}
                </span>
                <span className={`mt-0.5 shrink-0 ${isSelected ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-400 dark:text-gray-500'}`}>
                  {CATEGORY_ICONS[mod.category]}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{mod.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{mod.description}</p>
                </div>
              </button>
            )
          })}
          {filteredModules.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No modules in this category.</p>
          )}
        </div>

        {/* Selected modules editable cards */}
        {selectedModules.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Selected Modules ({selectedModules.length})
            </p>
            <div className="space-y-2">
              {selectedModules.map((modId, index) => {
                const mod = EMAIL_MODULES.find((m) => m.id === modId)
                if (!mod) return null
                const note = moduleNotes[modId] ?? ''
                return (
                  <div
                    key={modId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 dark:text-gray-500 shrink-0">
                          {CATEGORY_ICONS[mod.category]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{mod.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{mod.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => moveModuleUp(index)}
                          disabled={index === 0}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                          title="Move up"
                          aria-label="Move module up"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 15l-6-6-6 6"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveModuleDown(index)}
                          disabled={index === selectedModules.length - 1}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                          title="Move down"
                          aria-label="Move module down"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleModule(modId)}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove module"
                          aria-label={`Remove ${mod.label}`}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <textarea
                        value={note}
                        onChange={(e) => setModuleNote(modId, e.target.value)}
                        placeholder="Notes / instructions for this module (optional)"
                        rows={2}
                        className="w-full text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/30 focus:border-brand-primary resize-none placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic sections */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sections<span className="text-red-500 ml-0.5">*</span>
          </label>
          {fields.length < 4 && (
            <button
              type="button"
              onClick={() =>
                append({
                  id: uuidv4(),
                  heading: '',
                  body: '',
                  imageRequired: false,
                  imageDescription: '',
                })
              }
              className="text-xs font-medium text-brand-primary dark:text-brand-accent hover:text-brand-primary-hover px-2 py-1 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors"
            >
              + Add Section
            </button>
          )}
        </div>

        {errors.content?.sections?.message && (
          <p className="text-xs text-red-600 mb-2">{errors.content.sections.message}</p>
        )}

        {fields.map((field, index) => {
          const sectionBody = watch(`content.sections.${index}.body`) ?? ''
          const sectionHeading = watch(`content.sections.${index}.heading`) ?? ''
          const isCollapsed = collapsedSections.has(field.id)

          return (
            <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3 overflow-hidden">
              {/* Section header — click to collapse */}
              <div
                className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 cursor-pointer select-none"
                onClick={() => toggleSection(field.id)}
                role="button"
                aria-expanded={!isCollapsed}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleSection(field.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">Section {index + 1}</span>
                  {isCollapsed && sectionHeading && (
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{sectionHeading}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); remove(index) }}
                      className="text-gray-400 hover:text-red-500 text-base leading-none px-1"
                      title="Remove section"
                      aria-label={`Remove section ${index + 1}`}
                    >
                      &times;
                    </button>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {!isCollapsed && (
                <div className="p-4">
                  <FieldText
                    label="Heading"
                    registration={register(`content.sections.${index}.heading`)}
                    error={errors.content?.sections?.[index]?.heading}
                    required
                    maxLength={60}
                    currentLength={sectionHeading.length}
                  />

                  <FieldTextarea
                    label="Body"
                    registration={register(`content.sections.${index}.body`)}
                    error={errors.content?.sections?.[index]?.body}
                    required
                    maxLength={500}
                    currentLength={sectionBody.length}
                    rows={3}
                  />

                  <FieldToggle
                    label="Image required for this section"
                    registration={register(`content.sections.${index}.imageRequired`)}
                  />

                  <FieldText
                    label="Image Description / Alt Text"
                    registration={register(`content.sections.${index}.imageDescription`)}
                    placeholder="Art direction hint or alt text"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Call to Action</p>

        <FieldText
          label="Button Label"
          registration={register('content.cta.label')}
          error={errors.content?.cta?.label}
          required
          placeholder="Max 30 characters"
          maxLength={30}
          currentLength={ctaLabel.length}
        />

        <FieldText
          label="URL"
          registration={register('content.cta.url')}
          error={errors.content?.cta?.url}
          required
          placeholder="https://..."
          validateUrl
        />
        {watch('content.cta.url') && campaignName && (
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2 mb-4">
            <span className="font-medium">With UTM:</span>{' '}
            <span className="font-mono break-all">{appendUtm(watch('content.cta.url') ?? '', campaignName)}</span>
          </p>
        )}

        <FieldToggle
          label="Open in new tab"
          registration={register('content.cta.openInNewTab')}
        />
      </div>

      <div className="mb-4">
        <FieldTextarea
          label="Legal Disclaimer"
          registration={register('content.legalDisclaimer')}
          placeholder={regionDefaultDisclaimer ? 'Leave blank to use region default, or enter a custom disclaimer' : 'Optional — overrides region default'}
          rows={2}
        />
        {regionDefaultDisclaimer && !legalDisclaimer && (
          <div className="mt-1 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Region default ({selectedRegions[0]}):
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{regionDefaultDisclaimer}</p>
            <button
              type="button"
              onClick={() => setValue('content.legalDisclaimer', regionDefaultDisclaimer)}
              className="mt-2 text-xs text-brand-primary dark:text-brand-accent font-medium hover:underline"
            >
              Use this disclaimer →
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <FieldToggle
          label="Include unsubscribe link"
          registration={register('content.includeUnsubscribe')}
          description="Required for marketing sends"
        />
        {!watch('content.includeUnsubscribe') && (
          <div className="ml-7 -mt-2 mb-2 flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
            <span className="text-red-500 text-sm font-bold shrink-0">!</span>
            <p className="text-xs text-red-700 dark:text-red-400">
              Removing the unsubscribe link violates CAN-SPAM, GDPR, and POPIA regulations. Marketing emails <strong>must</strong> include an unsubscribe link. Only disable this for transactional emails.
            </p>
          </div>
        )}
      </div>

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Footer Sign-off */}
      <SubSection title="Footer Sign-off">
        {(settings.signoffs ?? []).length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            No sign-off signatures configured. Add signatures in <strong>Settings → Signatures</strong>.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select a sign-off signature for the email footer, or write a custom one below.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {(settings.signoffs ?? []).map((s) => {
                const isSelected = footerSignoffId === s.id
                return (
                  <label
                    key={s.id}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-md cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-brand-primary/10 dark:bg-brand-primary/20 border-brand-primary/40 dark:border-brand-accent/40'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => {
                        setValue('content.footerSignoffId', s.id, { shouldValidate: false })
                        setValue('content.footerSignoff', '', { shouldValidate: false })
                      }}
                      className="sr-only"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.name}</p>
                        {s.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-primary/10 dark:bg-brand-primary/30 text-brand-primary dark:text-brand-accent font-medium">Default</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap line-clamp-2 font-ni-body">{s.text}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Custom sign-off <span className="text-gray-400 font-normal">(overrides selected signature)</span>
              </p>
              <textarea
                {...register('content.footerSignoff')}
                rows={3}
                placeholder={'e.g. Kind regards,\n\nNatalie Phillips\nDeputy MD, Ninety One'}
                onChange={(e) => {
                  setValue('content.footerSignoff', e.target.value, { shouldValidate: false })
                  if (e.target.value) {
                    setValue('content.footerSignoffId', '', { shouldValidate: false })
                  }
                }}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm font-ni-body focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-y"
              />
            </div>
          </div>
        )}
      </SubSection>

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      <SubSection title="Additional Assets">
        {/* Additional Asset URLs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Asset URLs</label>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{assetUrlFields.length} / 4</span>
            </div>
            {assetUrlFields.length < 4 && (
              <button
                type="button"
                onClick={() => appendAssetUrl('' as never)}
                className="text-xs font-medium text-brand-primary dark:text-brand-accent px-2 py-1 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors"
              >
                + Add URL
              </button>
            )}
          </div>
          {assetUrlFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2">
              <input
                {...register(`assets.additionalAssetUrls.${index}` as const)}
                placeholder="https://..."
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
              <button type="button" onClick={() => removeAssetUrl(index)} className="text-gray-400 hover:text-red-500 px-2" title="Remove" aria-label={`Remove URL ${index + 1}`}>
                &times;
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-400 dark:text-gray-500">Max 4 additional assets. Paste CDN or SharePoint URLs.</p>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Attachments
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-brand-primary bg-brand-primary/5 dark:border-brand-accent dark:bg-brand-accent/5'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">or click to browse · Images, PDFs, documents — max 10 files</p>
          </div>

          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((att, index) => (
                <div
                  key={`${att.name}-${index}`}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-400 text-sm shrink-0">{att.type.startsWith('image/') ? '🖼' : '📎'}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{att.name}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-red-500 text-sm px-2 shrink-0"
                    title="Remove"
                    aria-label={`Remove ${att.name}`}
                  >
                    &times;
                  </button>
                </div>
              ))}
              <p className="text-xs text-gray-400">{attachments.length} file{attachments.length !== 1 ? 's' : ''} attached</p>
            </div>
          )}
        </div>
      </SubSection>
    </div>
  )
}
