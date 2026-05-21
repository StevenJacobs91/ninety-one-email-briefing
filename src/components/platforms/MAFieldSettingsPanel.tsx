import { useState } from 'react'
import { UseMAFieldConfigReturn } from '../../hooks/useMAFieldConfig'
import { MAFieldConfig, MASectionConfig, DYNAMIC_LIST_SECTIONS } from '../../lib/maFieldConfig'

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelView =
  | { type: 'section-list' }
  | { type: 'section-fields'; sectionId: string }
  | { type: 'field-editor'; fieldId: string }

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'indigo' | 'amber' }) {
  const cls = {
    gray: 'bg-gray-100 text-gray-500',
    indigo: 'bg-indigo-100 text-indigo-700',
    amber: 'bg-amber-100 text-amber-700',
  }[color]
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  )
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>
  )
}

function PanelInput({
  value, onChange, placeholder, mono,
}: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] ${mono ? 'font-mono' : ''}`}
    />
  )
}

function PanelTextarea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1]"
    />
  )
}

function PanelSelect({
  value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1]"
    >
      {children}
    </select>
  )
}

function PanelToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-0.5">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-8 h-4.5 h-[18px] rounded-full transition-colors shrink-0 ${value ? 'bg-[#6366f1]' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-3' : ''}`} />
      </button>
      <span className="text-xs text-gray-700">{label}</span>
    </label>
  )
}

function Divider() {
  return <div className="h-px bg-gray-100 my-3" />
}

