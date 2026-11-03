import { useState, useMemo, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { HtmlModuleConfig, ModuleCategoryConfig } from '../../types/settings.types'
import { FALLBACK_CATEGORY, moduleCategories, newCategoryId, resolveCategory } from '../../lib/moduleCategories'
import { ModuleCategoryManager } from './ModuleCategoryManager'
import { Switch } from '../ui/Switch'
import { modulePreviewDoc, themeTokensFor, tokeniseModule, validateModuleHtml, type ThemeColours } from '../../lib/customModules'
import { loadCatalogue } from '../../lib/moduleEngine/catalogue'
import { DEFAULT_BRAND_THEMES, LIBRARY_MODULES } from '../../lib/settingsDefaults'
import { describePickerModule, LAYOUT_ICONS } from '../../lib/moduleKinds'
import { ModuleThumb } from '../builder2/ModuleThumb'
import { LazyCodeEditor } from '../ui/LazyCodeEditor'
import { codeVariables } from '../../lib/codeVariables'


// The theme whose library supplies a built-in module's code: it has every module.
const LIBRARY_THEME = 'agulhas-gold'

export function TabModules() {
  const { settings, updateSettings } = useSettings()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<HtmlModuleConfig>({ id: '', label: '', description: '', category: 'Content', enabled: true })
  const [isAdding, setIsAdding] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  // Removing a module takes two steps: the X asks, Delete confirms.
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [managingCategories, setManagingCategories] = useState(false)

  const modules = settings.htmlModules
  // The same categories the Add module picker uses. A module filed under one that is gone, or an old name, is read as Other or its new name.
  const categories = moduleCategories(settings)
  const categoryOf = (m: HtmlModuleConfig) => resolveCategory(categories, m.category)
  const counts = modules.reduce<Record<string, number>>((n, m) => ({ ...n, [categoryOf(m)]: (n[categoryOf(m)] ?? 0) + 1 }), {})
  // Every module's own code is shown to be edited. It comes from one theme's library (Agulhas Gold has every module), with that
  // theme's colours and images written as the variables for them, so what is shown and saved suits every theme.
  const [library, setLibrary] = useState<{ modules: Record<string, string>; tokens: ThemeColours } | null>(null)
  useEffect(() => {
    let live = true
    loadCatalogue(LIBRARY_THEME)
      .then((c) => {
        const own = DEFAULT_BRAND_THEMES.find((t) => t.id === LIBRARY_THEME)
        const tokens = { ...themeTokensFor(c, { brandThemes: [] }), primary: own?.primary ?? '#221b3b', accent: own?.accent ?? '#cf6f13', tint01: own?.tint01, tint02: own?.tint02, tint03: own?.tint03 }
        if (live) setLibrary({ modules: c.modules, tokens })
      })
      .catch(() => {})
    return () => { live = false }
  }, [])
  const libraryCode = (label: string): string | undefined => {
    const html = library?.modules[label]
    return html === undefined ? undefined : tokeniseModule(html, library!.tokens).trim()
  }
  // The code preview is shown in the first theme's colours.
  const firstTheme = settings.brandThemes?.[0]
  const previewColours = { ...(library?.tokens ?? {}), primary: firstTheme?.primary ?? '#134848', accent: firstTheme?.accent ?? '#fbaa96', tint01: firstTheme?.tint01, tint02: firstTheme?.tint02, tint03: firstTheme?.tint03 }

  const grouped = useMemo(() => {
    const filtered = filterCategory === 'all' ? modules : modules.filter((m) => resolveCategory(categories, m.category) === filterCategory)
    const map = new Map<string, HtmlModuleConfig[]>()
    for (const cat of categories) {
      const items = filtered.filter((m) => resolveCategory(categories, m.category) === cat.id)
      if (items.length > 0) map.set(cat.id, items)
    }
    return map
  }, [modules, filterCategory, categories])

  const saveCategories = (list: ModuleCategoryConfig[], moved?: HtmlModuleConfig[]) =>
    updateSettings({ moduleCategories: list, ...(moved ? { htmlModules: moved } : {}) })
  const labelOf = (id: string) => categories.find((c) => c.id === id)?.label ?? id
  const renameCategory = (id: string, label: string) => saveCategories(categories.map((c) => (c.id === id ? { ...c, label } : c)))
  // A new category goes before Other, which stays last.
  const addCategory = (label: string) => {
    const without = categories.filter((c) => c.id !== FALLBACK_CATEGORY)
    saveCategories([...without, { id: newCategoryId(categories, label), label }, ...categories.filter((c) => c.id === FALLBACK_CATEGORY)])
  }
  const moveCategory = (id: string, direction: -1 | 1) => {
    const list = [...categories]
    const from = list.findIndex((c) => c.id === id)
    const to = from + direction
    if (from < 0 || to < 0 || list[to]?.id === FALLBACK_CATEGORY || to >= list.length) return
    ;[list[from], list[to]] = [list[to], list[from]]
    saveCategories(list)
  }
  // Deleting a category moves its modules to Other, so none is lost.
  const removeCategory = (id: string) => {
    if (id === FALLBACK_CATEGORY) return
    saveCategories(categories.filter((c) => c.id !== id), modules.map((m) => (resolveCategory(categories, m.category) === id ? { ...m, category: FALLBACK_CATEGORY } : m)))
    if (filterCategory === id) setFilterCategory('all')
  }

  const startEdit = (mod: HtmlModuleConfig) => {
    setEditingId(mod.id)
    setDraft({ ...mod })
    setIsAdding(false)
    setCodeError(null)
    setFormError(null)
  }

  const startAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setDraft({ id: '', label: '', description: '', category: 'Content', enabled: true })
    setCodeError(null)
    setFormError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setCodeError(null)
    setFormError(null)
  }

  // The code is kept as written, without surrounding blank lines; a built-in module saved with none keeps the library's own.
  const withCode = (d: HtmlModuleConfig): HtmlModuleConfig => {
    const html = (d.html ?? '').trim()
    const { html: _drop, ...rest } = d
    return html ? { ...rest, html } : rest
  }

  const saveEdit = () => {
    if (!draft.label.trim()) { setFormError('Give the module a label.'); return }
    // Code that is still the library's own is not saved as an override: the module stays the library's, and follows it if it is updated.
    const unchanged = (draft.html ?? '').trim() !== '' && (draft.html ?? '').trim() === libraryCode(draft.label)
    const saving = unchanged ? { ...draft, html: undefined } : draft
    const problem = (saving.html ?? '').trim() ? validateModuleHtml(saving.html ?? '') : null
    setCodeError(problem)
    if (problem) return
    updateSettings({
      htmlModules: modules.map((m) => (m.id === editingId ? { ...withCode(saving), id: editingId } : m)),
    })
    setEditingId(null)
  }

  const saveNew = () => {
    if (!draft.label.trim()) { setFormError('Give the module a label.'); return }
    // The ID is only an internal key, so it follows the label unless one was typed.
    const id = draft.id.trim() || draft.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (!id) { setFormError('Give the module an ID using letters or numbers.'); return }
    if (modules.some((m) => m.id === id)) { setFormError(`A module with the ID "${id}" already exists. Choose a different ID.`); return }
    // A module with no code would never appear in the builder, so a new one needs it.
    const problem = validateModuleHtml(draft.html ?? '')
    setCodeError(problem)
    if (problem) return
    updateSettings({
      htmlModules: [...modules, withCode({ ...draft, id })],
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
        {categories.map((cat) => {
          const count = counts[cat.id] ?? 0
          if (count === 0) return null
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterCategory === cat.id
                  ? 'bg-brand-primary text-white dark:bg-brand-accent dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat.label} ({count})
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setManagingCategories((v) => !v)}
          aria-expanded={managingCategories}
          className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium text-brand-primary dark:text-brand-accent hover:underline"
        >
          {managingCategories ? 'Done' : 'Manage categories'}
        </button>
      </div>

      {managingCategories && (
        <ModuleCategoryManager categories={categories} counts={counts} onRename={renameCategory} onAdd={addCategory} onMove={moveCategory} onRemove={removeCategory} />
      )}

      {/* Add new module */}
      {isAdding && (
        <ModuleEditRow categories={categories} draft={draft} onChange={(d) => { setDraft(d); setCodeError(null); setFormError(null) }} formError={formError} onSave={saveNew} onCancel={cancelEdit} isNew codeError={codeError} previewColours={previewColours} />
      )}

      {/* Module list grouped by category */}
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">{labelOf(category)}</h4>
          <div className="space-y-0.5">
            {items.map((mod) => (
              <div key={mod.id}>
                {editingId === mod.id ? (
                  <ModuleEditRow categories={categories} draft={draft} onChange={(d) => { setDraft(d); setCodeError(null); setFormError(null) }} formError={formError} onSave={saveEdit} onCancel={cancelEdit} codeError={codeError} previewColours={previewColours} libraryCode={libraryCode(draft.label)} labelLocked={LIBRARY_MODULES.includes(draft.label)} />
                ) : (
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors ${!mod.enabled ? 'opacity-50' : ''}`}>
                    {/* Enable/disable toggle */}
                    <Switch size="sm" checked={mod.enabled} label={`${mod.enabled ? 'Disable' : 'Enable'} ${mod.label}`} onChange={() => toggleEnabled(mod.id)} />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{mod.label}</p>
                      <p className="text-xs text-gray-400 truncate">{mod.description}</p>
                    </div>

                    <span className="text-xs font-mono text-gray-400 hidden sm:block shrink-0">{mod.id}</span>

                    <div className={`flex items-center gap-1 transition-opacity shrink-0 ${deleteConfirmId === mod.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                      <button type="button" onClick={() => startEdit(mod)} className="p-1 text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {deleteConfirmId === mod.id ? (
                        <span role="group" aria-label={`Remove ${mod.label}?`} className="flex items-center gap-1 pl-1">
                          <button type="button" onClick={() => { removeModule(mod.id); setDeleteConfirmId(null) }} className="text-xs font-medium bg-red-600 text-white px-2 py-0.5 rounded-md hover:bg-red-700">
                            Delete
                          </button>
                          <button type="button" onClick={() => setDeleteConfirmId(null)} className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-0.5 hover:text-gray-700 dark:hover:text-gray-200">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirmId(mod.id)} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
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
  categories,
  draft,
  onChange,
  onSave,
  onCancel,
  isNew,
  codeError,
  formError,
  previewColours,
  libraryCode,
  labelLocked,
}: {
  categories: ModuleCategoryConfig[]
  draft: HtmlModuleConfig
  onChange: (d: HtmlModuleConfig) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
  codeError: string | null
  formError: string | null
  previewColours: ThemeColours
  /** The library's own code for this module, with variables for a theme's colours and images, when it is one of the library's */
  libraryCode?: string
  /** A library module keeps its name: that is how the builder and Settings know them to be the same module */
  labelLocked?: boolean
}) {
  const [showPreview, setShowPreview] = useState(false)
  // A library module shows its own code until it is changed; saving it unchanged keeps it the library's.
  const code = draft.html ?? libraryCode ?? ''
  const changed = libraryCode !== undefined && draft.html !== undefined && draft.html.trim() !== libraryCode
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
              placeholder="my-custom-module (optional)"
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
            disabled={labelLocked}
            title={labelLocked ? 'A library module keeps its name' : undefined}
            placeholder="Module display name"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
          <select
            value={resolveCategory(categories, draft.category)}
            onChange={(e) => onChange({ ...draft, category: e.target.value })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 dark:text-gray-100"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
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
        <p id="layout-icon-label" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Layout icon</p>
        <div role="radiogroup" aria-labelledby="layout-icon-label" className="flex flex-wrap gap-1.5">
          {[{ kind: '' as const, label: 'Auto' }, ...LAYOUT_ICONS].map((o) => {
            const selected = (draft.layoutIcon ?? '') === o.kind
            const named = describePickerModule(draft.label)
            return (
              <label key={o.kind || 'auto'} title={o.kind ? o.label : 'The icon the module\'s name suggests'} className={`flex flex-col items-center gap-1 cursor-pointer rounded-md border px-2 py-1.5 text-[11px] ${selected ? 'border-brand-primary dark:border-brand-accent ring-2 ring-brand-primary/30 text-gray-900 dark:text-gray-100' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                <input type="radio" name="layout-icon" aria-label={o.label} checked={selected} onChange={() => onChange({ ...draft, layoutIcon: o.kind || undefined })} className="sr-only" />
                {o.kind ? <ModuleThumb kind={o.kind} buttons={o.kind === 'buttons' ? 1 : 0} /> : <ModuleThumb kind={named.kind} buttons={named.buttons} />}
                {o.label}
              </label>
            )
          })}
        </div>
        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Shown beside the module in the Add module picker. Auto uses the icon its name suggests.</p>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Module code (HTML){isNew && <span className="text-red-500"> *</span>}
          </span>
          <span className="flex items-center gap-3">
            {changed && (
              <button type="button" onClick={() => onChange({ ...draft, html: undefined })} className="text-xs text-brand-primary dark:text-brand-accent hover:underline">
                Reset to the library&rsquo;s code
              </button>
            )}
            <button type="button" onClick={() => setShowPreview((v) => !v)} className="text-xs text-brand-primary dark:text-brand-accent hover:underline">
              {showPreview ? 'Hide preview' : 'Show preview'}
            </button>
          </span>
        </div>
        <LazyCodeEditor
          id="module-code"
          label="Module code"
          value={code}
          onChange={(v) => onChange({ ...draft, html: v })}
          invalid={!!codeError}
          variables={codeVariables('module')}
          previewDoc={(c) => modulePreviewDoc(c, previewColours)}
          placeholder={isNew ? '<tr>\n  <td bgcolor="{{primary}}" style="padding: 30px 40px;">\n    <p pardot-region="paragraph" style="color: #ffffff;">Your text</p>\n  </td>\n</tr>' : 'Leave empty to keep the library\'s own code for this module'}
        />
        {codeError && <p role="alert" className="text-xs text-red-600 mt-1">{codeError}</p>}
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          A table row (<code>&lt;tr&gt;…&lt;/tr&gt;</code>). Add <code>pardot-region</code> to text and buttons you want editable in the builder. Use
          {' '}<code>{'{{primary}}'}</code>, <code>{'{{accent}}'}</code> and <code>{'{{tint01}}'}</code>–<code>{'{{tint03}}'}</code> for the theme&rsquo;s colours so one module suits every theme. Use <code>{'{{text}}'}</code> for text that must be light on a dark theme and dark on a light one.
          {libraryCode !== undefined && ' This is the library\'s own code for the module, with variables in place of a theme\'s colours and images. Edit it and save to change the module in every theme.'}
        </p>
        {showPreview && (
          <iframe
            title="Module preview"
            sandbox=""
            className="mt-2 w-full h-56 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-white"
            srcDoc={modulePreviewDoc(code, previewColours)}
          />
        )}
      </div>

      {formError && <p role="alert" className="text-xs text-red-600 mb-2">{formError}</p>}
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
