import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import type { BriefFormData } from '../../lib/schema'
import { REGION_LEGAL_DISCLAIMERS, BRAND_THEMES, LOGO_VARIANTS } from '../../lib/constants'
import { ContentEditorShell } from '../content-editor/ContentEditorShell'
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
  /** Theme overlay data — shows logo, stripes, headline, sub-headline over the crop canvas */
  overlay?: {
    logoUrl?: string
    stripeUrl?: string
    accent: string
    headline: string
    subHeadline: string
  }
}

function ImageCropper({ src, onCrop, onCancel, overlay }: ImageCropperProps) {
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
        <div className="relative w-full overflow-hidden rounded border border-gray-300 dark:border-gray-600 mb-4" style={{ aspectRatio: `${CROP_W}/${CROP_H}` }}>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 bg-gray-100 dark:bg-gray-800 z-10">Loading…</div>
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
          {/* Template overlay — mirrors email header layout at 640×270 */}
          {overlay && loaded && (
            <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.72 }}>
              {/* Left column: 64% width — logo + text */}
              <div className="absolute" style={{ left: '6.25%', top: 0, width: '62%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '11.1% 0' }}>
                {/* Logo */}
                {overlay.logoUrl && (
                  <img
                    src={overlay.logoUrl}
                    alt="Logo"
                    style={{ width: '18.75%', maxWidth: 120, height: 'auto', display: 'block', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}
                  />
                )}
                {/* Headline + sub-headline */}
                <div style={{ marginTop: 'auto' }}>
                  {overlay.headline && (
                    <p style={{
                      fontFamily: 'arial, helvetica, sans-serif',
                      fontSize: 'clamp(14px, 3.5vw, 28px)',
                      lineHeight: 1.1,
                      fontWeight: 'normal',
                      color: overlay.accent,
                      margin: '0 0 4px',
                      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {overlay.headline}
                    </p>
                  )}
                  {overlay.subHeadline && (
                    <p style={{
                      fontFamily: 'arial, helvetica, sans-serif',
                      fontSize: 'clamp(10px, 1.8vw, 14px)',
                      lineHeight: 1.3,
                      fontWeight: 'normal',
                      color: '#e8e5ce',
                      margin: 0,
                      textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {overlay.subHeadline}
                    </p>
                  )}
                </div>
              </div>
              {/* Right column: stripe — 36% width, flush right, top-aligned */}
              {overlay.stripeUrl && (
                <div className="absolute" style={{ right: 0, top: 0, width: '31.25%', height: '86.7%', overflow: 'hidden' }}>
                  <img
                    src={overlay.stripeUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left top', display: 'block' }}
                  />
                </div>
              )}
            </div>
          )}
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
  const greetingId = watch('content.greetingId') ?? ''
  const bodyIntro = watch('content.bodyIntro') ?? ''
  const ctaLabel = watch('content.cta.label') ?? ''
  const selectedRegions = watch('audience.region') ?? []
  const legalDisclaimer = watch('content.legalDisclaimer') ?? ''
  const footerSignoffId = watch('content.footerSignoffId') ?? ''
  const selectedTheme = watch('campaign.theme')
  const campaignSubjectLine = watch('campaign.subjectLine') ?? ''
  const accentColour = useMemo(() => {
    const theme = BRAND_THEMES.find((t) => t.id === selectedTheme)
    return theme?.accent ?? '#fbaa96'
  }, [selectedTheme])
  const themeAssets = useMemo(() => {
    const t = (settings.brandThemes ?? []).find((t) => t.id === selectedTheme)
    return { logoUrl: t?.logoUrl, stripeUrl: t?.stripeUrl }
  }, [selectedTheme, settings.brandThemes])

  // Derive region default disclaimer for helper text
  const regionDefaultDisclaimer = useMemo(() => {
    if (selectedRegions.length === 0) return null
    // Use the first matched region that has a disclaimer
    for (const region of selectedRegions) {
      if (REGION_LEGAL_DISCLAIMERS[region]) return REGION_LEGAL_DISCLAIMERS[region]
    }
    return null
  }, [selectedRegions])

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

  // ── Assets fields ──
  const { fields: assetUrlFields, append: appendAssetUrl, remove: removeAssetUrl } = useFieldArray({
    control,
    name: 'assets.additionalAssetUrls' as never,
  })

  const heroImageUrl = watch('assets.heroImageUrl') ?? ''
  const attachments = watch('assets.attachments') ?? []

  const [isDragging, setIsDragging] = useState(false)
  const [heroImageMode, setHeroImageMode] = useState<'url' | 'upload'>('url')
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [headerSearch, setHeaderSearch] = useState('')
  const [heroIsDragging, setHeroIsDragging] = useState(false)
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

      <SubSection title="Header type">
        {/* Header type selector */}
        {(() => {
          const currentTheme = watch('campaign.theme') ?? ''
          const allHeaderTypes = (settings.headers ?? [])
            .filter((h) => h.enabled)
            .filter((h) => {
              const ids = h.themeIds ?? []
              return ids.length === 0 || ids.includes(currentTheme)
            })
          const selectedHeaderType = watch('assets.headerType') ?? 'standard'
          const activeType = allHeaderTypes.find((h) => h.id === selectedHeaderType) ?? allHeaderTypes[0]
          const requiresHeroImage = activeType?.requiresHeroImage ?? false

          return (
            <>
              {allHeaderTypes.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  No header types configured. Add types in <strong>Settings → Design Elements → Headers</strong>.
                </p>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Choose the header layout for this email. Configure header types and paste HTML snippets in <strong>Settings → Headers</strong>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allHeaderTypes.map((ht) => {
                      const isSelected = selectedHeaderType === ht.id ||
                        (!selectedHeaderType && ht.isDefault)
                      return (
                        <button
                          key={ht.id}
                          type="button"
                          onClick={() => setValue('assets.headerType', ht.id, { shouldValidate: true })}
                          className={`text-left rounded-xl border-2 p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                            isSelected
                              ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-primary/10 ring-1 ring-brand-primary dark:ring-brand-accent'
                              : 'border-gray-200 dark:border-gray-700 hover:border-brand-primary/40 dark:hover:border-brand-accent/40 bg-white dark:bg-gray-800'
                          }`}
                        >
                          {/* Mini header preview */}
                          <div
                            className="w-full rounded overflow-hidden mb-2 relative"
                            style={{
                              height: ht.id.startsWith('slim') ? 32 : 48,
                              background: ht.requiresHeroImage
                                ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 60%, #4a5568 100%)'
                                : 'var(--brand-primary, #134848)',
                            }}
                          >
                            {ht.requiresHeroImage && (
                              <div className="absolute inset-0 opacity-20"
                                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,.06) 4px, rgba(255,255,255,.06) 8px)' }}
                              />
                            )}
                            {/* Logo area */}
                            <div className="absolute left-2 top-1.5 flex items-center gap-1">
                              <div className="w-3.5 h-2.5 bg-white/70 rounded-sm" />
                              {ht.id.includes('35yr') && (
                                <div className="w-3.5 h-2.5 rounded-sm flex items-center justify-center" style={{ background: '#fcaa28' }}>
                                  <span className="text-[4px] font-bold text-white leading-none">35</span>
                                </div>
                              )}
                            </div>
                            {/* Headline/sub-headline */}
                            <div className="absolute left-2 bottom-1.5 space-y-0.5">
                              <div className="h-1 rounded-sm w-10" style={{ background: 'var(--brand-accent, #fbaa96)', opacity: 0.9 }} />
                              <div className="h-0.5 w-7 bg-white/30 rounded-sm" />
                            </div>
                            {/* Stripes */}
                            <div className="absolute right-0 top-0 bottom-0 w-[28%] flex gap-px">
                              {[0.5, 0.8, 1.0, 0.6].map((op, i) => (
                                <div key={i} className="flex-1" style={{ background: `rgba(251,170,150,${op})` }} />
                              ))}
                            </div>
                          </div>

                          <p className={`text-xs font-semibold leading-tight mb-0.5 ${isSelected ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-800 dark:text-gray-200'}`}>
                            {ht.label}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight line-clamp-2">
                            {ht.description}
                          </p>
                          {ht.requiresHeroImage && (
                            <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                              Hero image required
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Logo variant */}
              <div className="mt-5">
                <p id="logo-variant-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Logo Variant<span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                </p>
                <div className="flex gap-3" role="radiogroup" aria-labelledby="logo-variant-label">
                  {LOGO_VARIANTS.map((variant) => {
                    const selected = watch('assets.logoVariant') === variant
                    return (
                      <label
                        key={variant}
                        className={`flex flex-col gap-1.5 p-2 rounded-md border cursor-pointer transition-colors w-24 ${
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

              {/* Hero Image — only shown when selected header type requires it */}
              {requiresHeroImage && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hero Image</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wider">Required for this header</span>
                  </div>
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
                  <div className="overflow-y-auto max-h-[488px] pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
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
                  overlay={{
                    logoUrl: themeAssets.logoUrl,
                    stripeUrl: themeAssets.stripeUrl,
                    accent: accentColour,
                    headline,
                    subHeadline: campaignSubjectLine || subHeadline,
                  }}
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
                <div
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    heroIsDragging
                      ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/5'
                      : 'border-gray-300 dark:border-gray-600 hover:border-brand-primary dark:hover:border-brand-accent bg-gray-50 dark:bg-gray-800/50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setHeroIsDragging(true) }}
                  onDragEnter={(e) => { e.preventDefault(); setHeroIsDragging(true) }}
                  onDragLeave={() => setHeroIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setHeroIsDragging(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file && file.type.startsWith('image/')) handleHeroFileSelected(file)
                  }}
                >
                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleHeroFileSelected(file)
                    }}
                    className="sr-only"
                    id="hero-file-input"
                  />
                  {heroIsDragging ? (
                    <>
                      <svg className="w-10 h-10 text-brand-primary dark:text-brand-accent mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm font-semibold text-brand-primary dark:text-brand-accent">Drop to upload</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Drag & drop or{' '}
                        <label htmlFor="hero-file-input" className="text-brand-primary dark:text-brand-accent cursor-pointer hover:underline">
                          browse
                        </label>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, WebP — will be cropped to 640 × 270 px</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hero image alt text — inside the conditional */}
          <FieldText
            label="Hero Image Alt Text"
            registration={register('assets.heroImageAlt')}
            error={errors.assets?.heroImageAlt as never}
            required={!!heroImageUrl}
            placeholder={heroImageUrl ? 'Required — describe the image for accessibility' : 'Required once a hero image is set'}
          />
        </div>
      )}
    </>
  )
})()}
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

      {/* Greeting */}
      <div className="mb-4">
        <label className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-2">
          Greeting
        </label>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">
          Placed above the body intro in the generated email. Manage options in Settings → Greetings.
        </p>
        <select
          value={greetingId}
          onChange={(e) => setValue('content.greetingId', e.target.value, { shouldValidate: false })}
          className="w-full border border-brand-border-field dark:border-gray-600 px-3 py-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent focus:border-brand-primary dark:focus:border-brand-accent transition-colors"
        >
          <option value="">— None —</option>
          {(settings.greetings ?? []).map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
        {greetingId && (() => {
          const selected = (settings.greetings ?? []).find((g) => g.id === greetingId)
          return selected ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">&ldquo;{selected.value}&rdquo;</p>
          ) : null
        })()}
      </div>

      <RichTextarea
        label="Body Intro"
        value={bodyIntro}
        onChange={(html) => setValue('content.bodyIntro', html, { shouldValidate: true })}
        showCount
        required
        error={errors.content?.bodyIntro}
        placeholder="Use the toolbar to bold, italicise, underline, or add links"
        rows={6}
        accentColour={accentColour}
      />

      {/* Email Modules */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Modules</label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
          Drag modules from the library to build your email structure. Click a placed module to add notes.
        </p>
        <ContentEditorShell />
      </div>

      {/* Dynamic sections */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sections<span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
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
