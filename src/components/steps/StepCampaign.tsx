import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_TYPES, EMAIL_TYPE_LABELS, BRAND_THEMES } from '../../lib/constants'
import type { EmailType } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { FieldSelect } from '../ui/FieldSelect'
import { buildEmailName } from '../../lib/emailName'

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-0">{children}</div>
    </div>
  )
}

export function StepCampaign() {
  const { register, watch, formState: { errors } } = useFormContext<BriefFormData>()

  const subjectLine = watch('campaign.subjectLine') ?? ''
  const previewText = watch('campaign.previewText') ?? ''
  const selectedTheme = watch('campaign.theme')
  const campaignName = watch('campaign.campaignName') ?? ''
  const regions = watch('audience.region') ?? []
  const channels = watch('audience.channel') ?? []

  const emailName = useMemo(
    () => buildEmailName(campaignName, regions, channels),
    [campaignName, regions, channels]
  )

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Campaign Details</h2>

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
