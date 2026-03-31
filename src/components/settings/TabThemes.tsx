import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { BrandThemeConfig } from '../../types/settings.types'

function generateId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function TabThemes() {
  const { settings, updateSettings } = useSettings()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<BrandThemeConfig>({ id: '', label: '', primary: '#134848', accent: '#fbaa96' })
  const [isAdding, setIsAdding] = useState(false)

  const themes = settings.brandThemes

  const startEdit = (theme: BrandThemeConfig) => {
    setEditingId(theme.id)
    setDraft({ ...theme })
    setIsAdding(false)
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setDraft({ id: '', label: '', primary: '#134848', accent: '#fbaa96' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
  }

  const saveEdit = () => {
    if (!draft.label.trim()) return
    if (editingId) {
      updateSettings({
        brandThemes: themes.map((t) => (t.id === editingId ? { ...draft, id: editingId } : t)),
      })
    }
    setEditingId(null)
  }

  const saveNew = () => {
    if (!draft.label.trim()) return
    const id = generateId(draft.label)
    if (themes.some((t) => t.id === id)) return
    updateSettings({
      brandThemes: [...themes, { ...draft, id }],
    })
    setIsAdding(false)
    setDraft({ id: '', label: '', primary: '#134848', accent: '#fbaa96' })
  }

  const removeTheme = (id: string) => {
    updateSettings({
      brandThemes: themes.filter((t) => t.id !== id),
    })
    if (editingId === id) setEditingId(null)
  }

  const moveTheme = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= themes.length) return
    const arr = [...themes]
    ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
    updateSettings({ brandThemes: arr })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Brand Themes ({themes.length})</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Each theme defines a primary and accent colour pair used across the email template.
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="text-xs font-medium text-brand-primary dark:text-brand-accent border border-brand-primary/30 dark:border-brand-accent/30 px-3 py-1.5 rounded-md hover:bg-brand-primary/5 dark:hover:bg-brand-accent/5 transition-colors"
        >
          + Add Theme
        </button>
      </div>

      {/* Add new theme form */}
      {isAdding && (
        <ThemeEditRow
          draft={draft}
          onChange={setDraft}
          onSave={saveNew}
          onCancel={cancelEdit}
          isNew
        />
      )}

      {/* Theme list */}
      <div className="space-y-1">
        {themes.map((theme, index) => (
          <div key={theme.id}>
            {editingId === theme.id ? (
              <ThemeEditRow
                draft={draft}
                onChange={setDraft}
                onSave={saveEdit}
                onCancel={cancelEdit}
              />
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors">
                {/* Colour swatches */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600" style={{ backgroundColor: theme.primary }} />
                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600" style={{ backgroundColor: theme.accent }} />
                </div>

                {/* Label */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{theme.label}</p>
                  <p className="text-xs text-gray-400 font-mono">{theme.id}</p>
                </div>

                {/* Colour codes */}
                <div className="hidden sm:flex gap-2 text-xs font-mono text-gray-400 shrink-0">
                  <span>{theme.primary}</span>
                  <span>{theme.accent}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button type="button" onClick={() => moveTheme(index, -1)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30" title="Move up">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button type="button" onClick={() => moveTheme(index, 1)} disabled={index === themes.length - 1} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30" title="Move down">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  <button type="button" onClick={() => startEdit(theme)} className="p-1 text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button type="button" onClick={() => removeTheme(theme.id)} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {themes.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No themes configured. Add a theme to get started.</p>
      )}
    </div>
  )
}

function ThemeEditRow({
  draft,
  onChange,
  onSave,
  onCancel,
  isNew,
}: {
  draft: BrandThemeConfig
  onChange: (d: BrandThemeConfig) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-2 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
        {isNew ? 'New Theme' : 'Edit Theme'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={draft.label}
            onChange={(e) => onChange({ ...draft, label: e.target.value })}
            placeholder="e.g. Leatherback Green / Cape Coral"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Primary</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.primary}
                onChange={(e) => onChange({ ...draft, primary: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={draft.primary}
                onChange={(e) => onChange({ ...draft, primary: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-mono px-2 py-1.5 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.accent}
                onChange={(e) => onChange({ ...draft, accent: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={draft.accent}
                onChange={(e) => onChange({ ...draft, accent: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-mono px-2 py-1.5 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Preview */}
      <div className="flex items-center gap-3 mb-3 p-2 rounded border border-gray-200 dark:border-gray-600">
        <div className="flex gap-1">
          <span className="w-6 h-6 rounded-full" style={{ backgroundColor: draft.primary }} />
          <span className="w-4 h-4 rounded-full mt-1" style={{ backgroundColor: draft.accent }} />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{draft.label || 'Preview'}</span>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onSave} className="text-xs font-medium bg-brand-primary text-white px-3 py-1.5 rounded-md hover:bg-brand-primary-hover transition-colors">
          {isNew ? 'Add Theme' : 'Save Changes'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
