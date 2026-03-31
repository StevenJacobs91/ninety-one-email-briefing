import { useState, useCallback, useEffect, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { FieldText } from '../ui/FieldText'
import { formatFileSize } from '../../lib/formatFileSize'
import { parseDistributionList, downloadCleanedCsv } from '../../lib/parseDistributionList'
import type { ListAnalysis } from '../../lib/parseDistributionList'
import { fetchPardotListAnalysis } from '../../lib/pardotService'
import type { PardotListAnalysis } from '../../lib/pardotService'
import { useSettings } from '../../contexts/SettingsContext'

// ─── Stored list shape (matches schema) ───────────────────────────────────────

type StoredList = NonNullable<BriefFormData['audience']['distributionLists']>[number]

// ─── Local state per uploaded list (includes detectedColumns not in schema) ───

interface LocalListEntry {
  stored: StoredList
  analysis: ListAnalysis | null
  csvContent: string
  originalFileName: string
}

// ─── Main step ───────────────────────────────────────────────────────────────

export function StepAudience() {
  const { register, formState: { errors }, watch } = useFormContext<BriefFormData>()
  const pardotListId = watch('audience.pardotListId') ?? ''
  const { settings } = useSettings()

  return (
    <div className="space-y-8">
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-1">Audience</h2>

      {/* Distribution Lists */}
      <DistributionListsUpload />

      {/* Pardot */}
      <div className="space-y-2">
        <FieldText
          label="Pardot List Name, ID, or URL"
          registration={register('audience.pardotListId')}
          error={errors.audience?.pardotListId}
          placeholder="e.g. 12345  |  NI-ZA-Intermediary-Q1  |  https://pi.pardot.com/lists/read/id/12345"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Optional. Found in Pardot under <em>Marketing → Segmentation → Lists</em>. Used by the n8n automation to trigger the send.
        </p>
        {pardotListId.trim() && (
          <PardotAnalysisPanel listIdentifier={pardotListId} config={settings.pardot} />
        )}
      </div>
    </div>
  )
}

// ─── Distribution Lists Upload (multi-list) ───────────────────────────────────

function DistributionListsUpload() {
  const { setValue, watch } = useFormContext<BriefFormData>()
  const storedLists = watch('audience.distributionLists') ?? []

  // Local state tracks full analysis + CSV per entry (not persisted in schema)
  const [localEntries, setLocalEntries] = useState<LocalListEntry[]>(() =>
    storedLists.map((s) => ({
      stored: s,
      analysis: s.analysis ?? null,
      csvContent: s.csvContent ?? '',
      originalFileName: s.name,
    }))
  )

  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingName, setProcessingName] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Keep form value in sync when localEntries changes
  const syncToForm = useCallback((entries: LocalListEntry[]) => {
    setValue(
      'audience.distributionLists',
      entries.map((e) => e.stored),
      { shouldValidate: true }
    )
  }, [setValue])

  const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

  const isValidFile = useCallback(
    (file: File) => ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
    []
  )

  const isDuplicateName = useCallback(
    (name: string, entries: LocalListEntry[]) => entries.some((e) => e.stored.name === name),
    []
  )

  const processFile = useCallback(async (file: File, currentEntries: LocalListEntry[]) => {
    if (!isValidFile(file)) {
      setUploadError('Unsupported file type. Please upload an Excel (.xlsx, .xls) or CSV file.')
      return currentEntries
    }
    if (isDuplicateName(file.name, currentEntries)) {
      setUploadError(`"${file.name}" is already in the list.`)
      return currentEntries
    }

    setUploadError(null)
    setProcessingName(file.name)
    setIsProcessing(true)

    try {
      const result = await parseDistributionList(file)

      const stored: StoredList = {
        name: file.name,
        size: file.size,
        type: file.type || (file.name.endsWith('.csv')
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        rowCount: result.analysis.cleanRowCount,
        csvContent: result.csvContent,
        analysis: {
          rawRowCount: result.analysis.rawRowCount,
          cleanRowCount: result.analysis.cleanRowCount,
          blankEmailCount: result.analysis.blankEmailCount,
          unknownEmailCount: result.analysis.unknownEmailCount,
          duplicateCount: result.analysis.duplicateCount,
          blankRowCount: result.analysis.blankRowCount,
          discardedColumns: result.analysis.discardedColumns,
          warnings: result.analysis.warnings,
        },
      }

      const newEntry: LocalListEntry = {
        stored,
        analysis: result.analysis,
        csvContent: result.csvContent,
        originalFileName: file.name,
      }

      return [...currentEntries, newEntry]
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process file.')
      return currentEntries
    } finally {
      setIsProcessing(false)
      setProcessingName('')
    }
  }, [isValidFile, isDuplicateName])

  const handleFiles = useCallback(async (files: File[]) => {
    let entries = [...localEntries]
    for (const file of files) {
      entries = await processFile(file, entries)
    }
    setLocalEntries(entries)
    syncToForm(entries)
  }, [localEntries, processFile, syncToForm])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleFiles(files)
  }, [handleFiles])

  const removeList = useCallback((idx: number) => {
    setLocalEntries((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      syncToForm(next)
      return next
    })
  }, [syncToForm])

  const handleDownload = useCallback((entry: LocalListEntry) => {
    if (entry.csvContent) {
      downloadCleanedCsv(entry.csvContent, entry.originalFileName)
    }
  }, [])

  // Combined totals across all lists
  const totalClean = localEntries.reduce((sum, e) => sum + (e.stored.rowCount ?? 0), 0)
  const totalRaw = localEntries.reduce((sum, e) => sum + (e.analysis?.rawRowCount ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Distribution Lists
        </label>
        {localEntries.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {localEntries.length} list{localEntries.length !== 1 ? 's' : ''} ·{' '}
            <span className="text-brand-primary dark:text-brand-accent font-medium">
              {totalClean.toLocaleString()} clean contacts
            </span>
            {totalRaw > 0 && totalRaw !== totalClean && (
              <> from {totalRaw.toLocaleString()} raw</>
            )}
          </span>
        )}
      </div>

      {/* Existing lists */}
      {localEntries.map((entry, idx) => (
        <ListCard
          key={`${entry.stored.name}-${idx}`}
          entry={entry}
          index={idx}
          onRemove={() => removeList(idx)}
          onDownload={() => handleDownload(entry)}
        />
      ))}

      {/* Drop zone — always visible so more lists can be added */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isProcessing
            ? 'border-brand-primary bg-brand-primary/5 dark:border-brand-accent/50'
            : isDragging
            ? 'border-brand-primary bg-brand-primary/5 dark:border-brand-accent dark:bg-brand-accent/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary'
        }`}
      >
        {!isProcessing && (
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (files.length) handleFiles(files)
              e.target.value = ''
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        )}
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-brand-primary dark:border-brand-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Processing <span className="text-gray-800 dark:text-gray-200">{processingName}</span>…
            </p>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-xl mb-1">📋</p>
            <p className="text-sm font-medium">
              {localEntries.length === 0
                ? isDragging ? 'Drop your list here' : 'Drag & drop a distribution list'
                : isDragging ? 'Drop to add another list' : '+ Add another list'
              }
            </p>
            <p className="text-xs mt-0.5 text-gray-400">or click to browse · Excel or CSV · multiple files supported</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <span>⚠</span> {uploadError}
        </p>
      )}
    </div>
  )
}

// ─── Individual list card ─────────────────────────────────────────────────────

function ListCard({
  entry,
  index,
  onRemove,
  onDownload,
}: {
  entry: LocalListEntry
  index: number
  onRemove: () => void
  onDownload: () => void
}) {
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className="border border-brand-border-field dark:border-gray-700 overflow-hidden transition-colors hover:border-brand-primary dark:hover:border-gray-500">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-brand-bg-panel dark:bg-gray-800/50 border-b border-brand-border-warm dark:border-gray-700">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[#9ca3af] hover:text-brand-primary dark:hover:text-gray-300 transition-colors text-xs shrink-0"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▾' : '▸'}
        </button>

        {/* File icon */}
        <div className="w-7 h-7 rounded-sm bg-brand-primary dark:bg-brand-primary-hover flex items-center justify-center shrink-0">
          <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5">
            <rect x="2" y="1" width="7" height="2" rx="0.5" fill="white" opacity="0.9"/>
            <rect x="2" y="4.5" width="10" height="1.5" rx="0.5" fill="white" opacity="0.7"/>
            <rect x="2" y="7" width="10" height="1.5" rx="0.5" fill="white" opacity="0.7"/>
            <rect x="2" y="9.5" width="7" height="1.5" rx="0.5" fill="white" opacity="0.5"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-ni-medium text-[#1a1a1a] dark:text-gray-200 truncate">
            {entry.stored.name}
          </p>
          <p className="text-xs text-brand-text-muted dark:text-gray-400 mt-0.5">
            {formatFileSize(entry.stored.size)}
            {entry.stored.rowCount !== undefined && (
              <> · <span className="text-brand-primary dark:text-brand-accent font-ni-medium">{entry.stored.rowCount.toLocaleString()} clean contacts</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {entry.csvContent && (
            <button
              type="button"
              onClick={onDownload}
              className="text-xs tracking-[0.06em] px-2.5 py-1 border border-brand-primary text-brand-primary dark:border-brand-accent dark:text-brand-accent hover:bg-brand-primary/5 dark:hover:bg-brand-accent/5 transition-colors font-ni-medium"
              title="Download cleaned UTF-8 CSV"
            >
              ↓ CSV
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-[#9ca3af] hover:text-[#c0392b] transition-colors text-sm px-1"
            title="Remove this list"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Analysis — collapsible */}
      {expanded && entry.analysis && (
        <ListAnalysisPanel analysis={entry.analysis} />
      )}
    </div>
  )
}

// ─── List Analysis Panel ──────────────────────────────────────────────────────

function ListAnalysisPanel({ analysis }: { analysis: ListAnalysis }) {
  const removedItems = [
    ...(analysis.duplicateCount > 0 ? [`${analysis.duplicateCount.toLocaleString()} duplicate${analysis.duplicateCount !== 1 ? 's' : ''}`] : []),
    ...(analysis.blankEmailCount > 0 ? [`${analysis.blankEmailCount.toLocaleString()} blank email${analysis.blankEmailCount !== 1 ? 's' : ''}`] : []),
    ...(analysis.unknownEmailCount > 0 ? [`${analysis.unknownEmailCount.toLocaleString()} invalid email${analysis.unknownEmailCount !== 1 ? 's' : ''}`] : []),
    ...(analysis.blankRowCount > 0 ? [`${analysis.blankRowCount.toLocaleString()} blank row${analysis.blankRowCount !== 1 ? 's' : ''}`] : []),
  ]

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Sub-header */}
      <div className="px-4 py-2 bg-brand-primary/5 dark:bg-brand-primary/20 flex items-center gap-3 border-b border-brand-border-warm dark:border-gray-700">
        <span className="text-xs font-ni-heading text-brand-primary dark:text-brand-accent uppercase tracking-[0.18em]">List Analysis</span>
        <span className="text-xs text-[#9ca3af] dark:text-gray-500">UTF-8 · 5 columns retained</span>
      </div>

      {/* Inline stats row — matches mockup .list-stats-row pattern */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-y-2 text-xs text-brand-text-muted dark:text-gray-400 border-b border-brand-border-warm dark:border-gray-700">
        <div className="flex items-center gap-1 pr-4 mr-4 border-r border-brand-border-warm dark:border-gray-700">
          <strong className="font-ni-medium text-[#1a1a1a] dark:text-gray-200">{analysis.rawRowCount.toLocaleString()}</strong>
          <span>raw contacts</span>
        </div>
        <div className="flex items-center gap-1 pr-4 mr-4 border-r border-brand-border-warm dark:border-gray-700">
          <strong className="font-ni-medium text-brand-primary dark:text-brand-accent">{analysis.cleanRowCount.toLocaleString()}</strong>
          <span>clean</span>
        </div>
        {removedItems.map((item, i) => (
          <div key={i} className={`flex items-center gap-1 ${i < removedItems.length - 1 ? 'pr-4 mr-4 border-r border-brand-border-warm dark:border-gray-700' : ''}`}>
            <strong className="font-ni-medium text-[#c0392b] dark:text-red-400">{item.split(' ')[0]}</strong>
            <span className="text-[#c0392b] dark:text-red-400">{item.split(' ').slice(1).join(' ')} removed</span>
          </div>
        ))}
        {removedItems.length === 0 && (
          <div className="flex items-center gap-1 text-[#009d80] dark:text-[#009d80]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#009d80] inline-block" />
            <span>No rows removed</span>
          </div>
        )}
      </div>

      {/* Columns retained */}
      {analysis.detectedColumns && (
        <div className="px-4 py-3 border-b border-brand-border-warm dark:border-gray-700">
          <p className="text-xs font-ni-heading text-brand-text-muted dark:text-gray-400 uppercase tracking-[0.14em] mb-2">Columns retained</p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['contactId', 'Contact ID'],
                ['brokerPreferredName', 'Broker Preferred Name'],
                ['firstName', 'First Name'],
                ['lastName', 'Last Name'],
                ['email', 'Email'],
              ] as const
            ).map(([key, label]) => {
              const detected = analysis.detectedColumns?.[key]
              return (
                <span
                  key={key}
                  className={`text-xs px-2 py-0.5 border font-ni-medium ${
                    detected
                      ? 'border-brand-primary/30 text-brand-primary bg-brand-primary/5 dark:border-brand-accent/30 dark:text-brand-accent dark:bg-brand-accent/5'
                      : 'border-brand-border-warm dark:border-gray-700 text-[#9ca3af] line-through'
                  }`}
                  title={detected ? `Mapped from: "${detected}"` : 'Not found in source'}
                >
                  {label}
                  {detected && detected !== label && (
                    <span className="font-normal opacity-60"> ← "{detected}"</span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="px-4 py-3 bg-[#fffbf0] dark:bg-amber-950/20 border-b border-brand-border-warm dark:border-amber-900/30">
          <p className="text-xs font-ni-heading text-[#cf6f13] uppercase tracking-[0.14em] mb-2">Notes</p>
          <ul className="space-y-1">
            {analysis.warnings.map((w, i) => (
              <li key={i} className="text-xs text-brand-text-body dark:text-amber-400 flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-[#cf6f13] mt-1.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Pardot Analysis Panel ────────────────────────────────────────────────────

function PardotAnalysisPanel({
  listIdentifier,
  config,
}: {
  listIdentifier: string
  config: import('../../types/settings.types').PardotConfig
}) {
  const [data, setData] = useState<PardotListAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const lastFetched = useRef<string>('')

  useEffect(() => {
    const trimmed = listIdentifier.trim()
    if (!trimmed || trimmed === lastFetched.current) return

    const timer = setTimeout(async () => {
      lastFetched.current = trimmed
      setLoading(true)
      setFetchError(null)
      const result = await fetchPardotListAnalysis(trimmed, config)
      setLoading(false)
      if (result.ok) {
        setData(result.data)
      } else {
        setFetchError(result.error)
        setData(null)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [listIdentifier, config])

  return (
    <div className="border border-brand-border-warm dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      {/* Header row */}
      <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-brand-border-warm dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-7 h-7 rounded bg-brand-primary dark:bg-brand-primary-hover text-white text-xs font-bold flex items-center justify-center shrink-0">P</span>
          <div className="min-w-0">
            {loading && !data ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">Fetching list data…</p>
            ) : data ? (
              <>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{data.meta.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Pardot List · {data.stats.totalProspects.toLocaleString()} members</p>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading && <div className="w-3 h-3 border-2 border-brand-primary dark:border-brand-accent border-t-transparent rounded-full animate-spin" />}
          {!loading && data && (
            <span className="text-xs text-[#009d80] dark:text-[#009d80] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#009d80] inline-block" />
              {data.isMock ? 'Demo data' : 'Synced'}
            </span>
          )}
        </div>
      </div>

      {fetchError ? (
        <div className="px-4 py-4"><p className="text-sm text-[#c0392b] dark:text-red-400 flex items-start gap-2"><span className="shrink-0">⚠</span>{fetchError}</p></div>
      ) : data ? (
        <div>
          {/* Prospect health section */}
          <div className="border-b border-brand-border-warm dark:border-gray-700">
            <div className="px-4 py-2 bg-brand-bg-panel dark:bg-gray-800/30">
              <span className="text-xs font-ni-heading text-brand-primary dark:text-brand-accent uppercase tracking-[0.18em]">Prospect Health</span>
            </div>
            <div className="grid grid-cols-3 border-t border-brand-border-warm dark:border-gray-700">
              {[
                {
                  label: 'Total',
                  value: data.stats.totalProspects.toLocaleString(),
                  colour: 'text-[#1a1a1a] dark:text-gray-200',
                },
                {
                  label: 'Mailable',
                  value: `${data.stats.mailableProspects.toLocaleString()}`,
                  sub: `${data.stats.mailablePercent}%`,
                  colour: data.stats.mailablePercent >= 85
                    ? 'text-brand-primary dark:text-brand-accent'
                    : data.stats.mailablePercent >= 70
                    ? 'text-[#cf6f13]'
                    : 'text-[#c0392b]',
                },
                {
                  label: 'Unmailable',
                  value: data.stats.unmailableProspects.toLocaleString(),
                  colour: data.stats.unmailableProspects > 0 ? 'text-[#c0392b] dark:text-red-400' : 'text-[#9ca3af]',
                },
                {
                  label: 'Never Active',
                  value: data.stats.neverActive.toLocaleString(),
                  colour: data.stats.neverActive > 100 ? 'text-[#cf6f13]' : 'text-[#9ca3af]',
                },
                {
                  label: 'Hard Bounces',
                  value: data.stats.hardBounces.toLocaleString(),
                  colour: data.stats.hardBounces > 0 ? 'text-[#c0392b] dark:text-red-400' : 'text-[#9ca3af]',
                },
                {
                  label: 'Opted In',
                  value: `${data.stats.optedIn.toLocaleString()}`,
                  sub: `${data.stats.optedInPercent}%`,
                  colour: data.stats.optedInPercent >= 50 ? 'text-brand-primary dark:text-brand-accent' : 'text-[#cf6f13]',
                },
              ].map((s, i) => (
                <div key={s.label} className={`px-2 py-3 text-center ${i % 3 !== 2 ? 'border-r border-brand-border-warm dark:border-gray-700' : ''} ${i < 3 ? 'border-b border-brand-border-warm dark:border-gray-700' : ''}`}>
                  <p className={`text-sm font-ni-medium leading-none ${s.colour}`}>
                    {s.value}
                    {s.sub && <span className="text-xs opacity-70 ml-0.5">({s.sub})</span>}
                  </p>
                  <p className="text-xs font-ni-heading tracking-[0.06em] uppercase text-[#9ca3af] dark:text-gray-500 mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          {data.insights.length > 0 && (
            <div className="px-4 py-3 border-b border-brand-border-warm dark:border-gray-700">
              <p className="text-xs font-ni-heading text-brand-primary dark:text-brand-accent uppercase tracking-[0.18em] mb-2">Insights</p>
              <ul className="space-y-1.5">
                {data.insights.map((insight, i) => (
                  <li key={i} className="text-xs text-brand-text-body dark:text-gray-300 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-brand-primary dark:bg-brand-accent mt-1.5 shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="px-4 py-3 bg-[#fffbf0] dark:bg-amber-950/10 border-b border-brand-border-warm dark:border-gray-700">
              <p className="text-xs font-ni-heading text-[#cf6f13] uppercase tracking-[0.18em] mb-2">Recommendations</p>
              <ul className="space-y-1.5">
                {data.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-brand-text-body dark:text-gray-300 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#cf6f13] mt-1.5 shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer: mock data notice */}
          {data.isMock && (
            <div className="px-4 py-2 text-center">
              <p className="text-xs text-[#9ca3af] dark:text-gray-500">
                Demo data · Connect your Pardot API in{' '}
                <span className="text-brand-text-muted dark:text-gray-400">Settings → Pardot API</span>
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
