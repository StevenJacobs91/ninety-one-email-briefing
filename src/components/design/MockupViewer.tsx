import { useState, useRef, type DragEvent } from 'react'
import type { DesignMockup } from '../../types/design.types'

interface MockupViewerProps {
  mockups: DesignMockup[]
  onChange: (mockups: DesignMockup[]) => void
}

export function MockupViewer({ mockups, onChange }: MockupViewerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    const trimmedUrl = addUrl.trim()
    if (!trimmedUrl) return
    const newMockup: DesignMockup = {
      id: crypto.randomUUID(),
      url: trimmedUrl,
      label: addLabel.trim() || `Mockup ${mockups.length + 1}`,
    }
    onChange([...mockups, newMockup])
    setAddUrl('')
    setAddLabel('')
    setShowAddForm(false)
  }

  const handleRemove = (id: string) => {
    const mockup = mockups.find((m) => m.id === id)
    if (mockup && mockup.url.startsWith('blob:')) {
      URL.revokeObjectURL(mockup.url)
    }
    onChange(mockups.filter((m) => m.id !== id))
    if (lightboxIndex !== null) {
      const currentIdx = mockups.findIndex((m) => m.id === id)
      if (currentIdx === lightboxIndex) {
        setLightboxIndex(null)
      } else if (currentIdx < lightboxIndex) {
        setLightboxIndex(lightboxIndex - 1)
      }
    }
  }

  const handleRenameStart = (mockup: DesignMockup) => {
    setEditingId(mockup.id)
    setEditLabel(mockup.label)
  }

  const handleRenameSave = (id: string) => {
    onChange(mockups.map((m) => m.id === id ? { ...m, label: editLabel.trim() || m.label } : m))
    setEditingId(null)
    setEditLabel('')
  }

  const handleDropFiles = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    const newMockups: DesignMockup[] = files.map((file, i) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      label: `Mockup ${mockups.length + i + 1}`,
    }))
    onChange([...mockups, ...newMockups])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'))
    const newMockups: DesignMockup[] = files.map((file, i) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      label: `Mockup ${mockups.length + i + 1}`,
    }))
    onChange([...mockups, ...newMockups])
    e.target.value = ''
  }

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const lightboxPrev = () => {
    if (lightboxIndex === null) return
    setLightboxIndex((lightboxIndex - 1 + mockups.length) % mockups.length)
  }
  const lightboxNext = () => {
    if (lightboxIndex === null) return
    setLightboxIndex((lightboxIndex + 1) % mockups.length)
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">Mockups</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Add design mockups or reference images for the brief</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            Upload image
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs bg-brand-primary text-white rounded-lg px-3 py-1.5 hover:bg-[#0d3232] transition-colors"
          >
            + Add mockup
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        onChange={handleFileSelect}
        aria-hidden="true"
      />

      {/* Add mockup form */}
      {showAddForm && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/40 space-y-3">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-[0.12em]">Add mockup</h4>
          <div className="space-y-2">
            <input
              type="url"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="Image URL (https://...)"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40"
              autoFocus
            />
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder={`Label (e.g. Mockup ${mockups.length + 1})`}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } if (e.key === 'Escape') setShowAddForm(false) }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!addUrl.trim()}
              className="px-4 py-1.5 bg-brand-primary text-white text-xs rounded-lg hover:bg-[#0d3232] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddUrl(''); setAddLabel('') }}
              className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drop zone (only when no mockups yet) */}
      {mockups.length === 0 && !showAddForm && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDropFiles}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${isDragOver
              ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/5'
              : 'border-gray-200 dark:border-gray-700'
            }
          `}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No mockups yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Add images to preview your design — drop files here or use the buttons above
          </p>
        </div>
      )}

      {/* Mockup drop zone when there are existing mockups */}
      {mockups.length > 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDropFiles}
          className={`rounded-lg transition-all ${isDragOver ? 'ring-2 ring-brand-primary/40 dark:ring-brand-accent/40' : ''}`}
        >
          {/* Mockup grid */}
          <div className="grid grid-cols-3 gap-3">
            {mockups.map((mockup, idx) => (
              <div
                key={mockup.id}
                className="group relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/60"
              >
                {/* Image */}
                <button
                  type="button"
                  onClick={() => openLightbox(idx)}
                  className="block w-full aspect-[4/3] focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40 focus:ring-inset"
                  aria-label={`View ${mockup.label}`}
                >
                  <img
                    src={mockup.url}
                    alt={mockup.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget
                      img.style.display = 'none'
                      const placeholder = img.nextElementSibling
                      if (placeholder instanceof HTMLElement) placeholder.style.display = 'flex'
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-800">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                </button>

                {/* Hover overlay: remove + rename */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" aria-hidden="true" />
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleRenameStart(mockup)}
                    aria-label={`Rename ${mockup.label}`}
                    className="w-6 h-6 bg-white/90 dark:bg-gray-900/90 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-accent transition-colors shadow-sm"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(mockup.id)}
                    aria-label={`Remove ${mockup.label}`}
                    className="w-6 h-6 bg-white/90 dark:bg-gray-900/90 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors shadow-sm"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Label */}
                <div className="px-2 py-1.5 border-t border-gray-100 dark:border-gray-700">
                  {editingId === mockup.id ? (
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={() => handleRenameSave(mockup.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleRenameSave(mockup.id) }
                        if (e.key === 'Escape') { setEditingId(null) }
                      }}
                      className="w-full text-xs text-gray-700 dark:text-gray-300 bg-transparent border-b border-brand-primary dark:border-brand-accent focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{mockup.label}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && mockups[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Mockup: ${mockups[lightboxIndex].label}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] mx-4 flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={mockups[lightboxIndex].url}
              alt={mockups[lightboxIndex].label}
              className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl"
            />
            <p className="text-sm text-white/80 font-medium">{mockups[lightboxIndex].label}</p>

            {/* Close */}
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="Close mockup preview"
              className="absolute top-0 right-0 -translate-y-2 translate-x-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Prev / Next */}
            {mockups.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxPrev() }}
                  aria-label="Previous mockup"
                  className="absolute left-0 top-1/2 -translate-x-12 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxNext() }}
                  aria-label="Next mockup"
                  className="absolute right-0 top-1/2 translate-x-12 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            {/* Counter */}
            {mockups.length > 1 && (
              <p className="text-xs text-white/60">
                {lightboxIndex + 1} / {mockups.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
