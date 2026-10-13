import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'

// ── Types ────────────────────────────────────────────────────────────────────

type SocialPlatform = 'LinkedIn' | 'Twitter / X' | 'Instagram' | 'Facebook' | 'YouTube'
type PostFormat = 'Organic Post' | 'Sponsored / Paid' | 'Story' | 'Reel / Short Video' | 'Carousel' | 'Poll' | 'Article'
type CampaignObjective = 'Brand Awareness' | 'Lead Generation' | 'Engagement' | 'Traffic' | 'Conversion' | 'Recruitment'

interface SocialBriefFormData {
  campaignName: string
  platforms: SocialPlatform[]
  postFormat: PostFormat | ''
  objective: CampaignObjective | ''
  targetAudience: string
  regions: string[]
  publishDate: string
  expiryDate: string
  copyPrimary: string
  copyVariants: string
  hashtagSuggestions: string
  linkUrl: string
  utmCampaign: string
  mediaRequired: boolean
  mediaDescription: string
  assetUrl: string
  isPaid: boolean
  budget: string
  targeting: string
  approvalRequired: boolean
  approvalContact: string
  notes: string
  urgency: 'standard' | 'urgent'
}

const PLATFORMS: SocialPlatform[] = ['LinkedIn', 'Twitter / X', 'Instagram', 'Facebook', 'YouTube']
const POST_FORMATS: PostFormat[] = ['Organic Post', 'Sponsored / Paid', 'Story', 'Reel / Short Video', 'Carousel', 'Poll', 'Article']
const OBJECTIVES: CampaignObjective[] = ['Brand Awareness', 'Lead Generation', 'Engagement', 'Traffic', 'Conversion', 'Recruitment']
const REGIONS = ['Global', 'UK', 'South Africa', 'Europe', 'North America', 'Middle East', 'Australia', 'Asia']

