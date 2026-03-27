import { useState, useCallback, useRef } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { FieldText } from '../ui/FieldText'
import { LOGO_VARIANTS } from '../../lib/constants'
import { formatFileSize } from '../../lib/formatFileSize'

// Logo variant visual preview cards
function LogoPreview({ variant }: { variant: string }) {
  return (
    <div className="flex items-center justify-center h-10 w-full rounded bg-[#134848]/10 dark:bg-[#134848]/20 border border-[#134848]/20">
      {variant === 'horizontal' && (
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded bg-[#134848] flex items-center justify-center">
            <span className="text-[7px] font-bold text-[#fbaa96]">N1</span>
          </div>
          <div className="w-8 h-1.5 bg-[#134848] rounded-sm" />
        </div>
      )}
      {variant === 'stacked' && (
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-5 h-5 rounded bg-[#134848] flex items-center justify-center">
            <span className="text-[7px] font-bold text-[#fbaa96]">N1</span>
          </div>
          <div className="w-8 h-1 bg-[#134848] rounded-sm" />
        </div>
      )}
      {variant === 'icon' && (
        <div className="w-6 h-6 rounded bg-[#134848] flex items-center justify-center">
          <span className="text-[9px] font-bold text-[#fbaa96]">N1</span>
        </div>
      )}
    </div>
  )
}

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

  const handleFiles = useCallback((fileList: FileList) => {
    const current = getValues('assets.attachments') ?? []
    const newAttachments = Array.from(fileList).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    const merged = [...current, ...newAttachments].slice(0, 10) // max 10
    setValue('assets.attachments', merged, { shouldValidate: true })
  }, [getValues, setValue])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const removeAttachment = useCallback((index: number) => {
    const current = getValues('assets.attachments') ?? []
    setValue('assets.attachments', current.filter((_, i) => i !== index), { shouldValidate: true })
  }, [getValues, setValue])

  const handleHeroFileUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setHeroImagePreview(dataUrl)
      // Store the filename as the URL for reference — the actual file isn't uploaded
      setValue('assets.heroImageUrl', `[uploaded] ${file.name}`, { shouldValidate: true })
    }
    reader.readAsDataURL(file)
  }, [setValue])

  const heroFileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Assets</h2>

      {/* Logo variant — two column */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p id="logo-variant-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      ? 'bg-[#134848]/5 dark:bg-[#134848]/10 border-[#134848] dark:border-[#fbaa96] ring-1 ring-[#134848] dark:ring-[#fbaa96]'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    {...register('assets.logoVariant')}
                    value={variant}
                    className="sr-only"
                  />
                  <LogoPreview variant={variant} />
                  <span className="text-xs font-medium text-center text-gray-700 dark:text-gray-300">
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Stripe colour — colour picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stripe Colour
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
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848]"
              onChange={(e) => {
                const val = e.target.value
                register('assets.stripeColour').onChange(e)
                // Sync to colour picker if valid hex
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  setValue('assets.stripeColour', val)
                }
              }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Optional. Overrides the selected theme's default accent/stripe colour.
          </p>
          {stripeColour && /^#[0-9A-Fa-f]{6}$/.test(stripeColour) && (
            <div
              className="mt-2 h-4 rounded-sm border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: stripeColour }}
              title={`Preview: ${stripeColour}`}
            />
          )}
        </div>
      </div>

      {/* Hero Image */}
      <div className="mb-4">
        <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Hero Image
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          640 × 270 px recommended with primary colour gradient at bottom.
        </p>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 mb-3 w-fit">
          <button
            type="button"
            onClick={() => setHeroImageMode('url')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              heroImageMode === 'url' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setHeroImageMode('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              heroImageMode === 'upload' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Upload
          </button>
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
            {heroImagePreview ? (
              <div className="relative mb-2">
                <img
                  src={heroImagePreview}
                  alt="Hero image preview"
                  className="w-full max-h-40 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                />
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
              </div>
            ) : (
              <label className="relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center cursor-pointer border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-gray-50 dark:bg-gray-800/50">
                <input
                  ref={heroFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleHeroFileUpload(file)
                  }}
                  className="sr-only"
                />
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Click to upload hero image</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, WebP</p>
              </label>
            )}
          </div>
        )}
      </div>

      <FieldText
        label="Hero Image Alt Text"
        registration={register('assets.heroImageAlt')}
        error={errors.assets?.heroImageAlt as never}
        required={!!heroImageUrl}
        placeholder={heroImageUrl ? 'Required — describe the image' : 'Only required if hero image is set'}
      />

      {/* Additional asset URLs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Asset URLs</label>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{fields.length} / 4</span>
          </div>
          {fields.length < 4 && (
            <button
              type="button"
              onClick={() => append('' as never)}
              className="text-xs font-medium text-[#134848] dark:text-[#fbaa96] hover:text-[#0d3232] px-2 py-1 rounded border border-[#134848]/30 dark:border-[#fbaa96]/30 hover:bg-[#134848]/5 transition-colors"
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
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848]"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-gray-400 hover:text-red-500 px-2"
              title="Remove"
              aria-label={`Remove URL ${index + 1}`}
            >
              &times;
            </button>
          </div>
        ))}
        <p className="text-xs text-gray-400">Max 4 additional assets</p>
      </div>

      {/* Drag & Drop Attachments */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Attachments
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-[#134848] bg-[#134848]/5 dark:border-[#fbaa96] dark:bg-[#fbaa96]/5'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus-within:ring-2 focus-within:ring-[#134848] focus-within:border-[#134848]'
          }`}
        >
          <input
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Images, PDFs, documents — max 10 files
            </p>
          </div>
        </div>

        {/* Attachment list */}
        {attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {attachments.map((att, index) => (
              <div
                key={`${att.name}-${index}`}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400 text-sm shrink-0">
                    {att.type.startsWith('image/') ? '\u{1F5BC}' : '\u{1F4CE}'}
                  </span>
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
            <p className="text-xs text-gray-400">
              {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
