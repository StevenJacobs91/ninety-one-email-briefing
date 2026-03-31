import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { HtmlTemplateConfig } from '../../types/settings.types'

export function TabTemplates() {
  const { settings, updateSettings } = useSettings()
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [draft, setDraft] = useState<HtmlTemplateConfig>({ themeId: '', filename: '' })
  const [isAdding, setIsAdding] = useState(false)

  const templates = settings.htmlTemplates
  const themes = settings.brandThemes

  // Themes that don't have a template mapping yet
  const unmappedThemes = themes.filter((t) => !templates.some((tpl) => tpl.themeId === t.id))

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

  const cancelEdit = () => {
    setEditingThemeId(null)
    setIsAdding(false)
  }

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
    updateSettings({
      htmlTemplates: [...templates, draft],
    })
    setIsAdding(false)
  }

  const removeTemplate = (themeId: string) => {
    updateSettings({
      htmlTemplates: templates.filter((t) => t.themeId !== themeId),
    })
    if (editingThemeId === themeId) setEditingThemeId(null)
  }

  const getThemeLabel = (themeId: string) =>
    themes.find((t) => t.id === themeId)?.label ?? themeId

  const getThemeColors = (themeId: string) =>
    themes.find((t) => t.id === themeId)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">HTML Templates ({templates.length})</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Map each brand theme to its Pardot-compatible HTML template file.
          </p>
        </div>
        {unmappedThemes.length > 0 && (
          <button
            type="button"
            onClick={startAdd}
            className="text-xs font-medium text-brand-primary dark:text-brand-accent border border-brand-primary/30 dark:border-brand-accent/30 px-3 py-1.5 rounded-md hover:bg-brand-primary/5 dark:hover:bg-brand-accent/5 transition-colors"
          >
            + Add Mapping
          </button>
        )}
      </div>

      {/* Unmapped themes notice */}
      {unmappedThemes.length > 0 && !isAdding && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">{unmappedThemes.length} theme{unmappedThemes.length > 1 ? 's' : ''}</span> without a template mapping:
            {' '}{unmappedThemes.map((t) => t.label).join(', ')}
          </p>
        </div>
      )}

      {/* Add new mapping */}
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
                {unmappedThemes.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
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

      {/* Template list */}
      <div className="space-y-1">
        {templates.map((tpl) => {
          const themeColors = getThemeColors(tpl.themeId)
          return (
            <div key={tpl.themeId}>
              {editingThemeId === tpl.themeId ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-1 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Edit Mapping</p>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Template Filename for {getThemeLabel(tpl.themeId)}
                    </label>
                    <input
                      type="text"
                      value={draft.filename}
                      onChange={(e) => setDraft({ ...draft, filename: e.target.value })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
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
      </div>
    </div>
  )
}
