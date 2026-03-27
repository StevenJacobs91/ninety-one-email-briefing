import { useEffect } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_MODULES } from '../../lib/constants'
import { FieldText } from '../ui/FieldText'
import { FieldTextarea } from '../ui/FieldTextarea'
import { FieldToggle } from '../ui/FieldToggle'

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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Modules
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Select the template modules to include in your email. The order can be adjusted during production.
        </p>
        <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
          {EMAIL_MODULES.map((mod) => {
            const isSelected = selectedModules.includes(mod.id)
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => toggleModule(mod.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                  isSelected ? 'bg-[#134848]/5' : 'hover:bg-gray-50'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 text-xs ${
                    isSelected
                      ? 'bg-[#134848] border-[#134848] text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected ? '\u2713' : ''}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{mod.label}</p>
                  <p className="text-xs text-gray-500">{mod.description}</p>
                </div>
              </button>
            )
          })}
        </div>
        {selectedModules.length > 0 && (
          <p className="text-xs text-gray-500 mt-1.5">
            {selectedModules.length} module{selectedModules.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Dynamic sections */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
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
              className="text-xs font-medium text-[#134848] hover:text-[#0d3232] px-2 py-1 rounded border border-[#134848]/30 hover:bg-[#134848]/5 transition-colors"
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

          return (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4 mb-3 relative">
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg leading-none"
                  title="Remove section"
                >
                  &times;
                </button>
              )}

              <p className="text-xs font-medium text-gray-400 mb-2">Section {index + 1}</p>

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
          )
        })}
      </div>

      {/* CTA */}
      <div className="border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Call to Action</p>

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
        />

        <FieldToggle
          label="Open in new tab"
          registration={register('content.cta.openInNewTab')}
        />
      </div>

      <FieldTextarea
        label="Legal Disclaimer"
        registration={register('content.legalDisclaimer')}
        placeholder="Optional — overrides region default"
        rows={2}
      />

      <FieldToggle
        label="Include unsubscribe link"
        registration={register('content.includeUnsubscribe')}
        description="Required for marketing sends"
      />
    </div>
  )
}
