import { useState, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import {
  EMAIL_TYPES, EMAIL_TYPE_LABELS, BRAND_THEMES, CLIENT_GROUPS, CHANNELS,
  CLIENT_GROUP_REGIONS,
} from '../../lib/constants'
import type { EmailType, ClientGroup, Region, Channel } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { FieldTextarea } from '../ui/FieldTextarea'
import { SubSection } from '../ui/SubSection'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { StepAudience } from './StepAudience'
import { SendTimeSuggestion } from './SendTimeSuggestion'

// Merge built-in array with custom settings items, deduplicating by value
function mergeUnique(builtIn: readonly string[], custom: string[]): string[] {
  const seen = new Set(builtIn)
  const extras = custom.filter((v) => !seen.has(v))
  return [...builtIn, ...extras]
}

// ─── Tags builder ──────────────────────────────────────────────────────────────
function buildTags(data: BriefFormData): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const regionPart = (data.audience.region ?? []).length > 0 ? (data.audience.region ?? []).join(' ') : 'tbd'
  const audiencePart = (data.audience.channel ?? []).length > 0 ? (data.audience.channel ?? []).join(' ') : 'tbd'
  const namePart = data.campaign.campaignName || 'untitled'
  const emailName = `${mm}${yy} ${regionPart} ${audiencePart} ${namePart}`.toLowerCase()

  const themeLabel = BRAND_THEMES.find((t) => t.id === data.campaign.theme)?.label ?? data.campaign.theme ?? ''

  return [
    `parent - ${emailName}`,
    'email - primary',
    `client group - ${(data.audience.clientGroup ?? []).join(' ').toLowerCase()}`,
    `region - ${(data.audience.region ?? []).join(' ').toLowerCase()}`,
    `audience - ${(data.audience.channel ?? []).join(' ').toLowerCase()}`,
    `campaign - ${(data.campaign.campaignName || 'untitled').toLowerCase()}`,
    `email type - ${(data.campaign.emailType || '').toLowerCase()}`,
    `colour theme - ${themeLabel.toLowerCase().replace(/\s*\/\s*/g, ' and ')}`,
  ].join(', ')
}

