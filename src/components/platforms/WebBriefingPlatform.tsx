import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'

// ── Types ───────────────────────────────────────────────────────────────────

type Region =
  | 'Global' | 'UK' | 'South Africa' | 'International' | 'Botswana'
  | 'United States' | 'Namibia' | 'Canada' | 'LATAM' | 'Australia' | 'HK & Singapore'

type Audience =
  | 'Advisor' | 'Institutional' | 'Individual Investor' | 'Corporate Solutions'
  | 'Internal' | 'All'

type ContentType =
  | 'Article' | 'Video' | 'Podcast' | 'Infographic' | 'Report' | 'Webinar'
  | 'Fund Update' | 'Market Commentary' | 'Event' | 'Press Release'

type AssetClass =
  | 'Equities' | 'Fixed Income' | 'Multi-Asset' | 'Alternatives'
  | 'Money Market' | 'Real Assets' | 'Responsible Investment'

interface WebBriefFormData {
  // Article Details
  title: string
  summary: string
  author: string
  publishDate: string
  expiryDate: string
  contentType: ContentType | ''
  url: string

  // Regions & Audiences
  regions: Region[]
  audiences: Audience[]

  // Performance flags
  isPerformanceRelated: boolean
  performanceAsOf: string
  includePastPerformanceWarning: boolean

  // Seismic
  publishToSeismic: boolean
  seismicWorkspaceId: string
  seismicFolderId: string

  // Taxonomy
  contentTypes: ContentType[]
  assetClasses: AssetClass[]
  investmentTeams: string[]
  focusHubs: string[]
  insightHubs: string[]
  additionalTags: string
  longTermSeries: string[]
  limitedSeries: string[]
  strategyTags: string[]

  // Notes
  notes: string
  urgency: 'standard' | 'urgent'
}

// ── Constants ───────────────────────────────────────────────────────────────

const REGIONS: Region[] = [
  'Global', 'UK', 'South Africa', 'International', 'Botswana',
  'United States', 'Namibia', 'Canada', 'LATAM', 'Australia', 'HK & Singapore',
]

const AUDIENCES: Audience[] = [
  'Advisor', 'Institutional', 'Individual Investor',
  'Corporate Solutions', 'Internal', 'All',
]

const CONTENT_TYPES: ContentType[] = [
  'Article', 'Video', 'Podcast', 'Infographic', 'Report', 'Webinar',
  'Fund Update', 'Market Commentary', 'Event', 'Press Release',
]

const ASSET_CLASSES: AssetClass[] = [
  'Equities', 'Fixed Income', 'Multi-Asset', 'Alternatives',
  'Money Market', 'Real Assets', 'Responsible Investment',
]

const INVESTMENT_TEAMS = [
  '4Factor Equities', 'African & Middle Eastern Equities', 'Emerging Markets Fixed Income',
  'Global Equities', 'Global Fixed Income', 'Global Macro', 'Multi-Asset',
  'Quality', 'Responsible Investment', 'South African Fixed Income',
  'South African Multi-Asset', 'Thematic Equity',
]

const FOCUS_HUBS = [
  'Emerging Markets', 'ESG & Sustainability', 'Income', 'Infrastructure',
  'Innovation', 'Quality Investing', 'Responsible Investing',
]

const INSIGHT_HUBS = [
  'Adviser Hub', 'Institutional Hub', 'Investment Perspectives',
  'Market Outlook', 'Thought Leadership',
]

const LONG_TERM_SERIES = [
  'Emerging Market Perspectives', 'Global Lens', 'In Perspective',
  'Quality Investing Series', 'Sustainable Investing Series',
]

const STRATEGY_TAGS = [
  'Africa Flexible Income Fund', 'All Roads', 'Balanced Fund', 'Bond Fund',
  'Diversified Growth', 'Emerging Markets Equity', 'Global Franchise',
  'Global Macro Allocation', 'Global Quality Bond', 'Income Fund',
  'Quality', 'SA Fixed Income', 'Sustainable Global Equity',
]

// ── Multi-select chip ───────────────────────────────────────────────────────

function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  label,
  hint,
}: {
  options: readonly T[]
  value: T[]
  onChange: (next: T[]) => void
  label: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {hint && <span className="text-xs font-normal text-gray-400 ml-1.5">{hint}</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(selected ? value.filter((v) => v !== opt) : [...value, opt])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selected
                  ? 'bg-brand-primary text-white border-brand-primary'
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

// ── Section heading ─────────────────────────────────────────────────────────

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
    </div>
  )
}

// ── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"

// ── Submission summary ───────────────────────────────────────────────────────

function SubmissionSummary({ data, onReset }: { data: WebBriefFormData; onReset: () => void }) {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#134848" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Brief Submitted</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your web content brief has been submitted successfully.</p>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          {[
            ['Title', data.title],
            ['Content Type', data.contentType],
            ['Author', data.author],
            ['Publish Date', data.publishDate],
            ['Regions', data.regions.join(', ')],
            ['Audiences', data.audiences.join(', ')],
            ['Asset Classes', data.assetClasses.join(', ')],
            ['Investment Teams', data.investmentTeams.join(', ')],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k as string} className="flex gap-2">
              <dt className="text-gray-500 dark:text-gray-400 w-40 shrink-0">{k}</dt>
              <dd className="text-gray-900 dark:text-gray-100 font-medium">{v as string}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="px-5 py-2 text-sm font-medium bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-colors"
          >
            New Brief
          </button>
          <button
            type="button"
            onClick={() => {
              const md = buildMarkdown(data)
              navigator.clipboard.writeText(md)
            }}
            className="px-5 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Copy as Markdown
          </button>
        </div>
      </div>
    </div>
  )
}

function buildMarkdown(data: WebBriefFormData): string {
  const lines: string[] = [
    `# Web Content Brief — ${data.title}`,
    ``,
    `**Submitted:** ${new Date().toISOString().split('T')[0]}  `,
    `**Author:** ${data.author}  `,
    `**Publish Date:** ${data.publishDate}${data.expiryDate ? ` — Expires: ${data.expiryDate}` : ''}  `,
    `**Content Type:** ${data.contentType}  `,
    `**URL Slug:** ${data.url || '(TBD)'}`,
    ``,
    `## Summary`,
    data.summary,
    ``,
    `## Distribution`,
    `**Regions:** ${data.regions.join(', ') || 'None specified'}  `,
    `**Audiences:** ${data.audiences.join(', ') || 'None specified'}`,
    ``,
    `## Taxonomy`,
    `**Asset Classes:** ${data.assetClasses.join(', ') || '—'}  `,
    `**Investment Teams:** ${data.investmentTeams.join(', ') || '—'}  `,
    `**Focus Hubs:** ${data.focusHubs.join(', ') || '—'}  `,
    `**Insight Hubs:** ${data.insightHubs.join(', ') || '—'}  `,
    `**Strategy Tags:** ${data.strategyTags.join(', ') || '—'}  `,
    `**Additional Tags:** ${data.additionalTags || '—'}`,
    ``,
  ]
  if (data.isPerformanceRelated) {
    lines.push(`## Performance Data`)
    lines.push(`**Performance as of:** ${data.performanceAsOf}  `)
    lines.push(`**Past performance warning required:** ${data.includePastPerformanceWarning ? 'Yes' : 'No'}`)
    lines.push(``)
  }
  if (data.publishToSeismic) {
    lines.push(`## Seismic Publishing`)
    lines.push(`**Workspace ID:** ${data.seismicWorkspaceId}  `)
    lines.push(`**Folder ID:** ${data.seismicFolderId}`)
    lines.push(``)
  }
  if (data.notes) {
    lines.push(`## Notes`)
    lines.push(data.notes)
  }
  return lines.join('\n')
}

// ── Main component ───────────────────────────────────────────────────────────

