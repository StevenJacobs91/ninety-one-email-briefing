import { useState, useMemo } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { HtmlModuleConfig, ModuleCategory } from '../../types/settings.types'
import { Switch } from '../ui/Switch'
import { applyThemeTokens, validateModuleHtml, type ThemeColours } from '../../lib/customModules'

const CATEGORIES: ModuleCategory[] = ['Headers', 'Content', 'CTAs', 'Events', 'Speakers', 'Articles', 'Media', 'Navigation', 'Footers']

export function TabModules() {
  const { settings, updateSettings } = useSettings()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<HtmlModuleConfig>({ id: '', label: '', description: '', category: 'Content', enabled: true })
  const [isAdding, setIsAdding] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<ModuleCategory | 'all'>('all')

  const modules = settings.htmlModules
  // The code preview is shown in the first theme's colours.
  const firstTheme = settings.brandThemes?.[0]
  const previewColours = { primary: firstTheme?.primary ?? '#134848', accent: firstTheme?.accent ?? '#fbaa96', tint01: firstTheme?.tint01, tint02: firstTheme?.tint02, tint03: firstTheme?.tint03 }

  const grouped = useMemo(() => {
    const filtered = filterCategory === 'all' ? modules : modules.filter((m) => m.category === filterCategory)
    const map = new Map<ModuleCategory, HtmlModuleConfig[]>()
    for (const cat of CATEGORIES) {
      const items = filtered.filter((m) => m.category === cat)
      if (items.length > 0) map.set(cat, items)
    }
    return map
  }, [modules, filterCategory])

  const startEdit = (mod: HtmlModuleConfig) => {
    setEditingId(mod.id)
    setDraft({ ...mod })
    setIsAdding(false)
    setCodeError(null)
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setDraft({ id: '', label: '', description: '', category: 'Content', enabled: true })
    setCodeError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setCodeError(null)
  }

  // The code is kept as written, without surrounding blank lines; a built-in module saved with none keeps the library's own.
  const withCode = (d: HtmlModuleConfig): HtmlModuleConfig => {
    const html = (d.html ?? '').trim()
    const { html: _drop, ...rest } = d
    return html ? { ...rest, html } : rest
  }

  const saveEdit = () => {
    if (!draft.label.trim()) return
    const problem = (draft.html ?? '').trim() ? validateModuleHtml(draft.html ?? '') : null
    setCodeError(problem)
    if (problem) return
    updateSettings({
      htmlModules: modules.map((m) => (m.id === editingId ? { ...withCode(draft), id: editingId } : m)),
    })
    setEditingId(null)
  }

  const saveNew = () => {
    if (!draft.label.trim() || !draft.id.trim()) return
    if (modules.some((m) => m.id === draft.id)) return
    // A module with no code would never appear in the builder, so a new one needs it.
    const problem = validateModuleHtml(draft.html ?? '')
    setCodeError(problem)
    if (problem) return
    updateSettings({
      htmlModules: [...modules, withCode(draft)],
    })
    setIsAdding(false)
  }

  const removeModule = (id: string) => {
    updateSettings({
      htmlModules: modules.filter((m) => m.id !== id),
    })
    if (editingId === id) setEditingId(null)
  }

  const toggleEnabled = (id: string) => {
    updateSettings({
      htmlModules: modules.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
    })
  }

  const enabledCount = modules.filter((m) => m.enabled).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Email Modules ({enabledCount}/{modules.length} enabled)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage the library of email modules available in the content step.
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="text-xs font-medium text-brand-primary dark:text-brand-accent border border-brand-primary/30 dark:border-brand-accent/30 px-3 py-1.5 rounded-md hover:bg-brand-primary/5 dark:hover:bg-brand-accent/5 transition-colors"
        >
          + Add Module
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-brand-primary text-white dark:bg-brand-accent dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All ({modules.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = modules.filter((m) => m.category === cat).length
          if (count === 0) return null
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-brand-primary text-white dark:bg-brand-accent dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Add new module */}
      {isAdding && (
        <ModuleEditRow draft={draft} onChange={(d) => { setDraft(d); setCodeError(null) }} onSave={saveNew} onCancel={cancelEdit} isNew codeError={codeError} previewColours={previewColours} />
      )}

      {/* Module list grouped by category */}
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">{category}</h4>
          <div className="space-y-0.5">
            {items.map((mod) => (
              <div key={mod.id}>
                {editingId === mod.id ? (
                  <ModuleEditRow draft={draft} onChange={(d) => { setDraft(d); setCodeError(null) }} onSave={saveEdit} onCancel={cancelEdit} codeError={codeError} previewColours={previewColours} />
                ) : (
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors ${!mod.enabled ? 'opacity-50' : ''}`}>
                    {/* Enable/disable toggle */}
                    <Switch size="sm" checked={mod.enabled} label={`${mod.enabled ? 'Disable' : 'Enable'} ${mod.label}`} onChange={() => toggleEnabled(mod.id)} />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{mod.label}</p>
                      <p className="text-xs text-gray-400 truncate">{mod.description}</p>
                    </div>

                    <span className="text-xs font-mono text-gray-400 hidden sm:block shrink-0">{mod.id}</span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button type="button" onClick={() => startEdit(mod)} className="p-1 text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button type="button" onClick={() => removeModule(mod.id)} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ModuleEditRow({
  draft,
  onChange,
  onSave,
  onCancel,
  isNew,
  codeError,
  previewColours,
}: {
  draft: HtmlModuleConfig
  onChange: (d: HtmlModuleConfig) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
  codeError: string | null
  previewColours: ThemeColours
}) {
  const [showPreview, setShowPreview] = useState(false)
  const code = draft.html ?? ''
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-2 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
        {isNew ? 'New Module' : 'Edit Module'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {isNew && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Module ID</label>
            <input
              type="text"
              value={draft.id}
              onChange={(e) => onChange({ ...draft, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder="my-custom-module"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-mono px-3 py-1.5 dark:text-gray-100"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={draft.label}
            onChange={(e) => onChange({ ...draft, label: e.target.value })}
            placeholder="Module display name"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
          <select
            value={draft.category}
            onChange={(e) => onChange({ ...draft, category: e.target.value as ModuleCategory })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            placeholder="Brief description of this module"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="module-code" className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Module code (HTML){isNew && <span className="text-red-500"> *</span>}
          </label>
          <button type="button" onClick={() => setShowPreview((v) => !v)} className="text-xs text-brand-primary dark:text-brand-accent hover:underline">
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
        </div>
        <textarea
          id="module-code"
          value={code}
          onChange={(e) => onChange({ ...draft, html: e.target.value })}
          rows={10}
          spellCheck={false}
          aria-invalid={codeError ? true : undefined}
          placeholder={isNew ? '<tr>\n  <td bgcolor="{{primary}}" style="padding: 30px 40px;">\n    <p pardot-region="paragraph" style="color: #ffffff;">Your text</p>\n  </td>\n</tr>' : 'Leave empty to keep the library\'s own code for this module'}
          className={`w-full rounded-md border bg-white dark:bg-gray-700 text-xs font-mono leading-relaxed px-3 py-2 dark:text-gray-100 resize-y ${codeError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {codeError && <p role="alert" className="text-xs text-red-600 mt-1">{codeError}</p>}
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          A table row (<code>&lt;tr&gt;…&lt;/tr&gt;</code>). Add <code>pardot-region</code> to text and buttons you want editable in the builder. Use
          {' '}<code>{'{{primary}}'}</code>, <code>{'{{accent}}'}</code> and <code>{'{{tint01}}'}</code>–<code>{'{{tint03}}'}</code> for the theme&rsquo;s colours so one module suits every theme.
          {!isNew && !(draft.html ?? '').trim() && ' This module currently uses the library\'s own code; code saved here with the same name replaces it.'}
        </p>
        {showPreview && (
          <iframe
            title="Module preview"
            sandbox=""
            className="mt-2 w-full h-56 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-white"
            srcDoc={code.trim() ? `<!doctype html><body style="margin:0;background:#f4f2ea"><table width="640" align="center" cellpadding="0" cellspacing="0" border="0" role="presentation"><tbody>${applyThemeTokens(code, previewColours)}</tbody></table></body>` : '<p style="font:12px sans-serif;color:#888;padding:12px">No code yet.</p>'}
          />
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onSave} className="text-xs font-medium bg-brand-primary text-white px-3 py-1.5 rounded-md hover:bg-brand-primary-hover transition-colors">
          {isNew ? 'Add Module' : 'Save Changes'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-medium text-gray-500 px-3 py-1.5 hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
