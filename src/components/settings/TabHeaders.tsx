import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '../../contexts/SettingsContext'
import type { HeaderTypeConfig, HeaderTypeAssets, BrandThemeConfig } from '../../types/settings.types'

// ─── Header diagram previews ─────────────────────────────────

function HeaderDiagram({ type }: { type: HeaderTypeConfig }) {
  const isBgImage = type.requiresHeroImage
  const isSlim = type.id.startsWith('slim')
  const has35yr = type.id.includes('35yr')
  const height = isSlim ? 40 : 56

  return (
    <div
      className="w-full rounded overflow-hidden border border-white/10 relative"
      style={{
        height,
        background: isBgImage
          ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 60%, #4a5568 100%)'
          : '#134848',
      }}
    >
      {/* Photo texture hint for bg image type */}
      {isBgImage && (
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,.05) 4px, rgba(255,255,255,.05) 8px)' }}
        />
      )}

      {/* Left: logo + text */}
      <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between py-1.5 w-[56%]">
        {/* Logo box */}
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 bg-white/80 rounded-sm" />
          {has35yr && (
            <div className="w-4 h-3 rounded-sm flex items-center justify-center" style={{ background: '#fcaa28' }}>
              <span className="text-[5px] font-bold text-white leading-none">35</span>
            </div>
          )}
        </div>
        {/* Headline + sub-headline */}
        <div className="space-y-0.5">
          <div className="h-1.5 bg-brand-accent/80 rounded-sm w-3/4" />
          <div className="h-1 bg-white/40 rounded-sm w-1/2" />
        </div>
      </div>

      {/* Right: stripes */}
      <div className="absolute right-0 top-0 bottom-0 w-[32%] overflow-hidden">
        {isSlim ? (
          // Slim: narrower stripes
          <div className="absolute inset-0 flex gap-0.5 items-stretch">
            {[0.6, 0.9, 1.0, 0.7].map((opacity, i) => (
              <div key={i} className="flex-1" style={{ background: `rgba(251,170,150,${opacity})` }} />
            ))}
          </div>
        ) : (
          // Standard: full stripes
          <div className="absolute inset-0 flex gap-0.5 items-stretch">
            {[0.5, 0.8, 1.0, 0.6].map((opacity, i) => (
              <div key={i} className="flex-1" style={{ background: `rgba(251,170,150,${opacity})` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Type badge ───────────────────────────────────────────────

function TypeBadge({ children, colour }: { children: React.ReactNode; colour: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${colour}`}>
      {children}
    </span>
  )
}

// ─── Asset field row ──────────────────────────────────────────

function AssetField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
      />
    </div>
  )
}

// ─── Header type editor card ──────────────────────────────────

function HeaderTypeCard({
  headerType,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onSetDefault,
  brandThemes,
}: {
  headerType: HeaderTypeConfig
  isExpanded: boolean
  onToggle: () => void
  onChange: (updated: HeaderTypeConfig) => void
  onDelete: () => void
  onSetDefault: () => void
  brandThemes: BrandThemeConfig[]
}) {
  const [showDelete, setShowDelete] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const themeIds = headerType.themeIds ?? []

  function toggleTheme(themeId: string) {
    const next = themeIds.includes(themeId)
      ? themeIds.filter((id) => id !== themeId)
      : [...themeIds, themeId]
    onChange({ ...headerType, themeIds: next })
  }

  function updateAssets(patch: Partial<HeaderTypeAssets>) {
    onChange({ ...headerType, assets: { ...headerType.assets, ...patch } })
  }

  function copySnippet() {
    if (!headerType.htmlSnippet) return
    navigator.clipboard.writeText(headerType.htmlSnippet).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${
      isExpanded
        ? 'border-brand-primary/40 dark:border-brand-accent/40 bg-white dark:bg-gray-800'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40'
    }`}>
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        aria-expanded={isExpanded}
      >
        {/* Mini preview */}
        <div className="w-24 shrink-0">
          <HeaderDiagram type={headerType} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{headerType.label}</span>
            {headerType.isDefault && (
              <TypeBadge colour="bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-accent">
                Default
              </TypeBadge>
            )}
            {headerType.requiresHeroImage && (
              <TypeBadge colour="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Hero image
              </TypeBadge>
            )}
            {headerType.builtIn && (
              <TypeBadge colour="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                Built-in
              </TypeBadge>
            )}
            {!headerType.enabled && (
              <TypeBadge colour="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                Disabled
              </TypeBadge>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{headerType.description}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-5">
          {/* Label + enabled */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={headerType.label}
                onChange={(e) => onChange({ ...headerType, label: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={headerType.description}
                onChange={(e) => onChange({ ...headerType, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={headerType.enabled}
                onChange={(e) => onChange({ ...headerType, enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-brand-primary"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Enabled</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={headerType.requiresHeroImage}
                onChange={(e) => onChange({ ...headerType, requiresHeroImage: e.target.checked })}
                className="w-4 h-4 rounded accent-brand-primary"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Requires hero image</span>
              <span className="text-[10px] text-gray-400">(shows hero image picker in form)</span>
            </label>
            {!headerType.isDefault && (
              <button
                type="button"
                onClick={onSetDefault}
                className="text-xs text-brand-primary dark:text-brand-accent hover:underline font-medium"
              >
                Set as default
              </button>
            )}
          </div>

          {/* Asset URLs */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
              Asset URLs
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AssetField
                label="Logo URL"
                hint="https://… (overrides theme default)"
                value={headerType.assets.logoUrl ?? ''}
                onChange={(v) => updateAssets({ logoUrl: v || undefined })}
              />
              <AssetField
                label="Standard Stripe URL"
                hint="https://… (200×234 px)"
                value={headerType.assets.stripeUrl ?? ''}
                onChange={(v) => updateAssets({ stripeUrl: v || undefined })}
              />
              <AssetField
                label="Slim Stripe URL"
                hint="https://… (slim variant stripe)"
                value={headerType.assets.slimStripeUrl ?? ''}
                onChange={(v) => updateAssets({ slimStripeUrl: v || undefined })}
              />
              <AssetField
                label="35-Year Graphic URL"
                hint="https://… (anniversary badge/graphic)"
                value={headerType.assets.thirtyFiveYearGraphicUrl ?? ''}
                onChange={(v) => updateAssets({ thirtyFiveYearGraphicUrl: v || undefined })}
              />
            </div>
          </div>

          {/* HTML Snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                HTML Snippet
              </p>
              {headerType.htmlSnippet && (
                <button
                  type="button"
                  onClick={copySnippet}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent transition-colors"
                >
                  {codeCopied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-green-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">
              Paste the HTML code for this header type. Used by the email producer as a template reference.
            </p>
            <textarea
              value={headerType.htmlSnippet}
              onChange={(e) => onChange({ ...headerType, htmlSnippet: e.target.value })}
              rows={10}
              placeholder={'<!-- Paste the HTML snippet for this header type here -->\n<table>\n  ...\n</table>'}
              spellCheck={false}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-950 dark:bg-gray-950 px-3 py-2.5 text-xs text-green-400 font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary resize-y"
            />
            {headerType.htmlSnippet && (
              <p className="text-[10px] text-gray-400 mt-1">
                {headerType.htmlSnippet.split('\n').length} lines · {headerType.htmlSnippet.length.toLocaleString()} chars
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Internal notes
            </label>
            <textarea
              value={headerType.notes}
              onChange={(e) => onChange({ ...headerType, notes: e.target.value })}
              rows={2}
              placeholder="Usage guidance, special instructions, or context for the email producer…"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary resize-y"
            />
          </div>

          {/* Compatible Themes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Compatible Themes
              </p>
              {themeIds.length === 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                  All themes
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange({ ...headerType, themeIds: [] })}
                  className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline"
                >
                  Clear (use all themes)
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">
              Select the brand themes this header type is designed for. When a theme is selected in the brief form,
              only compatible header types will be shown. Leave all unselected to make this header available for every theme.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {brandThemes.map((theme) => {
                const selected = themeIds.includes(theme.id)
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => toggleTheme(theme.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                      selected
                        ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/40'
                    }`}
                  >
                    {/* Colour swatch: primary circle + accent dot */}
                    <span className="relative shrink-0 w-5 h-5">
                      <span
                        className="block w-5 h-5 rounded-full border border-black/10"
                        style={{ background: theme.primary }}
                      />
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800"
                        style={{ background: theme.accent }}
                      />
                    </span>
                    <span className={`text-[10px] font-medium leading-tight truncate ${
                      selected
                        ? 'text-brand-primary dark:text-brand-accent'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {theme.label}
                    </span>
                    {selected && (
                      <svg
                        width="10" height="10" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3"
                        strokeLinecap="round" strokeLinejoin="round"
                        className="ml-auto shrink-0 text-brand-primary dark:text-brand-accent"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          {!headerType.builtIn && (
            <div className="flex items-center justify-end pt-1 border-t border-gray-100 dark:border-gray-700">
              {showDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Delete this header type?</span>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="text-xs text-red-600 dark:text-red-400 font-medium hover:underline"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDelete(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete type
                </button>
              )}
            </div>
          )}
          {headerType.builtIn && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Built-in type — can be edited but not deleted.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── New header type form ─────────────────────────────────────

function NewHeaderTypeForm({
  onSave,
  onCancel,
}: {
  onSave: (h: HeaderTypeConfig) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [requiresHeroImage, setRequiresHeroImage] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    onSave({
      id: uuidv4(),
      label: label.trim(),
      description: description.trim(),
      requiresHeroImage,
      isDefault: false,
      builtIn: false,
      enabled: true,
      htmlSnippet: '',
      assets: {},
      notes: '',
      themeIds: [],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-brand-primary/5 dark:bg-brand-primary/10 rounded-xl border border-brand-primary/20 dark:border-brand-accent/20 p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">New Header Type</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Event Header"
            autoFocus
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this header style"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={requiresHeroImage}
          onChange={(e) => setRequiresHeroImage(e.target.checked)}
          className="w-4 h-4 rounded accent-brand-primary"
        />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Requires hero image</span>
      </label>
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={!label.trim()}
          className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Add header type
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── TabHeaders ───────────────────────────────────────────────

export function TabHeaders() {
  const { settings, updateSettings } = useSettings()
  const headers = settings.headers ?? []
  const brandThemes = settings.brandThemes ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  function handleChange(updated: HeaderTypeConfig) {
    updateSettings({ headers: headers.map((h) => h.id === updated.id ? updated : h) })
  }

  function handleDelete(id: string) {
    updateSettings({ headers: headers.filter((h) => h.id !== id) })
    if (expandedId === id) setExpandedId(null)
  }

  function handleSetDefault(id: string) {
    updateSettings({ headers: headers.map((h) => ({ ...h, isDefault: h.id === id })) })
  }

  function handleAdd(newType: HeaderTypeConfig) {
    updateSettings({ headers: [...headers, newType] })
    setShowNewForm(false)
    setExpandedId(newType.id)
  }

  const enabledCount = headers.filter((h) => h.enabled).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Header Types</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {headers.length} type{headers.length !== 1 ? 's' : ''} · {enabledCount} enabled. Configure header layouts, paste HTML snippets, and manage asset URLs.
          </p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add type
          </button>
        )}
      </div>

      {/* New type form */}
      {showNewForm && (
        <NewHeaderTypeForm onSave={handleAdd} onCancel={() => setShowNewForm(false)} />
      )}

      {/* Info panel */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-4 py-3 flex items-start gap-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
          Each header type appears in the <strong>Header type</strong> selector on the Content step of the brief form. Expand a type to paste its HTML snippet, set asset URLs (logo, stripes, 35-year graphic), and add usage notes for the production team. Changes are saved automatically.
        </p>
      </div>

      {/* Type list */}
      <div className="space-y-2">
        {headers.map((h) => (
          <HeaderTypeCard
            key={h.id}
            headerType={h}
            isExpanded={expandedId === h.id}
            onToggle={() => setExpandedId(expandedId === h.id ? null : h.id)}
            onChange={handleChange}
            onDelete={() => handleDelete(h.id)}
            onSetDefault={() => handleSetDefault(h.id)}
            brandThemes={brandThemes}
          />
        ))}
      </div>

      {headers.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-sm text-gray-400 dark:text-gray-500">No header types configured.</p>
        </div>
      )}
    </div>
  )
}
