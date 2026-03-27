import { useState, useCallback } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { FieldText } from '../ui/FieldText'
import { LOGO_VARIANTS } from '../../lib/constants'
import { formatFileSize } from '../../lib/formatFileSize'

export function StepAssets() {
  const { register, watch, control, formState: { errors }, setValue, getValues } = useFormContext<BriefFormData>()

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assets.additionalAssetUrls' as never,
  })

  const heroImageUrl = watch('assets.heroImageUrl') ?? ''
  const attachments = watch('assets.attachments') ?? []

  const [isDragging, setIsDragging] = useState(false)

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

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Assets</h2>

      {/* Logo variant */}
      <div className="mb-4">
        <p id="logo-variant-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Logo Variant<span className="text-red-500 ml-0.5">*</span>
        </p>
        <div className="flex gap-3" role="radiogroup" aria-labelledby="logo-variant-label">
          {LOGO_VARIANTS.map((variant) => {
            const selected = watch('assets.logoVariant') === variant
            return (
              <label
                key={variant}
                className={`flex-1 text-center py-2 rounded-md border text-sm font-medium cursor-pointer transition-colors ${
                  selected
                    ? 'bg-[#134848] text-white border-[#134848]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  {...register('assets.logoVariant')}
                  value={variant}
                  className="sr-only"
                />
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <FieldText
          label="Stripe Colour"
          registration={register('assets.stripeColour')}
          placeholder="e.g. #fbaa96"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-3 mb-4">
          Optional. Hex value that overrides the selected theme's default stripe/accent colour.
        </p>
      </div>

      <FieldText
        label="Hero Image URL"
        registration={register('assets.heroImageUrl')}
        error={errors.assets?.heroImageUrl as never}
        placeholder="https://cdn.example.com/hero.jpg"
        validateUrl
      />

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
