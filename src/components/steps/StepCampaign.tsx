import { useState, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import {
  EMAIL_TYPES, EMAIL_TYPE_LABELS, CLIENT_GROUPS, CHANNELS,
  CLIENT_GROUP_REGIONS,
} from '../../lib/constants'
import { SENDER_TYPES, SENDER_TYPE_LABELS, type EmailType, type ClientGroup, type Region, type Channel, type SenderType } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { ThemeSelect } from '../ui/ThemeSelect'
import { campaignUtm, slugifyUtm } from '../../lib/utm'
import { FieldTextarea } from '../ui/FieldTextarea'
import { BriefSection } from '../brief/BriefSection'
import { FieldSlot } from '../brief/FieldSlot'
import { useBriefAttention } from '../brief/BriefAttention'
import { defaultRequiredMap } from '../../lib/briefRequirements'
import { SupportingMaterial } from './SupportingMaterial'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { useAvailableThemes } from '../builder2/useAvailableThemes'
import { instantiateTemplate, isBuildEmpty } from '../../lib/campaignTemplate'
import { buildTags } from '../../lib/tags'
import { SubjectLineScore } from '../../features/subject-line-tester'
import { useSubjectLineDeps } from '../../hooks/useSubjectLineDeps'
import { StepAudience } from './StepAudience'
import { SendTimeSuggestion } from './SendTimeSuggestion'

// Merge built-in array with custom settings items, deduplicating by value
function mergeUnique(builtIn: readonly string[], custom: string[]): string[] {
  const seen = new Set(builtIn)
  const extras = custom.filter((v) => !seen.has(v))
  return [...builtIn, ...extras]
}

const DEFAULT_REQUIRED = defaultRequiredMap()

/** The red asterisk, and its screen-reader text, for a field that is required. */
function RequiredMark({ on }: { on: boolean }) {
  if (!on) return null
  return <><span className="text-red-500 ml-0.5" aria-hidden="true">*</span><span className="sr-only"> (required)</span></>
}

const SELECT_CLASS = 'w-full border px-3 py-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 border-brand-border-field dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent focus:border-brand-primary dark:focus:border-brand-accent transition-colors'

// ─── Main StepCampaign ─────────────────────────────────────────────────────────
/** What the campaign presets put in the from name when the email is sent as the prospect's own Pardot user. */
const ASSIGNED_USER_PRESET = "Prospect's Assigned User"

export function StepCampaign() {
  // Whether each field is required is set in Settings → Form Layout.
  const attention = useBriefAttention()
  const isRequired = (path: string) => !!(attention?.required ?? DEFAULT_REQUIRED)[path]
  const { register, watch, formState: { errors }, setValue, getValues } = useFormContext<BriefFormData>()
  const { settings } = useSettings()
  const { profile } = useAuth()

  // ── Campaign fields ──
  const emailDescription = watch('campaign.emailDescription') ?? ''
  const senderDefaults = settings.senderDefaults
  const senderType = (watch('campaign.senderType') ?? 'general') as SenderType
  const subjectLine = watch('campaign.subjectLine') ?? ''
  const previewText = watch('campaign.previewText') ?? ''
  const selectedTheme = watch('campaign.theme')
  const { ids: availableThemes, approximate: approximateThemes } = useAvailableThemes()
  const subjectLineDeps = useSubjectLineDeps()
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

    // The UTM starts as the one set for the campaign in Settings, else its name; it can still be changed.
    setValue('campaign.utmCampaign', campaign ? campaignUtm(campaign) : slugifyUtm(campaignName), { shouldDirty: true })

    if (campaign?.senderPreset) {
      // A preset that sends as the prospect's own user is an assigned-user send, which has no from name or address of its own.
      const assigned = campaign.senderPreset.fromName === ASSIGNED_USER_PRESET
      setValue('campaign.senderType', assigned ? 'assigned' : 'general', { shouldValidate: true })
      if (assigned) {
        setValue('campaign.fromName', senderDefaults.fromName, { shouldValidate: false })
        setValue('campaign.fromAddress', senderDefaults.fromAddress, { shouldValidate: false })
      } else if (campaign.senderPreset.fromName) setValue('campaign.fromName', campaign.senderPreset.fromName, { shouldValidate: false })
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
      if (cp.greetingId) set('content.greetingId', cp.greetingId)
      if (cp.disclaimerId) {
        const disclaimerEntry = (settings.legalDisclaimers ?? []).find((d) => d.id === cp.disclaimerId)
        if (disclaimerEntry) {
          set('content.legalDisclaimer', disclaimerEntry.text)
          set('content.disclaimerId', disclaimerEntry.id)
        }
      }

      // The campaign's saved layout. Never replaces work the user has already done without asking.
      if (cp.build) {
        const proceed = isBuildEmpty(getValues('content.build'))
          || window.confirm(`Replace the current layout and content with the saved “${campaign?.name}” template?`)
        if (proceed) {
          if (cp.build.headerTypeId) setValue('assets.headerType', cp.build.headerTypeId, { shouldDirty: true })
          setValue('content.build', instantiateTemplate(cp.build, cp.theme || getValues('campaign.theme')), { shouldDirty: true })
        }
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

  const tags = useMemo(() => buildTags(data as BriefFormData, settings.brandThemes ?? []), [data, settings.brandThemes])

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

  // Whether the send date is switched off in Settings; the 1-1 control sits beside it and stays either way.
  const sendDateHidden = attention?.hidden.has('deadlines.sendDate') ?? false
  const oneOneRequired = (
          <div className="mb-4">
            <p className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-2">
              1-1 Required?
            </p>
            <div className="flex w-full h-[46px] border border-brand-border-field dark:border-gray-600 overflow-hidden" role="group" aria-label="1-1 required">
              <button
                type="button"
                onClick={() => setValue('deadlines.oneOnOneRequired', false, { shouldValidate: true })}
                aria-pressed={watch('deadlines.oneOnOneRequired') === false}
                className={`flex-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${
                  watch('deadlines.oneOnOneRequired') === false
                    ? 'bg-brand-primary text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setValue('deadlines.oneOnOneRequired', true, { shouldValidate: true })}
                aria-pressed={watch('deadlines.oneOnOneRequired') === true}
                className={`flex-1 text-sm font-medium transition-colors border-l border-brand-border-field dark:border-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${
                  watch('deadlines.oneOnOneRequired') === true
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                Yes
              </button>
            </div>
          </div>
  )

  return (
    // A column, so each section's own order (set in briefSections.ts) puts the email identity first without moving any of the code.
    <div className="flex flex-col">
      {/* Sub-section: Deadlines */}
      <BriefSection id="deadlines" title="Deadlines">
        {sendDateHidden ? (
          <div style={{ order: 0 }}>{oneOneRequired}</div>
        ) : (
          <FieldSlot path="deadlines.sendDate">
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
            required={isRequired('deadlines.sendDate')}
            type="date"
            min={today}
          />
              {oneOneRequired}
            </div>
          </FieldSlot>
        )}

        <FieldSlot path="deadlines.notes">
        <FieldTextarea
          label="Notes"
          registration={register('deadlines.notes')}
          required={isRequired('deadlines.notes')}
          error={errors.deadlines?.notes}
          placeholder="Any additional notes (max 300 characters)"
          maxLength={300}
          currentLength={notes.length}
          rows={3}
        />
        </FieldSlot>

      </BriefSection>


      {/* Sub-section: Targeting */}
      <BriefSection id="targeting" title="Targeting">
        <FieldSlot path="audience.clientGroup">
        {/* Client Group */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Client Group<RequiredMark on={isRequired('audience.clientGroup')} />
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {selectedClientGroups.length > 0 ? `${selectedClientGroups.length} selected` : 'Select all that apply'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2" data-field="audience.clientGroup">
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
        </FieldSlot>

        <FieldSlot path="audience.region">
        {/* Region */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Region<RequiredMark on={isRequired('audience.region')} />
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
            <div className="flex flex-wrap gap-2" data-field="audience.region">
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
        </FieldSlot>

        <FieldSlot path="audience.channel">
        {/* Channel */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Channel/Audience<RequiredMark on={isRequired('audience.channel')} />
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {selectedChannels.length > 0 ? `${selectedChannels.length} of ${allChannels.length} selected` : 'Select all that apply'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2" data-field="audience.channel">
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
        </FieldSlot>

      </BriefSection>


      {/* Sub-section: Email Identity */}
      <BriefSection id="identity" title="Email Identity">
        <FieldSlot path="campaign.emailDescription">
        {/* Email Description */}
        <FieldText
          label="Email Description"
          registration={register('campaign.emailDescription')}
          required={isRequired('campaign.emailDescription')}
          error={errors.campaign?.emailDescription}
          placeholder="Short description (e.g. Q2 Market Update) — max 80 characters"
          maxLength={80}
          currentLength={emailDescription.length}
          hint="Appears in the email name: MMYY Region Audience Campaign - Description"
        />
        </FieldSlot>

        <FieldSlot path="campaign.emailType">
        {/* Email Type — single-select pills */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Type<RequiredMark on={isRequired('campaign.emailType')} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2" data-field="campaign.emailType">
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
        </FieldSlot>

        {/* Campaign, then Brand Theme, one under the other as drop-downs */}
        <FieldSlot path="campaign.campaignName">
        {/* Campaign selector — filtered by region + channel */}
        <div>
          <label htmlFor="campaign-campaignName" className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
            Campaign<RequiredMark on={isRequired('campaign.campaignName')} />
          </label>
          {allCampaigns.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              No campaigns configured. Add campaigns in <strong>Settings → Campaigns</strong>.
            </p>
          ) : availableCampaigns.length === 0 ? (
            <div className="px-3 py-2.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-400 dark:text-gray-500 italic">
              No campaigns match the selected targeting. Adjust Targeting or add campaigns in Settings.
            </div>
          ) : (
            <select
              id="campaign-campaignName"
              name="campaign.campaignName"
              value={campaignName}
              onChange={(e) => handleCampaignSelect(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="" disabled>Select a campaign</option>
              {availableCampaigns.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}{(c.regions.length > 0 || c.channels.length > 0) ? ` — ${[...c.regions, ...c.channels].join(' · ')}` : ''}
                </option>
              ))}
            </select>
          )}
          {errors.campaign?.campaignName && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.campaign.campaignName.message}</p>
          )}
        </div>
        </FieldSlot>

        <FieldSlot path="campaign.theme">
        {/* Theme selector: the colours sit beside each name, in the list and in the closed control */}
        <div>
          <label id="campaign-theme-label" htmlFor="campaign-theme" className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
            Brand Theme<RequiredMark on={isRequired('campaign.theme')} />
          </label>
          <ThemeSelect
            id="campaign-theme"
            name="campaign.theme"
            labelledBy="campaign-theme-label"
            value={selectedTheme ?? ''}
            options={(settings.brandThemes ?? []).map((theme) => {
              // Themes with no module library cannot be built in Layout & Content.
              const pending = availableThemes !== null && !availableThemes.includes(theme.id)
              return {
                id: theme.id,
                label: theme.label,
                primary: theme.primary,
                accent: theme.accent,
                disabled: pending && selectedTheme !== theme.id,
                note: pending ? 'Module library pending' : approximateThemes.includes(theme.id) ? 'Approximate module library' : undefined,
              }
            })}
            onChange={(id) => setValue('campaign.theme', id, { shouldValidate: true, shouldDirty: true })}
          />
          {errors.campaign?.theme && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.campaign.theme.message}</p>
          )}
        </div>
        </FieldSlot>

        <FieldSlot path="campaign.utmCampaign">
        {/* Filled in from the campaign chosen above, and can be changed */}
        <FieldText
          label="UTM Campaign"
          registration={register('campaign.utmCampaign')}
          required={isRequired('campaign.utmCampaign')}
          placeholder="e.g. women-and-investing-newsletter"
          hint="Filled in from the campaign. Applied as utm_campaign= on all links, with hyphens between the words"
        />
        </FieldSlot>

      </BriefSection>


      {/* Sub-section: Message Envelope */}
      <BriefSection id="envelope" title="Message Envelope">
        <FieldSlot path="campaign.subjectLine">
        <FieldText
          label="Subject Line"
          registration={register('campaign.subjectLine')}
          error={errors.campaign?.subjectLine}
          required={isRequired('campaign.subjectLine')}
          placeholder="Suggested: up to 60 characters"
          suggestedLength={60}
          currentLength={subjectLine.length}
        />
        </FieldSlot>

        <FieldSlot path="campaign.previewText">
        <FieldText
          label="Preview Text"
          registration={register('campaign.previewText')}
          error={errors.campaign?.previewText}
          required={isRequired('campaign.previewText')}
          placeholder="Suggested: up to 90 characters"
          suggestedLength={90}
          currentLength={previewText.length}
        />
        </FieldSlot>

        <FieldSlot path="campaign.subjectLine" last>
        <SubjectLineScore
          deps={subjectLineDeps}
          subject={subjectLine}
          senderName={senderType === 'general' ? (watch('campaign.fromName') ?? '') : SENDER_TYPE_LABELS[senderType]}
          preheader={previewText}
          onApplySubject={(subject) => setValue('campaign.subjectLine', subject, { shouldValidate: true, shouldDirty: true })}
        />
        </FieldSlot>

      </BriefSection>


      {/* Sub-section: Sender Details */}
      <BriefSection id="sender" title="Sender Details">
        {/* Who the email is sent as in Pardot */}
        <div>
          <label htmlFor="campaign-senderType" className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
            Sender
          </label>
          <select id="campaign-senderType" {...register('campaign.senderType')} className={SELECT_CLASS}>
            {SENDER_TYPES.map((type) => (
              <option key={type} value={type}>{SENDER_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </div>

        {senderType === 'general' && (
          <>
            <FieldSlot path="campaign.fromName">
            <FieldText
              label="From Name"
              registration={register('campaign.fromName')}
              error={errors.campaign?.fromName}
              required={isRequired('campaign.fromName')}
              placeholder="e.g. Ninety One"
            />
            </FieldSlot>

            <FieldSlot path="campaign.fromAddress">
            <FieldText
              label="From Address"
              registration={register('campaign.fromAddress')}
              error={errors.campaign?.fromAddress}
              required={isRequired('campaign.fromAddress')}
              type="email"
              placeholder="noreply@ninetyone.com"
            />
            </FieldSlot>

          </>
        )}

        {senderType === 'specific' && (
          <FieldText
            label="Specific User"
            registration={register('campaign.specificUser')}
            error={errors.campaign?.specificUser}
            required
            placeholder="e.g. 12345"
            hint="The Pardot user ID this email is sent from"
          />
        )}

        {senderType === 'assigned' && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Each recipient gets the email from their own assigned Pardot user, so there is no from name or address to set.
          </p>
        )}

        <FieldSlot path="campaign.replyToEmail">
        <FieldText
          label="Reply-To Email"
          registration={register('campaign.replyToEmail')}
          required={isRequired('campaign.replyToEmail')}
          error={errors.campaign?.replyToEmail}
          type="email"
          placeholder="Optional — reply@ninetyone.com"
        />
        </FieldSlot>

      </BriefSection>


      {/* Auto-generated Tags — visibility controlled by Settings → General → Show Tags section */}
      {(settings.formDefaults.showTagsSection ?? true) && <BriefSection id="tags" title="Tags">
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
      </BriefSection>}


      {/* Sub-section: Audience (distribution lists + Pardot) */}
      <BriefSection id="audience" title="Audience">
        <StepAudience />
      </BriefSection>


      <SupportingMaterial />
    </div>
  )
}
