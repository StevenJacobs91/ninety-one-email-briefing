import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '../../contexts/SettingsContext'
import type { GreetingConfig } from '../../types/settings.types'

const EMPTY_GREETING: Omit<GreetingConfig, 'id'> = {
  label: '',
  value: '',
  isDefault: false,
}

export function TabGreetings() {
  const { settings, updateSettings } = useSettings()
  const greetings: GreetingConfig[] = settings.greetings ?? []

  const [editing, setEditing] = useState<GreetingConfig | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  function handleAdd() {
    setEditing({ id: uuidv4(), ...EMPTY_GREETING })
    setIsNew(true)
  }

  function handleEdit(g: GreetingConfig) {
    setEditing({ ...g })
    setIsNew(false)
  }

  function handleSave() {
    if (!editing) return
    const updated = isNew
      ? [...greetings, editing]
      : greetings.map((g) => (g.id === editing.id ? editing : g))
    updateSettings({ greetings: updated })
    setEditing(null)
  }

  function handleDelete(id: string) {
    updateSettings({ greetings: greetings.filter((g) => g.id !== id) })
    setDeleteConfirm(null)
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary'

  if (editing) {
    return (
      <div className="space-y-4 max-w-lg">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {isNew ? 'New Greeting' : 'Edit Greeting'}
          </h3>
        </div>

        {/* Label */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
            Display Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editing.label}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            placeholder="e.g. Standard SA — Dear Adviser"
            className={inputCls}
            autoFocus
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Shown in the greeting selector dropdown.</p>
        </div>

        {/* Value */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
            Greeting Text <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            placeholder="e.g. Dear {{Recipient.FirstName}},"
            className={inputCls}
          />
          <p className="text-[10px] text-gray-400 mt-0.5">
            Use Pardot HML merge fields like{' '}
            <code className="font-mono bg-gray-100 dark:bg-gray-700 px-0.5 rounded">{'{{Recipient.FirstName}}'}</code>,{' '}
            <code className="font-mono bg-gray-100 dark:bg-gray-700 px-0.5 rounded">{'{{Recipient.LastName}}'}</code>,{' '}
            <code className="font-mono bg-gray-100 dark:bg-gray-700 px-0.5 rounded">{'{{Recipient.Salutation}}'}</code>.
          </p>
        </div>

        {/* Preview */}
        {editing.value && (
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-md px-4 py-3 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">Preview</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">{editing.value}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={!editing.label.trim() || !editing.value.trim()}
            className="px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isNew ? 'Add Greeting' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {greetings.length} greeting{greetings.length !== 1 ? 's' : ''} configured
        </p>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Greeting
        </button>
      </div>

      {greetings.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm">No greetings configured</p>
          <p className="text-xs mt-1">Add greetings to make them available in the Content step.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {greetings.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{g.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic truncate">&ldquo;{g.value}&rdquo;</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleEdit(g)}
                  className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Edit"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                {deleteConfirm === g.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(g.id)}
                      className="px-2 py-1 text-[10px] font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 text-[10px] text-gray-500 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(g.id)}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pardot HML merge fields</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">These are rendered at send time by Pardot / Account Engagement.</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
          <span><code className="font-mono text-brand-primary dark:text-brand-accent">{'{{Recipient.FirstName}}'}</code> — First name</span>
          <span><code className="font-mono text-brand-primary dark:text-brand-accent">{'{{Recipient.LastName}}'}</code> — Last name</span>
          <span><code className="font-mono text-brand-primary dark:text-brand-accent">{'{{Recipient.Salutation}}'}</code> — Salutation</span>
          <span><code className="font-mono text-brand-primary dark:text-brand-accent">{'{{Recipient.Email}}'}</code> — Email address</span>
        </div>
      </div>
    </div>
  )
}