export function WebBriefingPlatform({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState<WebBriefFormData | null>(null)
  const [activeSection, setActiveSection] = useState(0)

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<WebBriefFormData>({
    defaultValues: {
      regions: [],
      audiences: [],
      contentTypes: [],
      assetClasses: [],
      investmentTeams: [],
      focusHubs: [],
      insightHubs: [],
      additionalTags: '',
      longTermSeries: [],
      limitedSeries: [],
      strategyTags: [],
      isPerformanceRelated: false,
      includePastPerformanceWarning: true,
      publishToSeismic: false,
      urgency: 'standard',
    },
  })

  const sections = [
    'Article Details',
    'Distribution',
    'Performance & Compliance',
    'Seismic Publishing',
    'Taxonomy & Tags',
    'Review & Submit',
  ]

  function onSubmit(data: WebBriefFormData) {
    setSubmitted(data)
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-brand-bg-warm dark:bg-[#1a1714] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-brand-primary px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png" alt="Ninety One" className="h-5 w-auto" />
            <div className="pl-4 border-l border-white/20">
              <span className="text-white/70 text-xs tracking-[0.2em] uppercase font-semibold">Web Briefing Platform</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white text-xs px-3 py-1.5 rounded border border-white/20 hover:border-white/40 transition-colors">
            ← Back to Email Platform
          </button>
        </div>
        <SubmissionSummary data={submitted} onReset={() => { setSubmitted(null); reset(); setActiveSection(0) }} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-bg-warm dark:bg-[#1a1714] overflow-y-auto">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-brand-primary px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png" alt="Ninety One" className="h-5 w-auto" />
          <div className="pl-4 border-l border-white/20">
            <span className="text-white/70 text-xs tracking-[0.2em] uppercase font-semibold">Web Briefing Platform</span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-white/60 hover:text-white text-xs px-3 py-1.5 rounded border border-white/20 hover:border-white/40 transition-colors">
          ← Back to Email Platform
        </button>
      </div>

      <div className="max-w-5xl mx-auto py-8 px-4 flex gap-8">
        {/* Sidebar nav */}
        <aside className="w-48 shrink-0 hidden lg:block">
          <nav className="sticky top-24 space-y-0.5">
            {sections.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSection(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === i
                    ? 'bg-brand-primary text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] mr-2 ${
                  activeSection === i ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>{i + 1}</span>
                {s}
              </button>
            ))}
          </nav>
        </aside>

        {/* Form */}
        <main className="flex-1 min-w-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Mobile section pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
              {sections.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSection(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeSection === i
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {i + 1}. {s}
                </button>
              ))}
            </div>

            {/* ── Section 0: Article Details ── */}
            {activeSection === 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <SectionHeading title="Article Details" description="Core information about the content piece being published." />
                <Field label="Title" required error={errors.title?.message}>
                  <input type="text" {...register('title', { required: 'Title is required' })} placeholder="e.g. Navigating Emerging Market Volatility" className={inputCls} />
                </Field>
                <Field label="Summary / Abstract" required error={errors.summary?.message}>
                  <textarea {...register('summary', { required: 'Summary is required' })} placeholder="A brief description of the content (shown in search results and social previews)…" rows={4} className={inputCls + ' resize-none'} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Author" required error={errors.author?.message}>
                    <input type="text" {...register('author', { required: 'Author is required' })} placeholder="e.g. John Smith" className={inputCls} />
                  </Field>
                  <Field label="Content Type" required error={errors.contentType?.message}>
                    <select {...register('contentType', { required: 'Content type is required' })} className={inputCls}>
                      <option value="">— Select —</option>
                      {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Publish Date" required error={errors.publishDate?.message}>
                    <input type="date" {...register('publishDate', { required: 'Publish date is required' })} className={inputCls} />
                  </Field>
                  <Field label="Expiry Date">
                    <input type="date" {...register('expiryDate')} className={inputCls} />
                  </Field>
                </div>
                <Field label="URL Slug / Path">
                  <input type="text" {...register('url')} placeholder="e.g. /insights/emerging-market-volatility-2026" className={inputCls} />
                </Field>
                <Field label="Urgency">
                  <select {...register('urgency')} className={inputCls}>
                    <option value="standard">Standard</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </Field>
              </div>
            )}

            {/* ── Section 1: Distribution ── */}
            {activeSection === 1 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <SectionHeading title="Distribution" description="Select where and to whom this content should be published." />
                <Controller
                  name="regions"
                  control={control}
                  render={({ field }) => (
                    <ChipSelect
                      label="Regions"
                      hint="(select all that apply)"
                      options={REGIONS}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="audiences"
                  control={control}
                  render={({ field }) => (
                    <ChipSelect
                      label="Target Audiences"
                      hint="(select all that apply)"
                      options={AUDIENCES}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            )}

            {/* ── Section 2: Performance & Compliance ── */}
            {activeSection === 2 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <SectionHeading title="Performance & Compliance" description="Required for any content containing performance data or regulated disclosures." />
                <Controller
                  name="isPerformanceRelated"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => field.onChange(!field.value)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${field.value ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${field.value ? 'translate-x-4' : ''}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Contains performance data</p>
                        <p className="text-xs text-gray-400">Applies performance-related compliance rules</p>
                      </div>
                    </label>
                  )}
                />
                <Controller
                  name="isPerformanceRelated"
                  control={control}
                  render={({ field: parentField }) => (
                    <>
                      {parentField.value && (
                        <>
                          <Field label="Performance as of (date)">
                            <input type="date" {...register('performanceAsOf')} className={inputCls} />
                          </Field>
                          <Controller
                            name="includePastPerformanceWarning"
                            control={control}
                            render={({ field }) => (
                              <label className="flex items-center gap-3 cursor-pointer">
                                <div
                                  onClick={() => field.onChange(!field.value)}
                                  className={`relative w-10 h-6 rounded-full transition-colors ${field.value ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${field.value ? 'translate-x-4' : ''}`} />
                                </div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Include past performance warning</p>
                              </label>
                            )}
                          />
                        </>
                      )}
                    </>
                  )}
                />
              </div>
            )}

            {/* ── Section 3: Seismic Publishing ── */}
            {activeSection === 3 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <SectionHeading title="Seismic Publishing" description="Configure publishing to the Seismic content management platform." />
                <Controller
                  name="publishToSeismic"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => field.onChange(!field.value)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${field.value ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${field.value ? 'translate-x-4' : ''}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Publish to Seismic</p>
                        <p className="text-xs text-gray-400">Send this content to the Seismic content library</p>
                      </div>
                    </label>
                  )}
                />
                <Controller
                  name="publishToSeismic"
                  control={control}
                  render={({ field: parentField }) => (
                    <>
                      {parentField.value && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Seismic Workspace ID">
                            <input type="text" {...register('seismicWorkspaceId')} placeholder="e.g. ws_XXXXXXXX" className={inputCls} />
                          </Field>
                          <Field label="Seismic Folder ID">
                            <input type="text" {...register('seismicFolderId')} placeholder="e.g. folder_XXXXXXXX" className={inputCls} />
                          </Field>
                        </div>
                      )}
                    </>
                  )}
                />
              </div>
            )}

            {/* ── Section 4: Taxonomy ── */}
            {activeSection === 4 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <SectionHeading title="Taxonomy & Tags" description="Apply structured taxonomy to ensure the content is discoverable and correctly categorised." />
                <Controller
                  name="assetClasses"
                  control={control}
                  render={({ field }) => (
                    <ChipSelect label="Asset Classes" options={ASSET_CLASSES} value={field.value} onChange={field.onChange} />
                  )}
                />
                <Controller
                  name="investmentTeams"
                  control={control}
                  render={({ field }) => (
                    <ChipSelect label="Investment Teams" options={INVESTMENT_TEAMS} value={field.value as string[]} onChange={field.onChange} />
                  )}
                />
                <Controller
                  name="focusHubs"
                  control={control}
                  render={({ field }) => (
                    <ChipSelect label="Focus Hubs" options={FOCUS_HUBS} value={field.value as string[]} onChange={field.onChange} />
                  )}
                />
                <Controller
                  name="insightHubs"
                  control={control}
                  render={({ field }) => (
                    <ChipSelect label="Insight Hubs" options={INSIGHT_HUBS} value={field.value as string[]} onChange={field.onChange} />
                  )}
                />
                <Controller
                  name="longTermSeries"
                  control={control}
                  render={({ field }) => (
                    <ChipSelect label="Long-Term Series" options={LONG_TERM_SERIES} value={field.value as string[]} onChange={field.onChange} />
                  )}
                />
                <Controller
                  name="strategyTags"
                  control={control}
                  render={({ field }) => (
                    <ChipSelect label="Strategy Tags" options={STRATEGY_TAGS} value={field.value as string[]} onChange={field.onChange} />
                  )}
                />
                <Field label="Additional Tags">
                  <input
                    type="text"
                    {...register('additionalTags')}
                    placeholder="Comma-separated, e.g. inflation, central banks, rate cuts"
                    className={inputCls}
                  />
                </Field>
              </div>
            )}

            {/* ── Section 5: Review ── */}
            {activeSection === 5 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <SectionHeading title="Review & Submit" description="Add any final notes and submit the brief." />
                <Field label="Additional Notes">
                  <textarea
                    {...register('notes')}
                    placeholder="Any additional context, deadlines, or instructions for the web team…"
                    rows={5}
                    className={inputCls + ' resize-none'}
                  />
                </Field>
                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary-hover transition-colors"
                  >
                    Submit Brief
                  </button>
                  <button
                    type="button"
                    onClick={() => { reset(); setActiveSection(0) }}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Section navigation */}
            <div className="flex gap-2 justify-between">
              {activeSection > 0 && (
                <button type="button" onClick={() => setActiveSection(activeSection - 1)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  ← Previous
                </button>
              )}
              {activeSection < sections.length - 1 && (
                <button type="button" onClick={() => setActiveSection(activeSection + 1)}
                  className="ml-auto px-4 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-colors">
                  Next →
                </button>
              )}
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
