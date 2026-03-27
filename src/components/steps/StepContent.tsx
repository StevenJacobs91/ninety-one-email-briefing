import { useEffect, useState, useMemo } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_MODULES, REGION_LEGAL_DISCLAIMERS } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { FieldTextarea } from '../ui/FieldTextarea'
import { FieldToggle } from '../ui/FieldToggle'

// Derive unique categories from module list
const ALL_CATEGORIES = Array.from(new Set(EMAIL_MODULES.map((m) => m.category)))

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
  const bodyIntro = watch('content.bodyIntro') ?? ''
  const ctaLabel = watch('content.cta.label') ?? ''
  const selectedModules = watch('content.modules') ?? []
  const selectedRegions = watch('audience.region') ?? []
  const legalDisclaimer = watch('content.legalDisclaimer') ?? ''

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

      <FieldTextarea
        label="Body Intro"
        registration={register('content.bodyIntro')}
        error={errors.content?.bodyIntro}
        required
        placeholder="Max 300 characters"
        maxLength={300}
        currentLength={bodyIntro.length}
        rows={3}
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
