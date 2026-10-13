import { useRef, useState, useCallback, type DragEvent } from 'react'

interface FieldImageUploaderProps {
  value: string[]       // array of image URLs
  onChange: (urls: string[]) => void
  label?: string
  helpText?: string
  maxImages?: number
}

export function FieldImageUploader({ value, onChange, label, helpText, maxImages = 4 }: FieldImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number>(0)

  const atLimit = value.length >= maxImages

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const newUrls = fileArray
      .slice(0, maxImages - value.length)
      .map((file) => URL.createObjectURL(file))
    if (newUrls.length > 0) {
      onChange([...value, ...newUrls])
    }
  }, [value, onChange, maxImages])

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
      addImages(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImages(e.target.files)
    }
    e.target.value = ''
  }

  const handleRemove = (url: string) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
    onChange(value.filter((u) => u !== url))
    if (lightboxUrl === url) {
      setLightboxUrl(null)
    }
  }

  const handleAddUrl = () => {
    const trimmed = urlInputValue.trim()
    if (!trimmed) return
    onChange([...value, trimmed])
    setUrlInputValue('')
    setShowUrlInput(false)
  }

  const openLightbox = (url: string, index: number) => {
    setLightboxUrl(url)
    setLightboxIndex(index)
  }

  const closeLightbox = () => setLightboxUrl(null)

  const lightboxPrev = () => {
    const newIdx = (lightboxIndex - 1 + value.length) % value.length
    setLightboxIndex(newIdx)
    setLightboxUrl(value[newIdx])
  }

  const lightboxNext = () => {
    const newIdx = (lightboxIndex + 1) % value.length
    setLightboxIndex(newIdx)
    setLightboxUrl(value[newIdx])
  }

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 tracking-[0.12em] uppercase">
          {label}
        </label>
      )}

      {/* Image grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {value.map((url, idx) => (
            <div key={url} className="relative group aspect-square">
              <button
                type="button"
                onClick={() => openLightbox(url, idx)}
                className="w-full h-full block rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40"
                aria-label={`View image ${idx + 1}`}
              >
                <img
                  src={url}
                  alt={`Uploaded image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(url)}
                aria-label={`Remove image ${idx + 1}`}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {!atLimit && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload images — drop files here or click to browse"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all
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
            accept="image/*"
            className="sr-only"
            onChange={handleFileSelect}
            aria-hidden="true"
          />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-gray-300 dark:text-gray-600" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drop images or <span className="text-brand-primary dark:text-brand-accent font-medium">click to browse</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
            {maxImages - value.length} image{maxImages - value.length !== 1 ? 's' : ''} remaining
          </p>
        </div>
      )}

      {helpText && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{helpText}</p>
      )}

      {/* URL input */}
      {!atLimit && (
        <div>
          {!showUrlInput ? (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-brand-primary dark:hover:text-brand-accent transition-colors"
            >
              + Add image by URL
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

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt="Full size preview"
              className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl"
            />

            {/* Close */}
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="Close image preview"
              className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Prev/Next */}
            {value.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxPrev() }}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxNext() }}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            {/* Counter */}
            {value.length > 1 && (
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/70 bg-black/50 px-3 py-1 rounded-full">
                {lightboxIndex + 1} / {value.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
