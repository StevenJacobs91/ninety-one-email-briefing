import { useCallback, useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { formatFileSize } from '../../lib/formatFileSize'
import { forgetFile, rememberFiles } from '../../lib/attachmentStore'
import { MAX_ATTACHMENTS, validateUpload } from '../../lib/attachmentRules'
import { removeStoredAttachment, uploadAttachment } from '../../lib/attachmentStorage'
import { useAuth } from '../../contexts/AuthContext'
import { SubSection } from '../ui/SubSection'

// Brief metadata, not email content: extra asset links and attached files.
// Attached files are saved to storage as soon as they are chosen, so they survive a reload and travel with the
// brief to the board and to Power Automate. If saving fails the file is kept for this session only, and the
// requester is told.
export function SupportingMaterial() {
  const { control, register, watch, getValues, setValue } = useFormContext<BriefFormData>()
  const { profile } = useAuth()
  const { fields: assetUrlFields, append: appendAssetUrl, remove: removeAssetUrl } = useFieldArray({
    control,
    name: 'assets.additionalAssetUrls' as never,
  })
  const attachments = watch('assets.attachments') ?? []
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState<string[]>([])
  const [notices, setNotices] = useState<string[]>([])

  const handleFiles = useCallback(async (fileList: FileList) => {
    const chosen = Array.from(fileList)
    const messages: string[] = []
    const room = MAX_ATTACHMENTS - (getValues('assets.attachments') ?? []).length
    const accepted: File[] = []
    for (const file of chosen) {
      const problem = validateUpload(file)
      if (problem) { messages.push(problem); continue }
      if (accepted.length >= room) { messages.push(`${file.name} was not added: a brief can have at most ${MAX_ATTACHMENTS} attachments.`); continue }
      accepted.push(file)
    }
    setNotices(messages)

    const add = (a: { name: string; size: number; type: string; path?: string }) => {
      const current = getValues('assets.attachments') ?? []
      setValue('assets.attachments', [...current, a], { shouldValidate: true })
    }
    const teamId = profile?.teamId
    const briefId = getValues('meta.briefId')
    for (const file of accepted) {
      if (!teamId) { rememberFiles([file]); add({ name: file.name, size: file.size, type: file.type }); continue }
      setUploading((u) => [...u, file.name])
      try {
        add(await uploadAttachment(teamId, briefId, file))
      } catch {
        rememberFiles([file])
        add({ name: file.name, size: file.size, type: file.type })
        setNotices((n) => [...n, `${file.name} could not be saved, so it is kept for this session only. It will still be attached when you submit, but not if the page is reloaded.`])
      } finally {
        setUploading((u) => u.filter((n) => n !== file.name))
      }
    }
  }, [getValues, setValue, profile?.teamId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const removeAttachment = useCallback((index: number) => {
    const current = getValues('assets.attachments') ?? []
    const gone = current[index]
    if (gone?.path) void removeStoredAttachment(gone.path)
    else if (gone) forgetFile(gone.name, gone.size)
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
              onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); e.target.value = '' }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">or click to browse · Images, PDFs, documents — max 10 files</p>
          </div>

          {notices.length > 0 && (
            <ul role="alert" className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-400">
              {notices.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}

          {(attachments.length > 0 || uploading.length > 0) && (
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
                      <p className="text-xs text-gray-400">
                        {formatFileSize(att.size)} · {att.path
                          ? <span className="text-emerald-600 dark:text-emerald-400">Saved</span>
                          : <span className="text-amber-600 dark:text-amber-400">This session only</span>}
                      </p>
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
              {uploading.map((name) => (
                <p key={name} className="text-xs text-gray-400" aria-live="polite">Saving {name}…</p>
              ))}
              <p className="text-xs text-gray-400">{attachments.length} file{attachments.length !== 1 ? 's' : ''} attached</p>
            </div>
          )}
        </div>
    </SubSection>
  )
}
