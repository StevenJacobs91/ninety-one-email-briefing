import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchBenchmarks,
  upsertBenchmark,
  deleteBenchmark,
  type BenchmarkEntry,
} from '../../lib/benchmarkService'

// TODO: extend AppSettings type to include benchmarks: { enabled: boolean }
// Using type assertion until the settings type is updated.

type BenchmarkSource = BenchmarkEntry['source']

interface BenchmarkFormState {
  label: string
  emailCategory: string
  source: BenchmarkSource
  periodLabel: string
  avgOpenRate: string
  avgUniqueCtr: string
  avgClickToOpen: string
  notes: string
}

const EMPTY_FORM: BenchmarkFormState = {
  label: '',
  emailCategory: '',
  source: 'manual',
  periodLabel: '',
  avgOpenRate: '',
  avgUniqueCtr: '',
  avgClickToOpen: '',
  notes: '',
}

const SOURCE_OPTIONS: { value: BenchmarkSource; label: string }[] = [
  { value: 'manual', label: 'Manual entry' },
  { value: 'litmus', label: 'Litmus' },
  { value: 'mailchimp', label: 'Mailchimp' },
  { value: 'import', label: 'Imported file' },
  { value: 'other', label: 'Other' },
]

function parseOptionalFloat(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = parseFloat(trimmed)
  return isNaN(parsed) ? null : parsed
}

function formatPct(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)}%`
}

export function TabBenchmarks() {
  const { settings, updateSettings } = useSettings()
  const { profile } = useAuth()

  const enabled = settings.benchmarks?.enabled ?? false

  function toggleEnabled() {
    updateSettings({ benchmarks: { enabled: !enabled } })
  }

  const [entries, setEntries] = useState<BenchmarkEntry[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [form, setForm] = useState<BenchmarkFormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<{ label?: string; emailCategory?: string }>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadEntries = useCallback(async () => {
    if (!profile) return
    setListLoading(true)
    setListError(null)
    try {
      const data = await fetchBenchmarks(profile.teamId)
      setEntries(data)
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : 'Failed to load benchmarks.')
    } finally {
      setListLoading(false)
    }
  }, [profile])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  function patchForm(patch: Partial<BenchmarkFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
    setFormErrors({})
    setSaveError(null)
  }

  function validate(): boolean {
    const errors: { label?: string; emailCategory?: string } = {}
    if (!form.label.trim()) errors.label = 'Label is required.'
    if (!form.emailCategory.trim()) errors.emailCategory = 'Email category is required.'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSave() {
    if (!profile) return
    if (!validate()) return

    setSaving(true)
    setSaveError(null)
    try {
      await upsertBenchmark(profile.teamId, profile.id, {
        label: form.label.trim(),
        emailCategory: form.emailCategory.trim(),
        source: form.source,
        periodLabel: form.periodLabel.trim() || null,
        avgOpenRate: parseOptionalFloat(form.avgOpenRate),
        avgUniqueCtr: parseOptionalFloat(form.avgUniqueCtr),
        avgClickToOpen: parseOptionalFloat(form.avgClickToOpen),
        avgListGrowth: null,
        notes: form.notes.trim() || null,
      })
      setForm(EMPTY_FORM)
      await loadEntries()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save benchmark.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteBenchmark(id)
      await loadEntries()
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : 'Failed to delete benchmark.')
    } finally {
      setDeletingId(null)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="w-5 h-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary'

  const inputErrorClass =
    'w-full rounded-md border border-red-400 dark:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400'

  return (
    <div className="space-y-6">

      {/* Master enable toggle */}
      <div className="flex items-start justify-between gap-4 p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-lg">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Competitive Benchmarking</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Compare your campaign metrics against industry or internal benchmarks directly in the analytics view.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          className={`w-10 h-[22px] rounded-full relative transition-colors shrink-0 mt-0.5 ${
            enabled ? 'bg-teal-600 dark:bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          title={enabled ? 'Disable benchmarking' : 'Enable benchmarking'}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              enabled ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Existing benchmark entries */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Saved Benchmarks
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Benchmarks are matched to campaigns by email category.
        </p>

        {listLoading && (
          <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Loading benchmarks…
          </div>
        )}

        {listError && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-3">{listError}</p>
        )}

        {!listLoading && entries.length === 0 && !listError && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
            No benchmarks saved yet. Add one below.
          </p>
        )}

        {!listLoading && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {entry.label}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.emailCategory}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600 text-xs">&bull;</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {entry.source}
                    </span>
                    {entry.periodLabel && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600 text-xs">&bull;</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {entry.periodLabel}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {entry.avgOpenRate !== null && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Open rate:{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {formatPct(entry.avgOpenRate)}
                        </span>
                      </span>
                    )}
                    {entry.avgUniqueCtr !== null && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        CTR:{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {formatPct(entry.avgUniqueCtr)}
                        </span>
                      </span>
                    )}
                    {entry.avgClickToOpen !== null && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        CTOR:{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {formatPct(entry.avgClickToOpen)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  className="shrink-0 p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40"
                  title="Delete benchmark"
                >
                  {deletingId === entry.id ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Add benchmark form */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Add Benchmark
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Enter industry averages or data from previous campaigns to use as a comparison baseline.
        </p>

        <div className="space-y-4">

          {/* Label + Source row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => patchForm({ label: e.target.value })}
                placeholder="e.g. Industry Average 2025"
                className={formErrors.label ? inputErrorClass : inputClass}
              />
              {formErrors.label && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{formErrors.label}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source
              </label>
              <select
                value={form.source}
                onChange={(e) => patchForm({ source: e.target.value as BenchmarkSource })}
                className={inputClass}
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email category + period label row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.emailCategory}
                onChange={(e) => patchForm({ emailCategory: e.target.value })}
                placeholder="e.g. newsletter, webinar-invitation"
                className={formErrors.emailCategory ? inputErrorClass : inputClass}
              />
              {formErrors.emailCategory && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {formErrors.emailCategory}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period Label{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.periodLabel}
                onChange={(e) => patchForm({ periodLabel: e.target.value })}
                placeholder="e.g. Q1 2026"
                className={inputClass}
              />
            </div>
          </div>

          {/* Metric values */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Avg Open Rate{' '}
                <span className="text-gray-400 font-normal">(%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.avgOpenRate}
                onChange={(e) => patchForm({ avgOpenRate: e.target.value })}
                placeholder="e.g. 22.5"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Avg Unique CTR{' '}
                <span className="text-gray-400 font-normal">(%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.avgUniqueCtr}
                onChange={(e) => patchForm({ avgUniqueCtr: e.target.value })}
                placeholder="e.g. 3.2"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Avg Click-to-Open{' '}
                <span className="text-gray-400 font-normal">(%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.avgClickToOpen}
                onChange={(e) => patchForm({ avgClickToOpen: e.target.value })}
                placeholder="e.g. 14.1"
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => patchForm({ notes: e.target.value })}
              placeholder="Source details, methodology notes, sample size…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Save error */}
          {saveError && (
            <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#134848] hover:bg-[#0d3232] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              )}
              {saving ? 'Saving…' : 'Save Benchmark'}
            </button>
          </div>
        </div>
      </section>

      {/* Info note */}
      <div className="flex items-start gap-2.5 p-3 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
        <svg
          className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          All metric values are entered as percentages (e.g. enter{' '}
          <span className="font-medium text-gray-600 dark:text-gray-300">22.5</span> for 22.5%).
          Benchmarks are matched by email category when displaying comparisons in the analytics panel.
        </p>
      </div>
    </div>
  )
}