function ChipSelect<T extends string>({
  options, value, onChange, label,
}: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const sel = value.includes(opt)
          return (
            <button key={opt} type="button"
              onClick={() => onChange(sel ? value.filter((v) => v !== opt) : [...value, opt])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                sel ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Toggle({ value, onChange, label, description }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors ${value ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
    </label>
  )
}

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"

function buildMarkdown(data: SocialBriefFormData): string {
  return [
    `# Social Media Brief — ${data.campaignName}`,
    ``,
    `**Submitted:** ${new Date().toISOString().split('T')[0]}`,
    `**Platforms:** ${data.platforms.join(', ')}`,
    `**Format:** ${data.postFormat}`,
    `**Objective:** ${data.objective}`,
    `**Publish Date:** ${data.publishDate}${data.expiryDate ? ` — Expires: ${data.expiryDate}` : ''}`,
    `**Urgency:** ${data.urgency}`,
    ``,
    `## Audience`,
    `**Target Audience:** ${data.targetAudience}`,
    `**Regions:** ${data.regions.join(', ')}`,
    ``,
    `## Copy`,
    `### Primary Copy`,
    data.copyPrimary,
    ``,
    data.copyVariants ? `### Variants / A-B Copy\n${data.copyVariants}\n` : '',
    data.hashtagSuggestions ? `**Hashtag Suggestions:** ${data.hashtagSuggestions}\n` : '',
    data.linkUrl ? `**Link URL:** ${data.linkUrl}` : '',
    data.utmCampaign ? `**UTM Campaign:** ${data.utmCampaign}` : '',
    ``,
    data.mediaRequired ? `## Media\n${data.mediaDescription}\n${data.assetUrl ? `**Asset URL:** ${data.assetUrl}` : ''}\n` : '',
    data.isPaid ? `## Paid Promotion\n**Budget:** ${data.budget}\n**Targeting:** ${data.targeting}\n` : '',
    data.approvalRequired ? `## Approval\n**Approval Contact:** ${data.approvalContact}\n` : '',
    data.notes ? `## Notes\n${data.notes}` : '',
  ].filter(Boolean).join('\n')
}

export function SocialMediaPlatform({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState<SocialBriefFormData | null>(null)

  const { register, control, handleSubmit, watch, reset } = useForm<SocialBriefFormData>({
    defaultValues: {
      platforms: [],
      regions: [],
      mediaRequired: false,
      isPaid: false,
      approvalRequired: false,
      urgency: 'standard',
      postFormat: '',
      objective: '',
    },
  })

  const isPaid = watch('isPaid')
  const mediaRequired = watch('mediaRequired')
  const approvalRequired = watch('approvalRequired')

  function onSubmit(data: SocialBriefFormData) {
    setSubmitted(data)
  }

  const NavBar = () => (
    <div className="sticky top-0 z-10 bg-[#0A66C2] px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png" alt="Ninety One" className="h-5 w-auto" />
        <div className="pl-4 border-l border-white/20">
          <span className="text-white/80 text-xs tracking-[0.2em] uppercase font-semibold">Social Media Briefing</span>
        </div>
      </div>
      <button type="button" onClick={onClose} className="text-white/60 hover:text-white text-xs px-3 py-1.5 rounded border border-white/20 hover:border-white/40 transition-colors">
        ← Back to Email Platform
      </button>
    </div>
  )

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f3f2ef] dark:bg-[#1b1f23] overflow-y-auto">
        <NavBar />
        <div className="max-w-3xl mx-auto py-10 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#0A66C2]/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Brief Submitted</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your social media brief is ready.</p>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              {[
                ['Campaign', submitted.campaignName],
                ['Platforms', submitted.platforms.join(', ')],
                ['Format', submitted.postFormat],
                ['Objective', submitted.objective],
                ['Publish Date', submitted.publishDate],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="flex gap-2">
                  <dt className="text-gray-500 w-32 shrink-0">{k}</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">{v as string}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={() => { setSubmitted(null); reset() }}
                className="px-5 py-2 text-sm font-medium bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors">
                New Brief
              </button>
              <button type="button" onClick={() => navigator.clipboard.writeText(buildMarkdown(submitted))}
                className="px-5 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Copy as Markdown
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#f3f2ef] dark:bg-[#1b1f23] overflow-y-auto">
      <NavBar />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Campaign Overview */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Campaign Overview</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <input type="text" {...register('campaignName', { required: true })}
                placeholder="e.g. Taking Stock Q2 2026 — LinkedIn" className={inputCls} />
            </div>
            <Controller name="platforms" control={control}
              render={({ field }) => (
                <ChipSelect label="Platforms" options={PLATFORMS} value={field.value} onChange={field.onChange} />
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Post Format</label>
                <select {...register('postFormat')} className={inputCls}>
                  <option value="">— Select —</option>
                  {POST_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Campaign Objective</label>
                <select {...register('objective')} className={inputCls}>
                  <option value="">— Select —</option>
                  {OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Publish Date <span className="text-red-500">*</span></label>
                <input type="date" {...register('publishDate', { required: true })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expiry / End Date</label>
                <input type="date" {...register('expiryDate')} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Urgency</label>
              <select {...register('urgency')} className={inputCls}>
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Audience */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Target Audience</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Audience Description</label>
              <textarea {...register('targetAudience')} placeholder="e.g. Financial advisers aged 35–55, UK market, interested in EM fixed income…" rows={3} className={inputCls + ' resize-none'} />
            </div>
            <Controller name="regions" control={control}
              render={({ field }) => (
                <ChipSelect label="Regions" options={REGIONS} value={field.value as string[]} onChange={field.onChange} />
              )}
            />
          </div>

          {/* Copy */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Copy & Content</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Character limits vary by platform. LinkedIn: 3000 / X: 280 / Instagram: 2200</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Primary Copy <span className="text-red-500">*</span></label>
              <textarea {...register('copyPrimary', { required: true })} placeholder="Write the main post copy here…" rows={5} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Copy Variants / A-B Test</label>
              <textarea {...register('copyVariants')} placeholder="Alternative copy versions (label each clearly)…" rows={3} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hashtag Suggestions</label>
              <input type="text" {...register('hashtagSuggestions')} placeholder="#NinetyOne #EmergingMarkets #FixedIncome" className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Link URL</label>
                <input type="url" {...register('linkUrl')} placeholder="https://ninetyone.com/..." className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">UTM Campaign</label>
                <input type="text" {...register('utmCampaign')} placeholder="e.g. social-li-em-q2-2026" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Media & Assets</h3>
            </div>
            <Controller name="mediaRequired" control={control}
              render={({ field }) => (
                <Toggle value={field.value} onChange={field.onChange} label="Media required" description="Image, video, or graphic needed for this post" />
              )}
            />
            {mediaRequired && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Media Description / Art Direction</label>
                  <textarea {...register('mediaDescription')} placeholder="Describe the visual needed — dimensions, style, subject matter…" rows={3} className={inputCls + ' resize-none'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Existing Asset URL</label>
                  <input type="url" {...register('assetUrl')} placeholder="https://..." className={inputCls} />
                </div>
              </>
            )}
          </div>

          {/* Paid Promotion */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Paid Promotion</h3>
            </div>
            <Controller name="isPaid" control={control}
              render={({ field }) => (
                <Toggle value={field.value} onChange={field.onChange} label="Paid / sponsored promotion" description="This post will be boosted or run as paid advertising" />
              )}
            />
            {isPaid && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Budget</label>
                  <input type="text" {...register('budget')} placeholder="e.g. £2,000 / 30 days" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Targeting Parameters</label>
                  <input type="text" {...register('targeting')} placeholder="e.g. UK IFAs, job title: Financial Adviser" className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* Approval & Notes */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Approval & Notes</h3>
            </div>
            <Controller name="approvalRequired" control={control}
              render={({ field }) => (
                <Toggle value={field.value} onChange={field.onChange} label="Compliance approval required" />
              )}
            />
            {approvalRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Approval Contact</label>
                <input type="text" {...register('approvalContact')} placeholder="Name and email of approver" className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Additional Notes</label>
              <textarea {...register('notes')} placeholder="Any other context or instructions…" rows={3} className={inputCls + ' resize-none'} />
            </div>
            <div className="pt-2 flex gap-3">
              <button type="submit"
                className="px-6 py-2.5 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition-colors">
                Submit Brief
              </button>
              <button type="button" onClick={() => reset()}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
