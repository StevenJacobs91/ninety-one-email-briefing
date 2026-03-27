import { useState, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { FieldText } from '../ui/FieldText'
import { formatFileSize } from '../../lib/formatFileSize'

export function StepAudience() {
  const { register, formState: { errors }, watch } = useFormContext<BriefFormData>()
  const pardotListId = watch('audience.pardotListId') ?? ''

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Audience</h2>

      {/* Distribution List Upload */}
      <DistributionListUpload />

      <div>
        <FieldText
          label="Pardot List ID"
          registration={register('audience.pardotListId')}
          error={errors.audience?.pardotListId}
          placeholder="e.g. 12345"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-3 mb-4">
          Optional. Find this in Pardot under <em>Marketing &rarr; Segmentation &rarr; Lists</em>. Used by the n8n automation to trigger the send.
        </p>
      </div>

      {/* Pardot List Analysis — mock data shown when a list ID is entered */}
      {pardotListId && (
        <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pardot List Analysis</p>
            <span className="text-xs text-amber-500 font-medium">Demo data — connect API in Settings</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Total Prospects', value: '2,847', icon: '👥' },
              { label: 'Mailable', value: '2,341 (82%)', icon: '✉️' },
              { label: 'Unsubscribed', value: '298 (10%)', icon: '🚫' },
              { label: 'Never Active', value: '208 (7%)', icon: '💤' },
              { label: 'Hard Bounces', value: '42 (1.5%)', icon: '⚠️' },
              { label: 'Opted In', value: '1,987 (70%)', icon: '✅' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-start gap-2">
                <span className="text-base">{stat.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 <strong>Recommendation:</strong> Consider suppressing Never Active contacts (208) to improve deliverability. Mailable rate of 82% is within acceptable range.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function DistributionListUpload() {
  const { setValue, watch } = useFormContext<BriefFormData>()
  const distributionList = watch('audience.distributionList')
  const [isDragging, setIsDragging] = useState(false)

  const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ]
  const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

  const isValidFile = useCallback((file: File) => {
    if (ACCEPTED_TYPES.includes(file.type)) return true
    return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!isValidFile(file)) return
    setValue('audience.distributionList', {
      name: file.name,
      size: file.size,
      type: file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    }, { shouldValidate: true })
  }, [isValidFile, setValue])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const removeList = useCallback(() => {
    setValue('audience.distributionList', undefined, { shouldValidate: true })
  }, [setValue])

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Distribution List
      </label>

      {distributionList ? (
        <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400 text-sm shrink-0">{'\u{1F4CA}'}</span>
            <div className="min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{distributionList.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(distributionList.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeList}
            className="text-gray-400 hover:text-red-500 text-sm px-2 shrink-0"
            title="Remove"
            aria-label="Remove distribution list"
          >
            &times;
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-[#134848] bg-[#134848]/5 dark:border-[#fbaa96] dark:bg-[#fbaa96]/5'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus-within:ring-2 focus-within:ring-[#134848] focus-within:border-[#134848]'
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium">
              {isDragging ? 'Drop file here' : 'Drag & drop distribution list'}
            </p>
            <p className="text-xs mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Excel (.xlsx, .xls) or CSV files
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