function IconBtn({
  onClick, title, disabled, children, danger,
}: { onClick: () => void; title?: string; disabled?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors disabled:opacity-30 ${
        danger ? 'hover:bg-red-50 text-red-400 hover:text-red-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </button>
  )
}

// ── Field Editor ──────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  config,
  onBack,
}: {
  field: MAFieldConfig
  config: UseMAFieldConfigReturn
  onBack: () => void
}) {
  const { updateField, deleteField, addOption, removeOption, updateOption, FIELD_TYPES_META, EXPORT_FORMATS_META, store } = config
  const [newOptionLabel, setNewOptionLabel] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    deleteField(field.id)
    onBack()
  }

  const allSections = store.sections.map((s) => ({ id: s.id, title: s.title }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
        <button type="button" onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-800 truncate flex-1">{field.label}</span>
        {field.isBuiltIn && <Badge color="indigo">Built-in</Badge>}
        {!field.isBuiltIn && <Badge color="amber">Custom</Badge>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Label */}
        <div>
          <PanelLabel>Label</PanelLabel>
          <PanelInput value={field.label} onChange={(v) => updateField(field.id, { label: v })} placeholder="Field label" />
        </div>

        {/* Hint */}
        <div>
          <PanelLabel>Hint / Helper text</PanelLabel>
          <PanelInput value={field.hint} onChange={(v) => updateField(field.id, { hint: v })} placeholder="Short description under the label" />
        </div>

        {/* Placeholder */}
        <div>
          <PanelLabel>Placeholder text</PanelLabel>
          <PanelInput value={field.placeholder} onChange={(v) => updateField(field.id, { placeholder: v })} placeholder="Input placeholder" />
        </div>

        {/* Field Type — custom only */}
        {!field.isBuiltIn && (
          <div>
            <PanelLabel>Field Type</PanelLabel>
            <PanelSelect
              value={field.fieldType}
              onChange={(v) => updateField(field.id, { fieldType: v as MAFieldConfig['fieldType'] })}
            >
              {FIELD_TYPES_META.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </PanelSelect>
          </div>
        )}

        {/* Textarea rows */}
        {field.fieldType === 'textarea' && (
          <div>
            <PanelLabel>Rows</PanelLabel>
            <PanelSelect value={String(field.rows)} onChange={(v) => updateField(field.id, { rows: Number(v) })}>
              {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>{n} rows</option>
              ))}
            </PanelSelect>
          </div>
        )}

        {/* Mono font for text / textarea */}
        {(field.fieldType === 'text' || field.fieldType === 'textarea') && (
          <PanelToggle value={field.monoFont} onChange={(v) => updateField(field.id, { monoFont: v })} label="Monospace font" />
        )}

        {/* Options — for select / multi-chips */}
        {(field.fieldType === 'select' || field.fieldType === 'multi-chips') && (
          <div>
            <PanelLabel>Options</PanelLabel>
            <div className="space-y-1.5 mb-2">
              {field.options.map((opt) => (
                <div key={opt.value} className="flex items-center gap-1.5 group">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(field.id, opt.value, { label: e.target.value })}
                    className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#6366f1]/25 focus:border-[#6366f1]"
                  />
                  <span className="text-[10px] text-gray-400 font-mono shrink-0 w-20 truncate">{opt.value}</span>
                  <IconBtn onClick={() => removeOption(field.id, opt.value)} danger title="Remove option">×</IconBtn>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newOptionLabel.trim()) {
                    const slug = newOptionLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    addOption(field.id, { value: slug, label: newOptionLabel.trim() })
                    setNewOptionLabel('')
                  }
                }}
                placeholder="Add option (Enter to add)"
                className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#6366f1]/25 focus:border-[#6366f1]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newOptionLabel.trim()) return
                  const slug = newOptionLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  addOption(field.id, { value: slug, label: newOptionLabel.trim() })
                  setNewOptionLabel('')
                }}
                className="px-2 py-1 bg-[#6366f1] text-white text-xs rounded hover:bg-[#4f46e5] transition-colors"
              >+</button>
            </div>
          </div>
        )}

        <Divider />

        {/* Toggles: required / visible */}
        <div className="space-y-2">
          <PanelToggle value={field.required} onChange={(v) => updateField(field.id, { required: v })} label="Required field" />
          <PanelToggle value={field.visible} onChange={(v) => updateField(field.id, { visible: v })} label="Visible in form" />
        </div>

        <Divider />

        {/* Export mapping */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">PRD Export Mapping</p>
          <div className="space-y-3">
            <div>
              <PanelLabel>Export label</PanelLabel>
              <PanelInput
                value={field.exportLabel}
                onChange={(v) => updateField(field.id, { exportLabel: v })}
                placeholder="Label used in PRD output"
              />
            </div>
            <div>
              <PanelLabel>Export format</PanelLabel>
              <PanelSelect value={field.exportFormat} onChange={(v) => updateField(field.id, { exportFormat: v as MAFieldConfig['exportFormat'] })}>
                {EXPORT_FORMATS_META.map((f) => (
                  <option key={f.value} value={f.value}>{f.label} — {f.example}</option>
                ))}
              </PanelSelect>
            </div>
            <div>
              <PanelLabel>PRD section</PanelLabel>
              <PanelInput
                value={field.exportSection}
                onChange={(v) => updateField(field.id, { exportSection: v })}
                placeholder="e.g. 1. Technical Context"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Which PRD heading this appears under</p>
            </div>
          </div>
        </div>

        {/* Section assignment — custom only */}
        {!field.isBuiltIn && (
          <>
            <Divider />
            <div>
              <PanelLabel>Section</PanelLabel>
              <PanelSelect value={field.sectionId} onChange={(v) => updateField(field.id, { sectionId: v })}>
                {allSections.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </PanelSelect>
            </div>
          </>
        )}

        {/* Delete — custom only */}
        {!field.isBuiltIn && (
          <>
            <Divider />
            <button
              type="button"
              onClick={handleDelete}
              className={`w-full py-1.5 rounded text-xs font-medium transition-colors ${
                confirmDelete
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'border border-red-200 text-red-500 hover:bg-red-50'
              }`}
            >
              {confirmDelete ? 'Click again to confirm delete' : 'Delete field'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Section Fields View ───────────────────────────────────────────────────────

function SectionFieldsView({
  section,
  config,
  onBack,
  onEditField,
}: {
  section: MASectionConfig
  config: UseMAFieldConfigReturn
  onBack: () => void
  onEditField: (fieldId: string) => void
}) {
  const { getSectionFields, moveField, addField, updateSection } = config
  const fields = getSectionFields(section.id)
  const isDynamicSection = DYNAMIC_LIST_SECTIONS.has(section.id)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
        <button type="button" onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{section.title}</p>
          <p className="text-[10px] text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''}</p>
        </div>
        <PanelToggle value={section.visible} onChange={(v) => updateSection(section.id, { visible: v })} label="" />
      </div>

      {/* Section title/description editing */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-2 bg-gray-50/50">
        <div>
          <PanelLabel>Section title</PanelLabel>
          <PanelInput value={section.title} onChange={(v) => updateSection(section.id, { title: v })} />
        </div>
        <div>
          <PanelLabel>Description</PanelLabel>
          <PanelTextarea value={section.description} onChange={(v) => updateSection(section.id, { description: v })} rows={2} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {isDynamicSection && (
          <div className="text-[10px] text-amber-600 bg-amber-50 rounded px-2.5 py-2 mb-2 border border-amber-100">
            This section uses a dynamic list renderer. Custom fields will appear below the built-in list.
          </div>
        )}

        {fields.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No fields in this section yet.</p>
        )}

        {fields.map((field, idx) => (
          <div key={field.id}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-gray-100 bg-white hover:border-[#6366f1]/30 group transition-colors">
            {/* Drag handle / type indicator */}
            <div className="w-1.5 h-6 rounded-full shrink-0" style={{
              background: field.isBuiltIn ? '#6366f1' : '#f59e0b',
              opacity: 0.6,
            }} />

            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${field.visible ? 'text-gray-800' : 'text-gray-400'}`}>
                {field.label}
              </p>
              <p className="text-[10px] text-gray-400">{field.fieldType}{field.required ? ' · required' : ''}</p>
            </div>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconBtn onClick={() => moveField(field.id, 'up')} disabled={idx === 0} title="Move up">↑</IconBtn>
              <IconBtn onClick={() => moveField(field.id, 'down')} disabled={idx === fields.length - 1} title="Move down">↓</IconBtn>
              <IconBtn onClick={() => onEditField(field.id)} title="Edit">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </IconBtn>
            </div>
          </div>
        ))}
      </div>

      {/* Add custom field */}
      <div className="px-4 py-3 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => {
            const id = addField(section.id)
            onEditField(id)
          }}
          className="w-full py-2 border border-dashed border-[#6366f1]/40 text-[#6366f1] text-xs font-medium rounded-lg hover:bg-[#6366f1]/5 transition-colors"
        >
          + Add custom field
        </button>
      </div>
    </div>
  )
}

// ── Section List (root view) ──────────────────────────────────────────────────

function SectionListView({
  config,
  onSelectSection,
}: {
  config: UseMAFieldConfigReturn
  onSelectSection: (sectionId: string) => void
}) {
  const { getSortedSections, getSectionFields, moveSection, resetToDefaults } = config
  const [confirmReset, setConfirmReset] = useState(false)
  const sections = getSortedSections()

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <p className="text-sm font-semibold text-gray-800">Form Configuration</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Manage sections and fields</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sections.map((section, idx) => {
          const fields = getSectionFields(section.id)
          const customCount = fields.filter((f) => !f.isBuiltIn).length
          return (
            <div key={section.id} className="group">
              <button
                type="button"
                onClick={() => onSelectSection(section.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <span className={`w-5 h-5 rounded text-[9px] flex items-center justify-center font-bold shrink-0 ${
                  section.visible
                    ? 'bg-[#6366f1] text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${section.visible ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {section.title}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {fields.length} field{fields.length !== 1 ? 's' : ''}
                    {customCount > 0 && ` · ${customCount} custom`}
                  </p>
                </div>
                <div
                  className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconBtn
                    onClick={() => moveSection(section.id, 'up')}
                    disabled={idx === 0}
                    title="Move up"
                  >↑</IconBtn>
                  <IconBtn
                    onClick={() => moveSection(section.id, 'down')}
                    disabled={idx === sections.length - 1}
                    title="Move down"
                  >↓</IconBtn>
                </div>
                <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-[#6366f1] opacity-60" />
          <span className="text-[10px] text-gray-500">Built-in field — metadata editable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-amber-400 opacity-60" />
          <span className="text-[10px] text-gray-500">Custom field — fully configurable</span>
        </div>
      </div>

      {/* Reset */}
      <div className="px-4 pb-4 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (!confirmReset) { setConfirmReset(true); return }
            resetToDefaults()
            setConfirmReset(false)
          }}
          className={`w-full py-1.5 rounded text-[10px] font-medium transition-colors ${
            confirmReset
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
          }`}
        >
          {confirmReset ? 'Click again to reset all fields' : 'Reset to defaults'}
        </button>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface MAFieldSettingsPanelProps {
  config: UseMAFieldConfigReturn
  onClose: () => void
}

export function MAFieldSettingsPanel({ config, onClose }: MAFieldSettingsPanelProps) {
  const [view, setView] = useState<PanelView>({ type: 'section-list' })

  const { store } = config

  function getSection(sectionId: string) {
    return store.sections.find((s) => s.id === sectionId)
  }

  function getField(fieldId: string) {
    return store.fields.find((f) => f.id === fieldId)
  }

  function renderView() {
    if (view.type === 'section-list') {
      return (
        <SectionListView
          config={config}
          onSelectSection={(sectionId) => setView({ type: 'section-fields', sectionId })}
        />
      )
    }

    if (view.type === 'section-fields') {
      const section = getSection(view.sectionId)
      if (!section) return null
      return (
        <SectionFieldsView
          section={section}
          config={config}
          onBack={() => setView({ type: 'section-list' })}
          onEditField={(fieldId) => setView({ type: 'field-editor', fieldId })}
        />
      )
    }

    if (view.type === 'field-editor') {
      const field = getField(view.fieldId)
      if (!field) return null
      return (
        <FieldEditor
          field={field}
          config={config}
          onBack={() => setView({ type: 'section-fields', sectionId: field.sectionId })}
        />
      )
    }

    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel slide-over */}
      <div className="fixed top-0 right-0 z-[70] h-full w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in-right">
        {/* Header bar */}
        <div className="bg-[#4f46e5] px-4 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-white text-xs font-semibold tracking-wide">Field Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.2s ease-out forwards; }
      `}</style>
    </>
  )
}
