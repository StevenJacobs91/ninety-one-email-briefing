import { useEffect, useState, useMemo } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_MODULES, REGION_LEGAL_DISCLAIMERS, BRAND_THEMES } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { FieldTextarea } from '../ui/FieldTextarea'
import { FieldToggle } from '../ui/FieldToggle'
import { RichTextarea } from '../ui/RichTextarea'

// Derive unique categories from module list
const ALL_CATEGORIES = Array.from(new Set(EMAIL_MODULES.map((m) => m.category)))

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Headers': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="5" rx="1"/>
      <rect x="3" y="10" width="18" height="3" rx="1" opacity="0.4"/>
      <rect x="3" y="15" width="12" height="3" rx="1" opacity="0.4"/>
    </svg>
  ),
  'Content': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="3" rx="1"/>
      <rect x="3" y="8" width="18" height="3" rx="1"/>
      <rect x="3" y="13" width="14" height="3" rx="1"/>
      <rect x="3" y="18" width="10" height="3" rx="1"/>
    </svg>
  ),
  'CTAs': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="8" rx="4"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  'Events': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="17" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  'Speakers': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="3"/>
      <circle cx="16" cy="8" r="3"/>
      <path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6"/>
    </svg>
  ),
  'Articles': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="8" height="8" rx="1"/>
      <rect x="13" y="3" width="8" height="3" rx="1"/>
      <rect x="13" y="8" width="8" height="3" rx="1"/>
      <rect x="3" y="13" width="18" height="3" rx="1"/>
      <rect x="3" y="18" width="14" height="3" rx="1"/>
    </svg>
  ),
  'Media': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <polygon points="10,9 10,15 15,12" fill="currentColor" stroke="none"/>
    </svg>
  ),
  'Navigation': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="10" width="18" height="4" rx="2"/>
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  'Footers': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="3" rx="1" opacity="0.4"/>
      <rect x="3" y="8" width="18" height="3" rx="1" opacity="0.4"/>
      <rect x="3" y="16" width="18" height="5" rx="1"/>
    </svg>
  ),
}

