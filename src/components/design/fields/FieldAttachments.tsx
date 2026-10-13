import { useRef, useState, useCallback, type DragEvent } from 'react'
import type { DesignAttachment } from '../../../types/design.types'

interface FieldAttachmentsProps {
  value: DesignAttachment[]
  onChange: (attachments: DesignAttachment[]) => void
  helpText?: string
  maxFiles?: number
  label?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string): JSX.Element {
  if (mimeType.startsWith('image/')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 dark:text-green-400">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    )
  }
  if (mimeType === 'application/pdf') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    )
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 dark:text-blue-400">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
    </svg>
  )
}

export function FieldAttachments({ value, onChange, helpText, maxFiles = 10, label }: FieldAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')

  const atLimit = value.length >= maxFiles

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newAttachments: DesignAttachment[] = fileArray
      .slice(0, maxFiles - value.length)
      .map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        url: URL.createObjectURL(file),
        isExternal: false,
      }))
    if (newAttachments.length > 0) {
      onChange([...value, ...newAttachments])
    }
  }, [value, onChange, maxFiles])

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (atLimit) return
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
    e.target.value = ''
  }

  const handleRemove = (id: string) => {
    const attachment = value.find((a) => a.id === id)
    if (attachment && !attachment.isExternal && attachment.url.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.url)
    }
    onChange(value.filter((a) => a.id !== id))
  }

  const handleAddUrl = () => {
    const trimmed = urlInputValue.trim()
    if (!trimmed) return
    const name = trimmed.split('/').pop() || trimmed
    const newAttachment: DesignAttachment = {
      id: crypto.randomUUID(),
      name,
      size: 0,
      mimeType: 'application/octet-stream',
      url: trimmed,
      isExternal: true,
    }
    onChange([...value, newAttachment])
    setUrlInputValue('')
    setShowUrlInput(false)
  }

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 tracking-[0.12em] uppercase">
          {label}
        </label>
      )}

      {/* Drop zone */}
      {!atLimit && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload attachments — drop files here or click to browse"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${isDragOver
              ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/5 ring-2 ring-brand-primary/30 dark:ring-brand-accent/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={handleFileSelect}
            aria-hidden="true"
          />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-gray-300 dark:text-gray-600" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drop files here or <span className="text-brand-primary dark:text-brand-accent font-medium">click to browse</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Any file type accepted · {maxFiles - value.length} remaining
          </p>
        </div>
      )}

      {atLimit && (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Maximum of {maxFiles} files reached
          </p>
        </div>
      )}

      {helpText && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{helpText}</p>
      )}

      {/* URL input toggle */}
      {!atLimit && (
        <div>
          {!showUrlInput ? (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-brand-primary dark:hover:text-brand-accent transition-colors"
            >
              + Add by URL
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl() } if (e.key === 'Escape') setShowUrlInput(false) }}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-3 py-2 bg-brand-primary text-white text-xs rounded-lg hover:bg-[#0d3232] transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowUrlInput(false); setUrlInputValue('') }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* File list */}
      {value.length > 0 && (
        <ul className="space-y-2" role="list">
          {value.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
              {/* Thumbnail or icon */}
              {attachment.mimeType.startsWith('image/') && !attachment.isExternal ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-9 h-9 object-cover rounded shrink-0 border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <span className="w-9 h-9 flex items-center justify-center shrink-0">
                  {getFileIcon(attachment.mimeType)}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium" title={attachment.name}>
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-600">
                  {attachment.isExternal ? 'External URL' : formatFileSize(attachment.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(attachment.id)}
                aria-label={`Remove ${attachment.name}`}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