// ─── Main StepCampaign ─────────────────────────────────────────────────────────
export function StepCampaign() {
  const { register, watch, formState: { errors }, setValue } = useFormContext<BriefFormData>()
  const { settings } = useSettings()
  const { profile } = useAuth()

  // ── Campaign fields ──
  const emailDescription = watch('campaign.emailDescription') ?? ''
  const subjectLine = watch('campaign.subjectLine') ?? ''
  const previewText = watch('campaign.previewText') ?? ''
  const selectedTheme = watch('campaign.theme')
  const campaignName = watch('campaign.campaignName') ?? ''
  const selectedClientGroups = watch('audience.clientGroup') ?? []
  const selectedRegions = watch('audience.region') ?? []
  const selectedChannels = watch('audience.channel') ?? []

  const allCampaigns = settings.campaigns ?? []

  // Merged dynamic lists
  const allClientGroups = useMemo(
    () => mergeUnique(CLIENT_GROUPS, (settings.customClientGroups ?? []).map((cg) => cg.name)),
    [settings.customClientGroups]
  )

  const allChannels = useMemo(
    () => mergeUnique(CHANNELS, (settings.customChannels ?? []).map((ch) => ch.label)),
    [settings.customChannels]
  )

  const allEmailTypes = useMemo(() => {
    const builtIn = EMAIL_TYPES.map((id) => ({ id, label: EMAIL_TYPE_LABELS[id as EmailType] ?? id }))
    const custom = (settings.customEmailTypes ?? []).map((et) => ({ id: et.id, label: et.label }))
    const builtInIds = new Set(EMAIL_TYPES as readonly string[])
    return [...builtIn, ...custom.filter((et) => !builtInIds.has(et.id))]
  }, [settings.customEmailTypes])

  const availableCampaigns = useMemo(() => {
    return allCampaigns.filter((c) => {
      const clientGroupMatch = (c.clientGroups ?? []).length === 0 || selectedClientGroups.some((cg) => (c.clientGroups ?? []).includes(cg))
      const channelMatch = c.channels.length === 0 || selectedChannels.some((ch) => c.channels.includes(ch))
      return clientGroupMatch && channelMatch
    })
  }, [allCampaigns, selectedClientGroups, selectedChannels])

  const availableRegions = useMemo(() => {
    const builtInRegions: string[] = selectedClientGroups.length === 0
      ? Object.values(CLIENT_GROUP_REGIONS).flat()
      : (() => {
          const regionSet = new Set<string>()
          for (const group of selectedClientGroups) {
            const groupRegions = CLIENT_GROUP_REGIONS[group as ClientGroup] ?? []
            for (const r of groupRegions) regionSet.add(r)
            // Also include custom regions that belong to this client group
            for (const cr of settings.customRegions ?? []) {
              if (cr.clientGroup === group) regionSet.add(cr.name)
            }
          }
          return Array.from(regionSet)
        })()

    if (selectedClientGroups.length === 0) {
      // Add all custom regions too when no filter
      const customNames = (settings.customRegions ?? []).map((cr) => cr.name)
      return mergeUnique(builtInRegions, customNames)
    }
    return builtInRegions
  }, [selectedClientGroups, settings.customRegions])

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

  function handleCampaignSelect(campaignName: string) {
    setValue('campaign.campaignName', campaignName, { shouldValidate: true })
    const campaign = allCampaigns.find((c) => c.name === campaignName)

    if (campaign?.senderPreset) {
      if (campaign.senderPreset.fromName) setValue('campaign.fromName', campaign.senderPreset.fromName, { shouldValidate: false })
      if (campaign.senderPreset.fromAddress) setValue('campaign.fromAddress', campaign.senderPreset.fromAddress, { shouldValidate: false })
      if (campaign.senderPreset.replyToEmail !== undefined) setValue('campaign.replyToEmail', campaign.senderPreset.replyToEmail, { shouldValidate: false })
    }

    if (campaign?.contentPreset) {
      const cp = campaign.contentPreset
      const set = (field: Parameters<typeof setValue>[0], value: string) =>
        setValue(field, value as never, { shouldDirty: true, shouldValidate: false })

      if (cp.theme) set('campaign.theme', cp.theme)
      if (cp.subjectLine) set('campaign.subjectLine', cp.subjectLine)
      if (cp.previewText) set('campaign.previewText', cp.previewText)
      if (cp.headline) set('content.headline', cp.headline)
      if (cp.subHeadline) set('content.subHeadline', cp.subHeadline)
      if (cp.heroImageUrl) set('assets.heroImageUrl', cp.heroImageUrl)
      if (cp.signatureId) set('content.footerSignoffId', cp.signatureId)
      if (cp.pardotListId) set('audience.pardotListId', cp.pardotListId)
      if (cp.disclaimerId) {
        const disclaimerEntry = (settings.legalDisclaimers ?? []).find((d) => d.id === cp.disclaimerId)
        if (disclaimerEntry) set('content.legalDisclaimer', disclaimerEntry.text)
      }
    }
  }

  function handleClientGroupToggle(group: ClientGroup) {
    const isRemoving = selectedClientGroups.includes(group)
    const nextGroups = isRemoving
      ? selectedClientGroups.filter((g) => g !== group)
      : [...selectedClientGroups, group]

    setValue('audience.clientGroup', nextGroups as never, { shouldValidate: true })

    if (isRemoving) {
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

  // ── Auto-apply user presets on first load if fields are empty ──
  useEffect(() => {
    if (!profile) return
    const cgs = profile.presetClientGroups ?? []
    const regs = profile.presetRegions ?? []
    if (cgs.length > 0 && selectedClientGroups.length === 0) {
      setValue('audience.clientGroup', cgs as never, { shouldValidate: false })
    }
    if (regs.length > 0 && selectedRegions.length === 0) {
      setValue('audience.region', regs as never, { shouldValidate: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // ── Deadlines fields ──
  const notes = watch('deadlines.notes') ?? ''
  const today = new Date().toISOString().split('T')[0]
  const data = watch()

  const tags = useMemo(() => buildTags(data as BriefFormData), [data])

  useEffect(() => {
    setValue('deadlines.tags', tags)
  }, [tags, setValue])

  const [tagsCopied, setTagsCopied] = useState(false)

  async function copyTags() {
    try {
      await navigator.clipboard.writeText(tags)
      setTagsCopied(true)
      setTimeout(() => setTagsCopied(false), 2000)
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div>
      {/* Sub-section: Deadlines */}
      <SubSection title="Deadlines">
        {settings.sendTimeOptimisation?.enabled && profile?.teamId && (
          <SendTimeSuggestion
            teamId={profile.teamId}
            emailType={watch('campaign.emailType') ?? ''}
            enabled={settings.sendTimeOptimisation.enabled}
            onApply={(isoDate) => {
              const dateOnly = isoDate.split('T')[0]
              setValue('deadlines.sendDate', dateOnly, { shouldValidate: true })
            }}
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <FieldText
            label="Send Date"
            registration={register('deadlines.sendDate')}
            error={errors.deadlines?.sendDate}
            required
            type="date"
            min={today}
          />
          {/* 1-1 Required — single toggle button */}
          <div className="mb-4">
            <p className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
              1-1 Required?
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">
              Individual one-to-one send (e.g. adviser targeting)?
            </p>
            <button
              type="button"
              onClick={() => setValue('deadlines.oneOnOneRequired', !watch('deadlines.oneOnOneRequired'), { shouldValidate: true })}
              className={`px-5 py-2 rounded-md border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none ${
                watch('deadlines.oneOnOneRequired')
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {watch('deadlines.oneOnOneRequired') ? 'Yes' : 'No'}
            </button>
          </div>
        </div>

        <FieldTextarea
          label="Notes"
          registration={register('deadlines.notes')}
          error={errors.deadlines?.notes}
          placeholder="Any additional notes (max 300 characters)"
          maxLength={300}
          currentLength={notes.length}
          rows={3}
        />
      </SubSection>

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Sub-section: Targeting */}
      <SubSection title="Targeting">
        {/* Client Group */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Client Group<span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {selectedClientGroups.length > 0 ? `${selectedClientGroups.length} selected` : 'Select all that apply'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allClientGroups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => handleClientGroupToggle(group as ClientGroup)}
                aria-pressed={selectedClientGroups.includes(group)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none ${
                  selectedClientGroups.includes(group)
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
          {errors.audience?.clientGroup && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.audience.clientGroup.message}</p>
          )}
        </div>

        {/* Region */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Region<span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
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
                  className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none ${
                    selectedRegions.includes(region as Region)
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          )}
          {errors.audience?.region && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.audience.region.message}</p>
          )}
        </div>

        {/* Channel */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Channel/Audience<span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {selectedChannels.length > 0 ? `${selectedChannels.length} of ${allChannels.length} selected` : 'Select all that apply'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allChannels.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => toggleArrayValue('audience.channel', channel as Channel, selectedChannels)}
                aria-pressed={selectedChannels.includes(channel)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none ${
                  selectedChannels.includes(channel)
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {channel}
              </button>
            ))}
          </div>
          {errors.audience?.channel && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.audience.channel.message}</p>
          )}
        </div>
      </SubSection>

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Sub-section: Email Identity */}
      <SubSection title="Email Identity">
        {/* Email Description */}
        <FieldText
          label="Email Description"
          registration={register('campaign.emailDescription')}
          error={errors.campaign?.emailDescription}
          placeholder="Short description (e.g. Q2 Market Update) — max 80 characters"
          maxLength={80}
          currentLength={emailDescription.length}
          hint="Appears in the email name: MMYY Region Audience Campaign - Description"
        />

        {/* Email Type — single-select pills */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Type<span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {allEmailTypes.map((et) => (
              <button
                key={et.id}
                type="button"
                onClick={() => setValue('campaign.emailType', et.id, { shouldValidate: true })}
                aria-pressed={watch('campaign.emailType') === et.id}
                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none ${
                  watch('campaign.emailType') === et.id
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {et.label}
              </button>
            ))}
          </div>
          {errors.campaign?.emailType && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.campaign.emailType.message}</p>
          )}
        </div>

        {/* Campaign + Theme — 2-column side-by-side layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Campaign selector — filtered by region + channel */}
          <div>
            <p id="campaign-label" className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
              Campaign<span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
            </p>
            {allCampaigns.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                No campaigns configured. Add campaigns in <strong>Settings → Campaigns</strong>.
              </p>
            ) : availableCampaigns.length === 0 ? (
              <div className="px-3 py-2.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-400 dark:text-gray-500 italic">
                No campaigns match the selected targeting. Adjust Targeting or add campaigns in Settings.
              </div>
            ) : (
              <div className="relative">
                <div
                  className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2"
                  role="radiogroup"
                  aria-labelledby="campaign-label"
                >
                  {availableCampaigns.map((c) => (
                    <label
                      key={c.id}
                      role="radio"
                      aria-checked={campaignName === c.name}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                        campaignName === c.name
                          ? 'bg-brand-primary/10 dark:bg-brand-primary/20 ring-1 ring-brand-primary dark:ring-brand-accent'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="radio"
                        value={c.name}
                        checked={campaignName === c.name}
                        onChange={() => handleCampaignSelect(c.name)}
                        className="sr-only"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-tight">{c.name}</p>
                        {(c.regions.length > 0 || c.channels.length > 0) && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {[...c.regions, ...c.channels].join(' · ')}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-lg bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
              </div>
            )}
            {errors.campaign?.campaignName && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.campaign.campaignName.message}</p>
            )}
          </div>

          {/* Theme selector */}
          <div>
            <p id="theme-label" className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
              Brand Theme<span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
            </p>
            <div className="relative">
              <div
                className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2"
                role="radiogroup"
                aria-labelledby="theme-label"
              >
                {BRAND_THEMES.map((theme) => (
                  <label
                    key={theme.id}
                    role="radio"
                    aria-checked={selectedTheme === theme.id}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                      selectedTheme === theme.id
                        ? 'bg-brand-primary/10 dark:bg-brand-primary/20 ring-1 ring-brand-primary dark:ring-brand-accent'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <input type="radio" {...register('campaign.theme')} value={theme.id} className="sr-only" />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: theme.primary }} />
                      <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: theme.accent }} />
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 leading-tight">{theme.label}</span>
                  </label>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-lg bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
            </div>
            {errors.campaign?.theme && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.campaign.theme.message}</p>
            )}
          </div>
        </div>
      </SubSection>

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Sub-section: Message Envelope */}
      <SubSection title="Message Envelope">
        <FieldText
          label="Subject Line"
          registration={register('campaign.subjectLine')}
          error={errors.campaign?.subjectLine}
          required
          placeholder="Suggested: up to 60 characters"
          suggestedLength={60}
          currentLength={subjectLine.length}
        />

        <FieldText
          label="Preview Text"
          registration={register('campaign.previewText')}
          error={errors.campaign?.previewText}
          required
          placeholder="Suggested: up to 90 characters"
          suggestedLength={90}
          currentLength={previewText.length}
        />
      </SubSection>

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Sub-section: Sender Details */}
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

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Auto-generated Tags — visibility controlled by Settings → General → Show Tags section */}
      {(settings.formDefaults.showTagsSection ?? true) && <SubSection title="Tags">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Auto-generated Tags
          </label>
          <button
            type="button"
            onClick={copyTags}
            className="text-xs text-brand-primary dark:text-brand-accent hover:underline font-medium flex items-center gap-1"
          >
            {tagsCopied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy tags
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Comma-separated tags for use in your email marketing platform.
        </p>
        <div className="px-3 py-2.5 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400 select-all leading-relaxed font-mono break-all">
          {tags || '—'}
        </div>
      </SubSection>}

      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* Sub-section: Audience (distribution lists + Pardot) */}
      <SubSection title="Audience">
        <StepAudience />
      </SubSection>
    </div>
  )
}
