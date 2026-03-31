import { useState, useRef, useCallback } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { HtmlTemplateConfig } from '../../types/settings.types'

export function TabTemplates() {
  const { settings, updateSettings } = useSettings()
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [draft, setDraft] = useState<HtmlTemplateConfig>({ themeId: '', filename: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<{ filename: string; themeId: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const templates = settings.htmlTemplates
  const themes = settings.brandThemes

  const unmappedThemes = themes.filter((t) => !templates.some((tpl) => tpl.themeId === t.id))

  // Guess a theme from a filename by fuzzy-matching theme labels
  function guessTheme(filename: string): string {
    const lower = filename.toLowerCase().replace(/[-_\.]/g, ' ')
    let best = ''
    let bestScore = 0
    for (const t of themes) {
      const words = t.label.toLowerCase().split(/[\s\/]+/)
      const score = words.filter((w) => w.length > 2 && lower.includes(w)).length
      if (score > bestScore) { bestScore = score; best = t.id }
    }
    return best || (unmappedThemes[0]?.id ?? themes[0]?.id ?? '')
  }

  function processFiles(files: File[]) {
    const htmlFiles = files.filter((f) => f.name.endsWith('.html') || f.name.endsWith('.htm'))
    if (htmlFiles.length === 0) return
    const incoming = htmlFiles.map((f) => ({
      filename: f.name,
      themeId: guessTheme(f.name),
    }))
    setDroppedFiles((prev) => {
      const merged = [...prev]
      for (const item of incoming) {
        if (!merged.some((m) => m.filename === item.filename)) merged.push(item)
      }
      return merged
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    processFiles(Array.from(e.dataTransfer.files))
  }, [themes, unmappedThemes]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function saveDroppedMappings() {
    const newMappings = droppedFiles.filter(
      (f) => f.themeId && !templates.some((t) => t.themeId === f.themeId)
    )
    if (newMappings.length === 0) return
    updateSettings({ htmlTemplates: [...templates, ...newMappings] })
    setDroppedFiles([])
  }

  const startEdit = (tpl: HtmlTemplateConfig) => {
    setEditingThemeId(tpl.themeId)
    setDraft({ ...tpl })
    setIsAdding(false)
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingThemeId(null)
    setDraft({ themeId: unmappedThemes[0]?.id ?? '', filename: '' })
  }

  const cancelEdit = () => { setEditingThemeId(null); setIsAdding(false) }

  const saveEdit = () => {
    if (!draft.filename.trim()) return
    updateSettings({
      htmlTemplates: templates.map((t) =>
        t.themeId === editingThemeId ? { ...draft, themeId: editingThemeId } : t
      ),
    })
    setEditingThemeId(null)
  }

  const saveNew = () => {
    if (!draft.themeId || !draft.filename.trim()) return
    if (templates.some((t) => t.themeId === draft.themeId)) return
    updateSettings({ htmlTemplates: [...templates, draft] })
    setIsAdding(false)
  }

  const removeTemplate = (themeId: string) => {
    updateSettings({ htmlTemplates: templates.filter((t) => t.themeId !== themeId) })
    if (editingThemeId === themeId) setEditingThemeId(null)
  }

  const getThemeLabel = (themeId: string) => themes.find((t) => t.id === themeId)?.label ?? themeId
  const getThemeColors = (themeId: string) => themes.find((t) => t.id === themeId)

  return (
    <div className="space-y-5">
      {/* ── Drag & Drop Upload Zone ── */}
      <div>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Template Files</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Drop your Pardot-compatible HTML template files here. Each file will be mapped to a brand theme — the theme is auto-suggested from the filename and can be changed below.
        </p>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors select-none ${
            isDragOver
              ? 'border-brand-primary bg-brand-primary/5 dark:border-brand-accent dark:bg-brand-accent/5'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40'
          }`}
        >
          <svg className="mx-auto mb-3 text-gray-400 dark:text-gray-500" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {isDragOver ? 'Drop to add templates' : 'Drop HTML files here'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">or click to browse — .html files only</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>

      {/* ── Staged dropped files ── */}
      {droppedFiles.length > 0 && (
        <div className="border border-brand-primary/20 dark:border-brand-accent/20 rounded-lg p-4 bg-brand-bg-panel/60 dark:bg-gray-800/60 space-y-3">
          <p className="text-xs font-medium text-brand-primary dark:text-brand-accent uppercase tracking-wider">
            {droppedFiles.length} file{droppedFiles.length !== 1 ? 's' : ''} ready to map
          </p>
          {droppedFiles.map((item, i) => {
            const alreadyMapped = templates.some((t) => t.themeId === item.themeId)
            return (
              <div key={item.filename} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="text-gray-400 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-mono truncate">{item.filename}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={item.themeId}
                    onChange={(e) => setDroppedFiles((prev) =>
                      prev.map((f, idx) => idx === i ? { ...f, themeId: e.target.value } : f)
                    )}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs px-2 py-1.5 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                  >
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  {alreadyMapped && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">Already mapped</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setDroppedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    title="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            )
          })}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={saveDroppedMappings}
              disabled={droppedFiles.every((f) => templates.some((t) => t.themeId === f.themeId))}
              className="px-4 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover transition-colors disabled:opacity-40"
            >
              Save {droppedFiles.filter((f) => !templates.some((t) => t.themeId === f.themeId)).length} Mapping{droppedFiles.filter((f) => !templates.some((t) => t.themeId === f.themeId)).length !== 1 ? 's' : ''}
            </button>
            <button
              type="button"
              onClick={() => setDroppedFiles([])}
              className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Existing mappings ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Theme Mappings ({templates.length})</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Map each brand theme to its Pardot-compatible HTML template filename.</p>
          </div>
          {unmappedThemes.length > 0 && (
            <button
              type="button"
              onClick={startAdd}
              className="text-xs font-medium text-brand-primary dark:text-brand-accent border border-brand-primary/30 dark:border-brand-accent/30 px-3 py-1.5 rounded-md hover:bg-brand-primary/5 dark:hover:bg-brand-accent/5 transition-colors shrink-0"
            >
              + Add Manually
            </button>
          )}
        </div>

        {unmappedThemes.length > 0 && !isAdding && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <span className="font-semibold">{unmappedThemes.length} theme{unmappedThemes.length > 1 ? 's' : ''}</span> without a mapping: {unmappedThemes.map((t) => t.label).join(', ')}
            </p>
          </div>
        )}

        {isAdding && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">New Template Mapping</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Theme</label>
                <select
                  value={draft.themeId}
                  onChange={(e) => setDraft({ ...draft, themeId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
                >
                  {unmappedThemes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Template Filename</label>
                <input
                  type="text"
                  value={draft.filename}
                  onChange={(e) => setDraft({ ...draft, filename: e.target.value })}
                  placeholder="Theme_Name_-_All_Modules.html"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={saveNew} className="text-xs font-medium bg-brand-primary text-white px-3 py-1.5 rounded-md hover:bg-brand-primary-hover transition-colors">Add Mapping</button>
              <button type="button" onClick={cancelEdit} className="text-xs font-medium text-gray-500 px-3 py-1.5 hover:text-gray-700 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {templates.map((tpl) => {
            const themeColors = getThemeColors(tpl.themeId)
            return (
              <div key={tpl.themeId}>
                {editingThemeId === tpl.themeId ? (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-1 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Edit Mapping — {getThemeLabel(tpl.themeId)}</p>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Template Filename</label>
                      <input
                        type="text"
                        value={draft.filename}
                        onChange={(e) => setDraft({ ...draft, filename: e.target.value })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={saveEdit} className="text-xs font-medium bg-brand-primary text-white px-3 py-1.5 rounded-md hover:bg-brand-primary-hover transition-colors">Save</button>
                      <button type="button" onClick={cancelEdit} className="text-xs font-medium text-gray-500 px-3 py-1.5 hover:text-gray-700 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors">
                    {themeColors && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600" style={{ backgroundColor: themeColors.primary }} />
                        <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600" style={{ backgroundColor: themeColors.accent }} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{getThemeLabel(tpl.themeId)}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{tpl.filename}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button type="button" onClick={() => startEdit(tpl)} className="p-1 text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button type="button" onClick={() => removeTemplate(tpl.themeId)} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {templates.length === 0 && !isAdding && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-6">
              No mappings yet. Drop HTML files above or use + Add Manually.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
