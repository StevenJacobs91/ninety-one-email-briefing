import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_TYPES, EMAIL_TYPE_LABELS, BRAND_THEMES, CLIENT_GROUPS, CHANNELS, CLIENT_GROUP_REGIONS } from '../../lib/constants'
import type { EmailType, ClientGroup, Region, Channel } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { FieldSelect } from '../ui/FieldSelect'
import { buildEmailName } from '../../lib/emailName'

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-ni-heading text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">{title}</p>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

export function StepCampaign() {
  const { register, watch, formState: { errors }, setValue } = useFormContext<BriefFormData>()

  const subjectLine = watch('campaign.subjectLine') ?? ''
  const previewText = watch('campaign.previewText') ?? ''
  const selectedTheme = watch('campaign.theme')
  const campaignName = watch('campaign.campaignName') ?? ''
  const selectedClientGroups = watch('audience.clientGroup') ?? []
  const selectedRegions = watch('audience.region') ?? []
  const selectedChannels = watch('audience.channel') ?? []

  const emailName = useMemo(
    () => buildEmailName(campaignName, selectedRegions, selectedChannels),
    [campaignName, selectedRegions, selectedChannels]
  )

  // Compute available regions based on selected client groups
  const availableRegions = useMemo(() => {
    if (selectedClientGroups.length === 0) {
      // Show all regions when no client group is selected
      return Object.values(CLIENT_GROUP_REGIONS).flat()
    }
    const regionSet = new Set<string>()
    for (const group of selectedClientGroups) {
      const groupRegions = CLIENT_GROUP_REGIONS[group] ?? []
      for (const r of groupRegions) {
        regionSet.add(r)
      }
    }
    return Array.from(regionSet)
  }, [selectedClientGroups])

  function toggleArrayValue(
    field: 'audience.clientGroup' | 'audience.region' | 'audience.channel',
    value: ClientGroup | Region | Channel,
    current: string[]
  ) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setValue(field, next as never, { shouldValidate: true })
  }

  // When client groups change, filter out any selected regions that are no longer valid
  function handleClientGroupToggle(group: ClientGroup) {
    const currentGroups = selectedClientGroups
    const isRemoving = currentGroups.includes(group)
    const nextGroups = isRemoving
      ? currentGroups.filter((g) => g !== group)
      : [...currentGroups, group]

    setValue('audience.clientGroup', nextGroups as never, { shouldValidate: true })

    if (isRemoving) {
      // Compute the still-valid regions for the remaining groups
      const validRegionSet = new Set<string>()
      for (const g of nextGroups) {
        const gr = CLIENT_GROUP_REGIONS[g as ClientGroup] ?? []
        for (const r of gr) validRegionSet.add(r)
      }
      const filteredRegions = selectedRegions.filter((r) => validRegionSet.has(r))
      if (filteredRegions.length !== selectedRegions.length) {
        setValue('audience.region', filteredRegions as never, { shouldValidate: true })
      }
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {emailName && emailName !== `${new Date().toLocaleString('en-US', { month: '2-digit' }).padStart(2, '0')}${String(new Date().getFullYear()).slice(-2)} TBD TBD Untitled`
          ? emailName
          : 'New Email Brief'}
      </h2>
      {campaignName ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Campaign Details</p>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Fill in the fields below to begin your email brief.</p>
      )}

      {/* Sub-section: Targeting */}
      <SubSection title="Targeting">
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
                onClick={() => handleClientGroupToggle(group)}
                aria-pressed={selectedClientGroups.includes(group)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
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

        {/* Region */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Region<span className="text-red-500 ml-0.5">*</span>
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {selectedClientGroups.length === 0
                ? 'Select a client group first'
                : selectedRegions.length > 0
                  ? `${selectedRegions.length} of ${availableRegions.length} selected`
                  : 'Select all that apply'}
            </span>
          </div>
          {selectedClientGroups.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              Select a client group above to filter available regions.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableRegions.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => toggleArrayValue('audience.region', region as Region, selectedRegions)}
                  aria-pressed={selectedRegions.includes(region as Region)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    selectedRegions.includes(region as Region)
                      ? 'bg-[#134848] text-white border-[#134848]'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          )}
          {errors.audience?.region && (
            <p className="text-xs text-red-600 mt-1">{errors.audience.region.message}</p>
          )}
        </div>

        {/* Channel */}
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
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
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
      </SubSection>

      {/* Divider */}
      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Sub-section 1: Email Identity */}
      <SubSection title="Email Identity">
        <FieldSelect
          label="Email Type"
          registration={register('campaign.emailType')}
          options={EMAIL_TYPES.map((t) => ({ value: t, label: EMAIL_TYPE_LABELS[t as EmailType] }))}
          error={errors.campaign?.emailType}
          required
        />

        <FieldText
          label="Campaign Name"
          registration={register('campaign.campaignName')}
          error={errors.campaign?.campaignName}
          required
          placeholder="Internal reference name"
        />

        {/* Auto-generated Email Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Name
          </label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-300 dark:border-gray-600">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm text-gray-500 dark:text-gray-400 select-all">{emailName || '—'}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Auto-generated: MMYY · REGION · AUDIENCE · CAMPAIGN NAME
          </p>
        </div>

        {/* Theme selector with colour swatches */}
        <div className="mb-4">
          <p id="theme-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Brand Theme<span className="text-red-500 ml-0.5">*</span>
          </p>
          <div className="relative">
            <div
              className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2"
              role="radiogroup"
              aria-labelledby="theme-label"
            >
              {BRAND_THEMES.map((theme) => (
                <label
                  key={theme.id}
                  role="radio"
                  aria-checked={selectedTheme === theme.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    selectedTheme === theme.id
                      ? 'bg-[#134848]/10 dark:bg-[#134848]/20 ring-1 ring-[#134848] dark:ring-[#fbaa96]'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    {...register('campaign.theme')}
                    value={theme.id}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="w-5 h-5 rounded-full border border-gray-300"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-300"
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{theme.label}</span>
                </label>
              ))}
            </div>
            {/* Scroll affordance gradient */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-lg bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
          </div>
          {errors.campaign?.theme && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.campaign.theme.message}</p>
          )}
        </div>
      </SubSection>

      {/* Divider */}
      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Sub-section 2: Message Envelope */}
      <SubSection title="Message Envelope">
        <FieldText
          label="Subject Line"
          registration={register('campaign.subjectLine')}
          error={errors.campaign?.subjectLine}
          required
          placeholder="Max 60 characters"
          maxLength={60}
          currentLength={subjectLine.length}
        />

        <FieldText
          label="Preview Text"
          registration={register('campaign.previewText')}
          error={errors.campaign?.previewText}
          required
          placeholder="Max 90 characters"
          maxLength={90}
          currentLength={previewText.length}
        />
      </SubSection>

      {/* Divider */}
      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Sub-section 3: Sender Details */}
      <SubSection title="Sender Details">
        <FieldText
          label="From Name"
          registration={register('campaign.fromName')}
          error={errors.campaign?.fromName}
          required
          placeholder="e.g. Ninety One"
        />

        <FieldText
          label="From Address"
          registration={register('campaign.fromAddress')}
          error={errors.campaign?.fromAddress}
          required
          type="email"
          placeholder="noreply@ninetyone.com"
        />

        <FieldText
          label="Reply-To Email"
          registration={register('campaign.replyToEmail')}
          error={errors.campaign?.replyToEmail}
          type="email"
          placeholder="Optional — reply@ninetyone.com"
        />
      </SubSection>
    </div>
  )
}
