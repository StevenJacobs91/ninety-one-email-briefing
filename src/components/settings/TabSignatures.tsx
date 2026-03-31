import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '../../contexts/SettingsContext'
import type { SignoffEntry } from '../../types/settings.types'

interface SignoffFormState {
  name: string
  text: string
  isDefault: boolean
}

const EMPTY_FORM: SignoffFormState = { name: '', text: '', isDefault: false }

function SignaturePreview({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 italic">No preview yet — enter signature text above.</p>
  }
  return (
    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-ni-body">
      {text}
    </div>
  )
}

function SignoffForm({
  form,
  onChange,
  onSave,
  onCancel,
  saveLabel,
  canSetDefault,
}: {
  form: SignoffFormState
  onChange: (patch: Partial<SignoffFormState>) => void
  onSave: () => void
  onCancel: () => void
  saveLabel: string
  canSetDefault: boolean
}) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Natalie Phillips – Deputy MD"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            autoFocus
          />
        </div>
        {canSetDefault && (
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                role="checkbox"
                aria-checked={form.isDefault}
                tabIndex={0}
                onClick={() => onChange({ isDefault: !form.isDefault })}
                onKeyDown={(e) => e.key === ' ' && onChange({ isDefault: !form.isDefault })}
                className={`w-9 h-5 rounded-full flex items-center transition-colors ${form.isDefault ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${form.isDefault ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Set as default</span>
            </label>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Signature Text <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="text-xs text-brand-primary dark:text-brand-accent hover:underline"
          >
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
        </div>
        <textarea
          value={form.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={5}
          placeholder={'Kind regards,\n\nNatalie Phillips\nDeputy MD, Ninety One'}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm font-ni-body focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-y"
        />
        {showPreview && (
          <div className="mt-2 p-3 rounded-md border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Preview</p>
            <SignaturePreview text={form.text} />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={!form.name.trim() || !form.text.trim()}
          className="px-4 py-1.5 text-xs bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover transition-colors disabled:opacity-40"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function TabSignatures() {
  const { settings, updateSettings } = useSettings()
  const signoffs: SignoffEntry[] = settings.signoffs ?? []

  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState<SignoffFormState>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<SignoffFormState>(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function saveSignoffs(next: SignoffEntry[]) {
    updateSettings({ signoffs: next })
  }

  function handleAdd() {
    if (!newForm.name.trim() || !newForm.text.trim()) return
    let next = [...signoffs]
    if (newForm.isDefault) {
      next = next.map((s) => ({ ...s, isDefault: false }))
    }
    next.push({ id: uuidv4(), name: newForm.name.trim(), text: newForm.text.trim(), isDefault: newForm.isDefault })
    saveSignoffs(next)
    setNewForm(EMPTY_FORM)
    setAddingNew(false)
  }

  function handleEditStart(s: SignoffEntry) {
    setEditingId(s.id)
    setEditForm({ name: s.name, text: s.text, isDefault: s.isDefault })
  }

  function handleEditSave() {
    if (!editForm.name.trim() || !editForm.text.trim()) return
    let next = signoffs.map((s) => {
      if (s.id === editingId) {
        return { ...s, name: editForm.name.trim(), text: editForm.text.trim(), isDefault: editForm.isDefault }
      }
      return editForm.isDefault ? { ...s, isDefault: false } : s
    })
    saveSignoffs(next)
    setEditingId(null)
  }

  function handleSetDefault(id: string) {
    saveSignoffs(signoffs.map((s) => ({ ...s, isDefault: s.id === id })))
  }

  function handleDelete(id: string) {
    saveSignoffs(signoffs.filter((s) => s.id !== id))
    setDeleteConfirmId(null)
  }

  const defaultEntry = signoffs.find((s) => s.isDefault)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Sign-off signatures appear in the Content step. The default signature is pre-selected. Requesters can switch between signatures or write a custom one.
        </p>
        {!addingNew && (
          <button
            type="button"
            onClick={() => { setAddingNew(true); setNewForm(EMPTY_FORM) }}
            className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors shrink-0"
          >
            + Add Signature
          </button>
        )}
      </div>

      {/* New signature form */}
      {addingNew && (
        <div className="border border-brand-primary/20 dark:border-brand-accent/20 rounded-lg p-4 bg-brand-bg-panel/60 dark:bg-gray-800/60">
          <p className="text-xs font-medium text-brand-primary dark:text-brand-accent uppercase tracking-wider mb-4">New Signature</p>
          <SignoffForm
            form={newForm}
            onChange={(patch) => setNewForm((f) => ({ ...f, ...patch }))}
            onSave={handleAdd}
            onCancel={() => setAddingNew(false)}
            saveLabel="Save Signature"
            canSetDefault
          />
        </div>
      )}

      {/* Empty state */}
      {signoffs.length === 0 && !addingNew && (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-8">
          No signatures yet. Add your first signature above.
        </p>
      )}

      {/* Signature list */}
      <div className="space-y-2">
        {signoffs.map((s) => (
          <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {editingId === s.id ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs font-medium text-brand-primary dark:text-brand-accent uppercase tracking-wider mb-4">Edit Signature</p>
                <SignoffForm
                  form={editForm}
                  onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
                  onSave={handleEditSave}
                  onCancel={() => setEditingId(null)}
                  saveLabel="Save Changes"
                  canSetDefault
                />
              </div>
            ) : deleteConfirmId === s.id ? (
              <div className="px-4 py-3 flex items-center justify-between gap-4 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-700 dark:text-red-400">Delete <strong>{s.name}</strong>?</p>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => handleDelete(s.id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Delete</button>
                  <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{s.name}</p>
                      {s.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-primary/10 dark:bg-brand-primary/30 text-brand-primary dark:text-brand-accent font-medium shrink-0">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap line-clamp-2 font-ni-body">
                      {s.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!s.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(s.id)}
                        title="Set as default"
                        className="text-xs text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent px-2 py-1 rounded transition-colors"
                      >
                        Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEditStart(s)}
                      className="text-xs text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent px-2 py-1 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(s.id)}
                      className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Default reminder */}
      {signoffs.length > 0 && !defaultEntry && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md px-3 py-2">
          No default signature is set. The first signature will be pre-selected in the form.
        </p>
      )}
    </div>
  )
}