export function StepContent() {
  const { register, watch, control, formState: { errors }, setValue, getValues } = useFormContext<BriefFormData>()

  // Default headline to campaign name if headline is empty
  const campaignName = watch('campaign.campaignName')
  useEffect(() => {
    const currentHeadline = getValues('content.headline')
    if (!currentHeadline && campaignName) {
      setValue('content.headline', campaignName)
    }
  }, [campaignName, getValues, setValue])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'content.sections',
  })

  const headline = watch('content.headline') ?? ''
  const subHeadline = watch('content.subHeadline') ?? ''
  const bodyIntro = watch('content.bodyIntro') ?? ''
  const ctaLabel = watch('content.cta.label') ?? ''
  const selectedModules = watch('content.modules') ?? []
  const moduleNotes = watch('content.moduleNotes') ?? {}
  const selectedRegions = watch('audience.region') ?? []
  const legalDisclaimer = watch('content.legalDisclaimer') ?? ''
  const selectedTheme = watch('campaign.theme')
  const accentColour = useMemo(() => {
    const theme = BRAND_THEMES.find((t) => t.id === selectedTheme)
    return theme?.accent ?? '#fbaa96'
  }, [selectedTheme])

  // Derive region default disclaimer for helper text
  const regionDefaultDisclaimer = useMemo(() => {
    if (selectedRegions.length === 0) return null
    // Use the first matched region that has a disclaimer
    for (const region of selectedRegions) {
      if (REGION_LEGAL_DISCLAIMERS[region]) return REGION_LEGAL_DISCLAIMERS[region]
    }
    return null
  }, [selectedRegions])

  // Module category filter
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const filteredModules = useMemo(
    () => activeCategory ? EMAIL_MODULES.filter((m) => m.category === activeCategory) : EMAIL_MODULES,
    [activeCategory]
  )

  // Collapsed section state — new sections start expanded
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleModule(moduleId: string) {
    const next = selectedModules.includes(moduleId)
      ? selectedModules.filter((m) => m !== moduleId)
      : [...selectedModules, moduleId]
    setValue('content.modules', next, { shouldValidate: true })
  }

  function moveModuleUp(index: number) {
    if (index === 0) return
    const next = [...selectedModules]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setValue('content.modules', next, { shouldValidate: true })
  }

  function moveModuleDown(index: number) {
    if (index === selectedModules.length - 1) return
    const next = [...selectedModules]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setValue('content.modules', next, { shouldValidate: true })
  }

  function setModuleNote(moduleId: string, note: string) {
    const current = getValues('content.moduleNotes') ?? {}
    setValue('content.moduleNotes', { ...current, [moduleId]: note }, { shouldValidate: false })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Content</h2>

      <FieldText
        label="Headline"
        registration={register('content.headline')}
        error={errors.content?.headline}
        required
        placeholder="Max 80 characters"
        maxLength={80}
        currentLength={headline.length}
      />

      <FieldText
        label="Sub-headline"
        registration={register('content.subHeadline')}
        error={errors.content?.subHeadline}
        placeholder="Max 80 characters — maps to header subheading in email template"
        maxLength={80}
        currentLength={subHeadline.length}
      />

      <RichTextarea
        label="Body Intro"
        value={bodyIntro}
        onChange={(html) => setValue('content.bodyIntro', html, { shouldValidate: true })}
        maxLength={1000}
        required
        error={errors.content?.bodyIntro}
        placeholder="Max 1000 characters — use the toolbar to bold, italicise, underline, or add links"
        rows={6}
        accentColour={accentColour}
      />

      {/* Email Modules */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Modules
          </label>
          {selectedModules.length > 0 && (
            <span className="text-xs text-[#134848] dark:text-[#fbaa96] font-medium">
              {selectedModules.length} selected
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Select the template modules to include in your email.
        </p>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === null
                ? 'bg-[#134848] text-white border-[#134848]'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            All ({EMAIL_MODULES.length})
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const count = EMAIL_MODULES.filter((m) => m.category === cat).length
            const selectedInCat = EMAIL_MODULES.filter((m) => m.category === cat && selectedModules.includes(m.id)).length
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#134848] text-white border-[#134848]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                {cat} ({count}){selectedInCat > 0 && <span className="ml-1 opacity-75">·{selectedInCat}</span>}
              </button>
            )
          })}
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-72 overflow-y-auto">
          {filteredModules.map((mod) => {
            const isSelected = selectedModules.includes(mod.id)
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => toggleModule(mod.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors ${
                  isSelected ? 'bg-[#134848]/5 dark:bg-[#134848]/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 text-xs ${
                    isSelected
                      ? 'bg-[#134848] border-[#134848] text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isSelected ? '\u2713' : ''}
                </span>
                <span className={`mt-0.5 shrink-0 ${isSelected ? 'text-[#134848] dark:text-[#fbaa96]' : 'text-gray-400 dark:text-gray-500'}`}>
                  {CATEGORY_ICONS[mod.category]}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{mod.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{mod.description}</p>
                </div>
              </button>
            )
          })}
          {filteredModules.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No modules in this category.</p>
          )}
        </div>

        {/* Selected modules editable cards */}
        {selectedModules.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Selected Modules ({selectedModules.length})
            </p>
            <div className="space-y-2">
              {selectedModules.map((modId, index) => {
                const mod = EMAIL_MODULES.find((m) => m.id === modId)
                if (!mod) return null
                const note = moduleNotes[modId] ?? ''
                return (
                  <div
                    key={modId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 dark:text-gray-500 shrink-0">
                          {CATEGORY_ICONS[mod.category]}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{mod.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{mod.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => moveModuleUp(index)}
                          disabled={index === 0}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                          title="Move up"
                          aria-label="Move module up"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 15l-6-6-6 6"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveModuleDown(index)}
                          disabled={index === selectedModules.length - 1}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                          title="Move down"
                          aria-label="Move module down"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleModule(modId)}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove module"
                          aria-label={`Remove ${mod.label}`}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <textarea
                        value={note}
                        onChange={(e) => setModuleNote(modId, e.target.value)}
                        placeholder="Notes / instructions for this module (optional)"
                        rows={2}
                        className="w-full text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#134848]/30 focus:border-[#134848] resize-none placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic sections */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sections<span className="text-red-500 ml-0.5">*</span>
          </label>
          {fields.length < 4 && (
            <button
              type="button"
              onClick={() =>
                append({
                  id: uuidv4(),
                  heading: '',
                  body: '',
                  imageRequired: false,
                  imageDescription: '',
                })
              }
              className="text-xs font-medium text-[#134848] dark:text-[#fbaa96] hover:text-[#0d3232] px-2 py-1 rounded border border-[#134848]/30 dark:border-[#fbaa96]/30 hover:bg-[#134848]/5 transition-colors"
            >
              + Add Section
            </button>
          )}
        </div>

        {errors.content?.sections?.message && (
          <p className="text-xs text-red-600 mb-2">{errors.content.sections.message}</p>
        )}

        {fields.map((field, index) => {
          const sectionBody = watch(`content.sections.${index}.body`) ?? ''
          const sectionHeading = watch(`content.sections.${index}.heading`) ?? ''
          const isCollapsed = collapsedSections.has(field.id)

          return (
            <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg mb-3 overflow-hidden">
              {/* Section header — click to collapse */}
              <div
                className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 cursor-pointer select-none"
                onClick={() => toggleSection(field.id)}
                role="button"
                aria-expanded={!isCollapsed}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleSection(field.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">Section {index + 1}</span>
                  {isCollapsed && sectionHeading && (
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{sectionHeading}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); remove(index) }}
                      className="text-gray-400 hover:text-red-500 text-base leading-none px-1"
                      title="Remove section"
                      aria-label={`Remove section ${index + 1}`}
                    >
                      &times;
                    </button>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {!isCollapsed && (
                <div className="p-4">
                  <FieldText
                    label="Heading"
                    registration={register(`content.sections.${index}.heading`)}
                    error={errors.content?.sections?.[index]?.heading}
                    required
                    maxLength={60}
                    currentLength={sectionHeading.length}
                  />

                  <FieldTextarea
                    label="Body"
                    registration={register(`content.sections.${index}.body`)}
                    error={errors.content?.sections?.[index]?.body}
                    required
                    maxLength={500}
                    currentLength={sectionBody.length}
                    rows={3}
                  />

                  <FieldToggle
                    label="Image required for this section"
                    registration={register(`content.sections.${index}.imageRequired`)}
                  />

                  <FieldText
                    label="Image Description / Alt Text"
                    registration={register(`content.sections.${index}.imageDescription`)}
                    placeholder="Art direction hint or alt text"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Call to Action</p>

        <FieldText
          label="Button Label"
          registration={register('content.cta.label')}
          error={errors.content?.cta?.label}
          required
          placeholder="Max 30 characters"
          maxLength={30}
          currentLength={ctaLabel.length}
        />

        <FieldText
          label="URL"
          registration={register('content.cta.url')}
          error={errors.content?.cta?.url}
          required
          placeholder="https://..."
          validateUrl
        />

        <FieldToggle
          label="Open in new tab"
          registration={register('content.cta.openInNewTab')}
        />
      </div>

      <div className="mb-4">
        <FieldTextarea
          label="Legal Disclaimer"
          registration={register('content.legalDisclaimer')}
          placeholder={regionDefaultDisclaimer ? 'Leave blank to use region default, or enter a custom disclaimer' : 'Optional — overrides region default'}
          rows={2}
        />
        {regionDefaultDisclaimer && !legalDisclaimer && (
          <div className="mt-1 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Region default ({selectedRegions[0]}):
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{regionDefaultDisclaimer}</p>
            <button
              type="button"
              onClick={() => setValue('content.legalDisclaimer', regionDefaultDisclaimer)}
              className="mt-2 text-xs text-[#134848] dark:text-[#fbaa96] font-medium hover:underline"
            >
              Use this disclaimer →
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <FieldToggle
          label="Include unsubscribe link"
          registration={register('content.includeUnsubscribe')}
          description="Required for marketing sends"
        />
        {!watch('content.includeUnsubscribe') && (
          <div className="ml-7 -mt-2 mb-2 flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
            <span className="text-red-500 text-sm font-bold shrink-0">!</span>
            <p className="text-xs text-red-700 dark:text-red-400">
              Removing the unsubscribe link violates CAN-SPAM, GDPR, and POPIA regulations. Marketing emails <strong>must</strong> include an unsubscribe link. Only disable this for transactional emails.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
