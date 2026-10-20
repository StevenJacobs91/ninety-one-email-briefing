import { useCallback, useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { formatFileSize } from '../../lib/formatFileSize'
import { SubSection } from '../ui/SubSection'

// Brief metadata, not email content: extra asset links and attached files.
export function SupportingMaterial() {
  const { control, register, watch, getValues, setValue } = useFormContext<BriefFormData>()
  const { fields: assetUrlFields, append: appendAssetUrl, remove: removeAssetUrl } = useFieldArray({
    control,
    name: 'assets.additionalAssetUrls' as never,
  })
  const attachments = watch('assets.attachments') ?? []
  const [isDragging, setIsDragging] = useState(false)

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

  return (
    <SubSection title="Supporting Material">
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
  )
}
