import { useState, useCallback, useRef, useEffect } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { FieldText } from '../ui/FieldText'
import { LOGO_VARIANTS } from '../../lib/constants'
import { formatFileSize } from '../../lib/formatFileSize'

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
          <span className="text-xs font-bold text-brand-accent">N1</span>
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

  // Load image and set initial "cover" scale
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const coverScale = Math.max(CROP_W / img.naturalWidth, CROP_H / img.naturalHeight)
      const initialScale = coverScale
      const scaledW = img.naturalWidth * initialScale
      const scaledH = img.naturalHeight * initialScale
      setScale(initialScale)
      setOffsetX(-(scaledW - CROP_W) / 2)
      setOffsetY(-(scaledH - CROP_H) / 2)
      setLoaded(true)
    }
    img.src = src
  }, [src])

  // Render to canvas whenever scale/offset change
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

  // Clamp offsets so the image always covers the canvas
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
      {/* Header */}
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
        {/* Canvas preview — scales down on narrow screens */}
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

        {/* Zoom slider */}
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

        {/* Reset + action buttons */}
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

// ─── Main StepAssets ───────────────────────────────────────────────────────────
export function StepAssets() {
  const { register, watch, control, formState: { errors }, setValue, getValues } = useFormContext<BriefFormData>()

  const { fields, append, remove } = useFieldArray({
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

  const heroFileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((fileList: FileList) => {
    const current = getValues('assets.attachments') ?? []
    const newAttachments = Array.from(fileList).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    const merged = [...current, ...newAttachments].slice(0, 10)
    setValue('assets.attachments', merged, { shouldValidate: true })
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

  // Hero file selected → open cropper
  const handleHeroFileSelected = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setCropSrc(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [])

  // Cropper done → save result
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
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-8">Assets</h2>

      {/* Logo variant + Stripe colour — two column */}
      <div className="grid grid-cols-2 gap-6 mb-6">
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
      <div className="mb-6">
        <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hero Image</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Recommended: 640 × 270 px. Upload and crop in-browser, or paste a CDN URL.
        </p>

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
            {/* Cropper — shown after file selected */}
            {cropSrc && (
              <ImageCropper
                src={cropSrc}
                onCrop={handleCropComplete}
                onCancel={handleCropCancel}
              />
            )}

            {/* Preview of cropped image */}
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
                  onClick={() => {
                    if (heroImagePreview) setCropSrc(heroImagePreview)
                  }}
                  className="absolute bottom-2 right-2 text-xs bg-white/90 text-gray-700 px-2 py-1 rounded hover:bg-white transition-colors border border-gray-300"
                >
                  Re-crop
                </button>
              </div>
            )}

            {/* Upload drop zone */}
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
      <div className="mb-6">
        <FieldText
          label="Hero Image Alt Text"
          registration={register('assets.heroImageAlt')}
          error={errors.assets?.heroImageAlt as never}
          required={!!heroImageUrl}
          placeholder={heroImageUrl ? 'Required — describe the image for accessibility' : 'Required once a hero image is set'}
        />
      </div>

      {/* Additional Asset URLs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Asset URLs</label>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{fields.length} / 4</span>
          </div>
          {fields.length < 4 && (
            <button
              type="button"
              onClick={() => append('' as never)}
              className="text-xs font-medium text-brand-primary dark:text-brand-accent px-2 py-1 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors"
            >
              + Add URL
            </button>
          )}
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 mb-2">
            <input
              {...register(`assets.additionalAssetUrls.${index}` as const)}
              placeholder="https://..."
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
            <button type="button" onClick={() => remove(index)} className="text-gray-400 hover:text-red-500 px-2" title="Remove" aria-label={`Remove URL ${index + 1}`}>
              &times;
            </button>
          </div>
        ))}
        <p className="text-xs text-gray-400 dark:text-gray-500">Max 4 additional assets. Paste CDN or SharePoint URLs.</p>
      </div>

      {/* Drag & Drop Attachments */}
      <div className="mb-4">
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
    </div>
  )
}
