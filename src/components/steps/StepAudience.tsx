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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audience</h2>

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
            <span className="text-[#134848] dark:text-[#fbaa96] font-medium">
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
            ? 'border-[#134848] bg-[#134848]/5 dark:border-[#fbaa96]/50'
            : isDragging
            ? 'border-[#134848] bg-[#134848]/5 dark:border-[#fbaa96] dark:bg-[#fbaa96]/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus-within:ring-2 focus-within:ring-[#134848] focus-within:border-[#134848]'
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
            <div className="w-5 h-5 border-2 border-[#134848] dark:border-[#fbaa96] border-t-transparent rounded-full animate-spin" />
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm shrink-0"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▾' : '▸'}
        </button>

        <span className="text-base shrink-0">📊</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {entry.stored.name}
          </p>
          <p className="text-xs text-gray-400">
            {formatFileSize(entry.stored.size)}
            {entry.stored.rowCount !== undefined && (
              <> · <span className="text-[#134848] dark:text-[#fbaa96] font-medium">{entry.stored.rowCount.toLocaleString()} clean contacts</span></>
            )}
            {entry.analysis && entry.analysis.duplicateCount > 0 && (
              <> · <span className="text-amber-600 dark:text-amber-400">{entry.analysis.duplicateCount} duplicates removed</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {entry.csvContent && (
            <button
              type="button"
              onClick={onDownload}
              className="text-xs px-2.5 py-1 rounded-md border border-[#134848] text-[#134848] dark:border-[#fbaa96] dark:text-[#fbaa96] hover:bg-[#134848]/5 dark:hover:bg-[#fbaa96]/5 transition-colors font-medium"
              title="Download cleaned UTF-8 CSV"
            >
              ↓ CSV
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition-colors text-sm px-1"
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
  const droppedCount =
    analysis.blankEmailCount +
    analysis.unknownEmailCount +
    analysis.duplicateCount +
    analysis.blankRowCount

  const stats = [
    { label: 'Total rows in source', value: analysis.rawRowCount.toLocaleString(), icon: '📥', colour: 'text-gray-700 dark:text-gray-300' },
    { label: 'Clean contacts kept', value: analysis.cleanRowCount.toLocaleString(), icon: '✅', colour: 'text-emerald-700 dark:text-emerald-400' },
    { label: 'Total removed', value: droppedCount.toLocaleString(), icon: '🗑', colour: droppedCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-400' },
    ...(analysis.duplicateCount > 0 ? [{ label: 'Duplicate emails removed', value: analysis.duplicateCount.toLocaleString(), icon: '♊', colour: 'text-amber-700 dark:text-amber-400' }] : []),
    ...(analysis.blankEmailCount > 0 ? [{ label: 'Blank email rows removed', value: analysis.blankEmailCount.toLocaleString(), icon: '❌', colour: 'text-red-600 dark:text-red-400' }] : []),
    ...(analysis.unknownEmailCount > 0 ? [{ label: 'unknown@unknown.com removed', value: analysis.unknownEmailCount.toLocaleString(), icon: '🚫', colour: 'text-red-600 dark:text-red-400' }] : []),
    ...(analysis.blankRowCount > 0 ? [{ label: 'Blank rows removed', value: analysis.blankRowCount.toLocaleString(), icon: '⬜', colour: 'text-gray-400' }] : []),
    ...(analysis.discardedColumns.length > 0 ? [{ label: 'Columns removed', value: analysis.discardedColumns.length.toString(), icon: '📦', colour: 'text-gray-500 dark:text-gray-400' }] : []),
  ]

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {/* Sub-header */}
      <div className="px-4 py-2 bg-[#134848]/5 dark:bg-[#134848]/20 flex items-center gap-2">
        <span className="text-xs font-semibold text-[#134848] dark:text-[#fbaa96] uppercase tracking-wider">List Analysis</span>
        <span className="text-xs text-gray-400">· UTF-8 CSV · 5 columns retained</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-gray-100 dark:divide-gray-700/50">
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-3 flex items-start gap-2">
            <span className="text-sm mt-0.5">{s.icon}</span>
            <div>
              <p className={`text-sm font-bold ${s.colour}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Detected columns */}
      {analysis.detectedColumns && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/50">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Columns retained:</p>
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
                  className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                    detected
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 line-through'
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
        <div className="px-4 py-3 border-t border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Notes:</p>
          <ul className="space-y-1">
            {analysis.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">⚠</span>{w}
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pardot List Analysis</p>
        <div className="flex items-center gap-2">
          {loading && <div className="w-3.5 h-3.5 border-2 border-[#134848] dark:border-[#fbaa96] border-t-transparent rounded-full animate-spin" />}
          {data?.isMock && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">Demo data</span>
          )}
          {!data?.isMock && data && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Live</span>
          )}
        </div>
      </div>

      {fetchError ? (
        <div className="px-4 py-4"><p className="text-sm text-red-600 dark:text-red-400">⚠ {fetchError}</p></div>
      ) : loading && !data ? (
        <div className="px-4 py-6 text-center"><p className="text-xs text-gray-400">Fetching list data…</p></div>
      ) : data ? (
        <div>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
            <a
              href={data.meta.pardotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#134848] dark:text-[#fbaa96] hover:underline"
            >
              {data.meta.name} ↗
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{data.summary}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-100 dark:divide-gray-700/50">
            {[
              { label: 'Total Prospects', value: data.stats.totalProspects.toLocaleString(), icon: '👥', colour: 'text-gray-700 dark:text-gray-200' },
              { label: `Mailable (${data.stats.mailablePercent}%)`, value: data.stats.mailableProspects.toLocaleString(), icon: '✉️', colour: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'Unmailable', value: data.stats.unmailableProspects.toLocaleString(), icon: '🚫', colour: 'text-red-600 dark:text-red-400' },
              { label: 'Never Active', value: data.stats.neverActive.toLocaleString(), icon: '💤', colour: 'text-amber-600 dark:text-amber-400' },
              { label: 'Hard Bounces', value: data.stats.hardBounces.toLocaleString(), icon: '⚠️', colour: 'text-red-500 dark:text-red-400' },
              { label: `Opted In (${data.stats.optedInPercent}%)`, value: data.stats.optedIn.toLocaleString(), icon: '✅', colour: 'text-[#134848] dark:text-[#fbaa96]' },
            ].map((s) => (
              <div key={s.label} className="px-4 py-3 flex items-start gap-2">
                <span className="text-base mt-0.5">{s.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${s.colour}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {data.insights.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/50 bg-blue-50 dark:bg-blue-950/10">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">Insights</p>
              <ul className="space-y-1">
                {data.insights.map((insight, i) => (
                  <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>{insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.recommendations.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/50 bg-amber-50 dark:bg-amber-950/10">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">Recommendations</p>
              <ul className="space-y-1">
                {data.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">→</span>{rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.isMock && (
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700/50 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Demo data shown. Connect your Pardot API in{' '}
                <span className="font-medium text-gray-500 dark:text-gray-400">Settings → Pardot API</span>.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
