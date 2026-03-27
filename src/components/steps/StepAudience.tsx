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

// ─── Main step ───────────────────────────────────────────────────────────────

export function StepAudience() {
  const { register, formState: { errors }, watch } = useFormContext<BriefFormData>()
  const pardotListId = watch('audience.pardotListId') ?? ''
  const { settings } = useSettings()

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audience</h2>

      {/* Distribution List */}
      <DistributionListUpload />

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

// ─── Distribution List Upload ─────────────────────────────────────────────────

function DistributionListUpload() {
  const { setValue, watch } = useFormContext<BriefFormData>()
  const distributionList = watch('audience.distributionList')
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ListAnalysis | null>(
    distributionList?.analysis ?? null
  )
  const [csvContent, setCsvContent] = useState<string>(distributionList?.csvContent ?? '')
  const [fileName, setFileName] = useState<string>(distributionList?.name ?? '')

  const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

  const isValidFile = useCallback((file: File) => {
    return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (!isValidFile(file)) {
      setError('Unsupported file type. Please upload an Excel (.xlsx, .xls) or CSV file.')
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      const result = await parseDistributionList(file)

      setAnalysis(result.analysis)
      setCsvContent(result.csvContent)
      setFileName(file.name)

      setValue('audience.distributionList', {
        name: file.name,
        size: file.size,
        type: file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
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
      }, { shouldValidate: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [isValidFile, setValue])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const removeList = useCallback(() => {
    setValue('audience.distributionList', undefined, { shouldValidate: true })
    setAnalysis(null)
    setCsvContent('')
    setFileName('')
    setError(null)
  }, [setValue])

  const handleDownload = useCallback(() => {
    if (csvContent && fileName) {
      downloadCleanedCsv(csvContent, fileName)
    }
  }, [csvContent, fileName])

  const hasFile = Boolean(distributionList)

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Distribution List
      </label>

      {hasFile ? (
        /* ── Uploaded state ── */
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-gray-400 text-lg shrink-0">📊</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {distributionList!.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(distributionList!.size)}
                  {distributionList?.rowCount !== undefined && (
                    <> · <span className="text-[#134848] dark:text-[#fbaa96] font-medium">{distributionList.rowCount.toLocaleString()} clean contacts</span></>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {csvContent && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-[#134848] text-[#134848] dark:border-[#fbaa96] dark:text-[#fbaa96] hover:bg-[#134848]/5 dark:hover:bg-[#fbaa96]/5 transition-colors font-medium"
                  title="Download cleaned CSV (UTF-8)"
                >
                  ↓ Download CSV
                </button>
              )}
              <button
                type="button"
                onClick={removeList}
                className="text-gray-400 hover:text-red-500 transition-colors text-sm px-1"
                title="Remove list"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Analysis panel */}
          {analysis && <ListAnalysisPanel analysis={analysis} />}
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
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
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#134848] dark:border-[#fbaa96] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Processing file…</p>
              <p className="text-xs text-gray-400">Cleaning data and analysing contacts</p>
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm font-medium">
                {isDragging ? 'Drop your distribution list here' : 'Drag & drop your distribution list'}
              </p>
              <p className="text-xs mt-1 text-gray-400">or click to browse</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Excel (.xlsx, .xls) or CSV · Unnecessary columns will be stripped automatically
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
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
    {
      label: 'Total rows in source',
      value: analysis.rawRowCount.toLocaleString(),
      icon: '📥',
      colour: 'text-gray-700 dark:text-gray-300',
    },
    {
      label: 'Clean contacts kept',
      value: analysis.cleanRowCount.toLocaleString(),
      icon: '✅',
      colour: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'Total removed',
      value: droppedCount.toLocaleString(),
      icon: '🗑',
      colour: droppedCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-400',
    },
    ...(analysis.duplicateCount > 0
      ? [{ label: 'Duplicate emails removed', value: analysis.duplicateCount.toLocaleString(), icon: '♊', colour: 'text-amber-700 dark:text-amber-400' }]
      : []),
    ...(analysis.blankEmailCount > 0
      ? [{ label: 'Blank email rows removed', value: analysis.blankEmailCount.toLocaleString(), icon: '❌', colour: 'text-red-600 dark:text-red-400' }]
      : []),
    ...(analysis.unknownEmailCount > 0
      ? [{ label: 'unknown@unknown.com removed', value: analysis.unknownEmailCount.toLocaleString(), icon: '🚫', colour: 'text-red-600 dark:text-red-400' }]
      : []),
    ...(analysis.blankRowCount > 0
      ? [{ label: 'Blank rows removed', value: analysis.blankRowCount.toLocaleString(), icon: '⬜', colour: 'text-gray-400' }]
      : []),
    ...(analysis.discardedColumns.length > 0
      ? [{ label: `Columns removed`, value: analysis.discardedColumns.length.toLocaleString(), icon: '📦', colour: 'text-gray-500 dark:text-gray-400' }]
      : []),
  ]

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#134848]/5 dark:bg-[#134848]/20 flex items-center gap-2">
        <span className="text-xs font-semibold text-[#134848] dark:text-[#fbaa96] uppercase tracking-wider">
          List Analysis
        </span>
        <span className="text-xs text-gray-400">· Converted to UTF-8 CSV · 5 columns retained</span>
      </div>

      {/* Stats grid */}
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
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/50">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Columns retained:</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'contactId', label: 'Contact ID', detected: analysis.detectedColumns?.contactId },
            { key: 'brokerPreferredName', label: 'Broker Preferred Name', detected: analysis.detectedColumns?.brokerPreferredName },
            { key: 'firstName', label: 'First Name', detected: analysis.detectedColumns?.firstName },
            { key: 'lastName', label: 'Last Name', detected: analysis.detectedColumns?.lastName },
            { key: 'email', label: 'Email', detected: analysis.detectedColumns?.email },
          ].map(({ key, label, detected }) => (
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
          ))}
        </div>
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="px-4 py-3 border-t border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Notes:</p>
          <ul className="space-y-1">
            {analysis.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">⚠</span>
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pardot List Analysis</p>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-3.5 h-3.5 border-2 border-[#134848] dark:border-[#fbaa96] border-t-transparent rounded-full animate-spin" />
          )}
          {data?.isMock && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Demo data
            </span>
          )}
          {!data?.isMock && data && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Live
            </span>
          )}
        </div>
      </div>

      {fetchError ? (
        <div className="px-4 py-4">
          <p className="text-sm text-red-600 dark:text-red-400">⚠ {fetchError}</p>
        </div>
      ) : loading && !data ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-gray-400">Fetching list data…</p>
        </div>
      ) : data ? (
        <div>
          {/* List name & link */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
              <a
                href={data.meta.pardotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[#134848] dark:text-[#fbaa96] hover:underline"
              >
                {data.meta.name} ↗
              </a>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{data.summary}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-100 dark:divide-gray-700/50">
            {[
              {
                label: 'Total Prospects',
                value: data.stats.totalProspects.toLocaleString(),
                icon: '👥',
                colour: 'text-gray-700 dark:text-gray-200',
              },
              {
                label: `Mailable (${data.stats.mailablePercent}%)`,
                value: data.stats.mailableProspects.toLocaleString(),
                icon: '✉️',
                colour: 'text-emerald-700 dark:text-emerald-400',
              },
              {
                label: 'Unmailable',
                value: data.stats.unmailableProspects.toLocaleString(),
                icon: '🚫',
                colour: 'text-red-600 dark:text-red-400',
              },
              {
                label: 'Never Active',
                value: data.stats.neverActive.toLocaleString(),
                icon: '💤',
                colour: 'text-amber-600 dark:text-amber-400',
              },
              {
                label: 'Hard Bounces',
                value: data.stats.hardBounces.toLocaleString(),
                icon: '⚠️',
                colour: 'text-red-500 dark:text-red-400',
              },
              {
                label: `Opted In (${data.stats.optedInPercent}%)`,
                value: data.stats.optedIn.toLocaleString(),
                icon: '✅',
                colour: 'text-[#134848] dark:text-[#fbaa96]',
              },
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

          {/* Insights */}
          {data.insights.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/50 bg-blue-50 dark:bg-blue-950/10">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">Insights</p>
              <ul className="space-y-1">
                {data.insights.map((insight, i) => (
                  <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/50 bg-amber-50 dark:bg-amber-950/10">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">Recommendations</p>
              <ul className="space-y-1">
                {data.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">→</span>
                    {rec}
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
