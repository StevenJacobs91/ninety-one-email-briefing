import { useState, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { CLIENT_GROUPS, REGIONS, CHANNELS } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { formatFileSize } from '../../lib/formatFileSize'

export function StepAudience() {
  const { register, formState: { errors }, watch, setValue } = useFormContext<BriefFormData>()

  const selectedClientGroups = watch('audience.clientGroup') ?? []
  const selectedRegions = watch('audience.region') ?? []
  const selectedChannels = watch('audience.channel') ?? []

  function toggleArrayValue(
    field: 'audience.clientGroup' | 'audience.region' | 'audience.channel',
    value: string,
    current: string[]
  ) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setValue(field, next as never, { shouldValidate: true })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Audience</h2>

      {/* Client Group */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Client Group<span className="text-red-500 ml-0.5">*</span>
          </label>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {selectedClientGroups.length > 0 ? `${selectedClientGroups.length} selected` : 'Select all that apply'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CLIENT_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => toggleArrayValue('audience.clientGroup', group, selectedClientGroups)}
              aria-pressed={selectedClientGroups.includes(group)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedClientGroups.includes(group)
                  ? 'bg-[#134848] text-white border-[#134848]'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
        {errors.audience?.clientGroup && (
          <p className="text-xs text-red-600 mt-1">{errors.audience.clientGroup.message}</p>
        )}
      </div>

      {/* Regions */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Region<span className="text-red-500 ml-0.5">*</span>
          </label>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {selectedRegions.length > 0 ? `${selectedRegions.length} of ${REGIONS.length} selected` : 'Select all that apply'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => toggleArrayValue('audience.region', region, selectedRegions)}
              aria-pressed={selectedRegions.includes(region)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedRegions.includes(region)
                  ? 'bg-[#134848] text-white border-[#134848]'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
        {errors.audience?.region && (
          <p className="text-xs text-red-600 mt-1">{errors.audience.region.message}</p>
        )}
      </div>

      {/* Channels */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Channel<span className="text-red-500 ml-0.5">*</span>
          </label>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {selectedChannels.length > 0 ? `${selectedChannels.length} of ${CHANNELS.length} selected` : 'Select all that apply'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((channel) => (
            <button
              key={channel}
              type="button"
              onClick={() => toggleArrayValue('audience.channel', channel, selectedChannels)}
              aria-pressed={selectedChannels.includes(channel)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedChannels.includes(channel)
                  ? 'bg-[#134848] text-white border-[#134848]'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
        {errors.audience?.channel && (
          <p className="text-xs text-red-600 mt-1">{errors.audience.channel.message}</p>
        )}
      </div>

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
