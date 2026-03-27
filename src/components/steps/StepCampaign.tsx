import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_TYPES, EMAIL_TYPE_LABELS, BRAND_THEMES } from '../../lib/constants'
import type { EmailType } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { FieldSelect } from '../ui/FieldSelect'
import { buildEmailName } from '../../lib/emailName'

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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h2>

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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Name
        </label>
        <input
          type="text"
          readOnly
          value={emailName}
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm cursor-default"
        />
        <p className="text-xs text-gray-400 mt-1">
          Auto-generated: MMYY REGION AUDIENCE CAMPAIGN NAME
        </p>
      </div>

      {/* Theme selector with colour swatches */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Brand Theme<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
          {BRAND_THEMES.map((theme) => (
            <label
              key={theme.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                selectedTheme === theme.id
                  ? 'bg-[#134848]/10 ring-1 ring-[#134848]'
                  : 'hover:bg-gray-50'
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
              <span className="text-sm text-gray-700">{theme.label}</span>
            </label>
          ))}
        </div>
        {errors.campaign?.theme && (
          <p className="text-xs text-red-600 mt-1">{errors.campaign.theme.message}</p>
        )}
      </div>

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
    </div>
  )
}
