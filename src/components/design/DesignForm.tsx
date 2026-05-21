import { useFormContext, Controller } from 'react-hook-form'
import type { DesignAssetTypeId, DesignBriefFormData, DesignFieldSettingsMap, DesignAttachment } from '../../types/design.types'
import { DESIGN_ASSET_TYPES } from '../../lib/designConstants'
import { FieldAttachments } from './fields/FieldAttachments'
import { FieldImageUploader } from './fields/FieldImageUploader'
import { FieldColourTheme } from './fields/FieldColourTheme'

interface DesignFormProps {
  assetTypeId: DesignAssetTypeId
  fieldOverrides?: DesignFieldSettingsMap
  // External state for non-RHF fields
  attachments: DesignAttachment[]
  onAttachmentsChange: (v: DesignAttachment[]) => void
  imageUrls: string[]
  onImageUrlsChange: (v: string[]) => void
  maxAttachments?: number
}

export function DesignForm({
  assetTypeId,
  fieldOverrides,
  attachments,
  onAttachmentsChange,
  imageUrls,
  onImageUrlsChange,
  maxAttachments = 10,
}: DesignFormProps) {
  const { register, control, watch, formState: { errors } } = useFormContext<DesignBriefFormData>()

  const assetType = DESIGN_ASSET_TYPES.find((t) => t.id === assetTypeId)
  if (!assetType) return null

  // Apply field overrides: filter hidden, sort by order
  let fields = assetType.fields
  if (fieldOverrides) {
    fields = fields
      .filter((f) => {
        const override = fieldOverrides[f.id]
        return override ? override.visible : true
      })
      .sort((a, b) => {
        const orderA = fieldOverrides[a.id]?.order ?? 999
        const orderB = fieldOverrides[b.id]?.order ?? 999
        return orderA - orderB
      })
  }

  // Check conditional visibility
  const isFieldVisible = (fieldId: string): boolean => {
    const fieldDef = assetType.fields.find((f) => f.id === fieldId)
    if (!fieldDef?.conditionalOn) return true
    const { field, values } = fieldDef.conditionalOn
    const watchedValue = watch(field as keyof DesignBriefFormData)
    if (watchedValue === undefined || watchedValue === null) return false
    const strVal = String(watchedValue)
    return values.includes(strVal)
  }

  const getError = (fieldId: string): string | undefined => {
    const err = errors[fieldId as keyof DesignBriefFormData]
    if (!err) return undefined
    if (typeof err === 'object' && 'message' in err) return err.message as string
    return undefined
  }

  const INPUT_CLASS = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40'
  const LABEL_CLASS = 'block text-xs font-medium text-gray-500 dark:text-gray-400 tracking-[0.12em] uppercase mb-1.5'
  const ERROR_CLASS = 'text-xs text-red-600 dark:text-red-400 mt-1'

  return (
    <div className="space-y-6">
      {fields.map((field) => {
        if (!isFieldVisible(field.id)) return null

        const fieldId = `design-field-${field.id}`
        const errorMsg = getError(field.id)

        if (field.type === 'attachments') {
          return (
            <div key={field.id}>
              <FieldAttachments
                value={attachments}
                onChange={onAttachmentsChange}
                label={field.label}
                helpText={field.helpText}
                maxFiles={maxAttachments}
              />
            </div>
          )
        }

        if (field.type === 'image-uploader') {
          return (
            <div key={field.id}>
              <FieldImageUploader
                value={imageUrls}
                onChange={onImageUrlsChange}
                label={field.label}
                helpText={field.helpText}
              />
            </div>
          )
        }

        if (field.type === 'theme') {
          return (
            <div key={field.id}>
              <Controller
                name="colourTheme"
                control={control}
                render={({ field: rhfField }) => (
                  <FieldColourTheme
                    value={rhfField.value ?? ''}
                    onChange={rhfField.onChange}
                    label={field.label}
                  />
                )}
              />
            </div>
          )
        }

        if (field.type === 'dimensions') {
          return (
            <div key={field.id} className="space-y-1.5">
              <label className={LABEL_CLASS}>
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <input
                    id={`${fieldId}-w`}
                    type="text"
                    placeholder="Width px"
                    {...register('resizeWidth')}
                    className={INPUT_CLASS}
                    aria-label="Width in pixels"
                  />
                </div>
                <span className="text-gray-400 dark:text-gray-600 text-sm font-medium">×</span>
                <div className="flex-1">
                  <input
                    id={`${fieldId}-h`}
                    type="text"
                    placeholder="Height px"
                    {...register('resizeHeight')}
                    className={INPUT_CLASS}
                    aria-label="Height in pixels"
                  />
                </div>
              </div>
              {field.helpText && <p className="text-xs text-gray-400 dark:text-gray-500">{field.helpText}</p>}
            </div>
          )
        }

        if (field.type === 'multi-select') {
          return (
            <div key={field.id} className="space-y-1.5">
              <label className={LABEL_CLASS}>
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <Controller
                name={field.id === 'gifPlacement' ? 'gifPlacement' : ('gifPlacement' as keyof DesignBriefFormData)}
                control={control}
                render={({ field: rhfField }) => {
                  const currentVals: string[] = Array.isArray(rhfField.value) ? (rhfField.value as string[]) : []
                  return (
                    <div className="flex flex-wrap gap-2">
                      {(field.options ?? []).map((opt) => {
                        const isChecked = currentVals.includes(opt.value)
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                rhfField.onChange(currentVals.filter((v) => v !== opt.value))
                              } else {
                                rhfField.onChange([...currentVals, opt.value])
                              }
                            }}
                            aria-pressed={isChecked}
                            className={`
                              px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                              ${isChecked
                                ? 'bg-brand-primary dark:bg-brand-accent text-white dark:text-brand-primary border-brand-primary dark:border-brand-accent'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }
                            `}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  )
                }}
              />
              {field.helpText && <p className="text-xs text-gray-400 dark:text-gray-500">{field.helpText}</p>}
            </div>
          )
        }

        if (field.type === 'radio') {
          return (
            <div key={field.id} className="space-y-1.5">
              <fieldset>
                <legend className={LABEL_CLASS}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </legend>
                <Controller
                  name={field.id as keyof DesignBriefFormData}
                  control={control}
                  render={({ field: rhfField }) => (
                    <div className="flex flex-wrap gap-2">
                      {(field.options ?? []).map((opt) => {
                        const isSelected = rhfField.value === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => rhfField.onChange(opt.value)}
                            aria-pressed={isSelected}
                            className={`
                              px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                              ${isSelected
                                ? 'bg-brand-primary dark:bg-brand-accent text-white dark:text-brand-primary border-brand-primary dark:border-brand-accent'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }
                            `}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                />
                {field.helpText && <p className="text-xs text-gray-400 dark:text-gray-500">{field.helpText}</p>}
                {errorMsg && <p className={ERROR_CLASS}>{errorMsg}</p>}
              </fieldset>
            </div>
          )
        }

        if (field.type === 'toggle') {
          return (
            <div key={field.id} className="space-y-1">
              <Controller
                name={field.id as keyof DesignBriefFormData}
                control={control}
                render={({ field: rhfField }) => {
                  const checked = Boolean(rhfField.value)
                  return (
                    <div className="flex items-start gap-3">
                      <button
                        id={fieldId}
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        onClick={() => rhfField.onChange(!checked)}
                        className={`
                          relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5
                          focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40
                          ${checked ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-200 dark:bg-gray-700'}
                        `}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </button>
                      <div>
                        <label htmlFor={fieldId} className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                          {field.label}
                        </label>
                        {field.helpText && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{field.helpText}</p>}
                      </div>
                    </div>
                  )
                }}
              />
            </div>
          )
        }

        if (field.type === 'select') {
          return (
            <div key={field.id} className="space-y-1.5">
              <label htmlFor={fieldId} className={LABEL_CLASS}>
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <select
                id={fieldId}
                {...register(field.id as keyof DesignBriefFormData)}
                className={INPUT_CLASS}
              >
                <option value="">Select…</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {field.helpText && <p className="text-xs text-gray-400 dark:text-gray-500">{field.helpText}</p>}
              {errorMsg && <p className={ERROR_CLASS}>{errorMsg}</p>}
            </div>
          )
        }

        if (field.type === 'textarea') {
          const maxLen = field.maxLength
          return (
            <div key={field.id} className="space-y-1.5">
              <label htmlFor={fieldId} className={LABEL_CLASS}>
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <Controller
                name={field.id as keyof DesignBriefFormData}
                control={control}
                render={({ field: rhfField }) => {
                  const strVal = typeof rhfField.value === 'string' ? rhfField.value : ''
                  return (
                    <>
                      <textarea
                        id={fieldId}
                        value={strVal}
                        onChange={(e) => rhfField.onChange(e.target.value)}
                        placeholder={field.placeholder}
                        rows={field.rows ?? 3}
                        maxLength={maxLen}
                        className={`${INPUT_CLASS} resize-y`}
                      />
                      {maxLen && (
                        <p className={`text-xs text-right mt-0.5 ${strVal.length >= maxLen ? 'text-red-500' : 'text-gray-400 dark:text-gray-600'}`}>
                          {strVal.length}/{maxLen}
                        </p>
                      )}
                    </>
                  )
                }}
              />
              {field.helpText && <p className="text-xs text-gray-400 dark:text-gray-500">{field.helpText}</p>}
              {errorMsg && <p className={ERROR_CLASS}>{errorMsg}</p>}
            </div>
          )
        }

        if (field.type === 'date') {
          return (
            <div key={field.id} className="space-y-1.5">
              <label htmlFor={fieldId} className={LABEL_CLASS}>
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                id={fieldId}
                type="date"
                {...register(field.id as keyof DesignBriefFormData)}
                className={INPUT_CLASS}
              />
              {field.helpText && <p className="text-xs text-gray-400 dark:text-gray-500">{field.helpText}</p>}
              {errorMsg && <p className={ERROR_CLASS}>{errorMsg}</p>}
            </div>
          )
        }

        // Default: text input
        return (
          <div key={field.id} className="space-y-1.5">
            <label htmlFor={fieldId} className={LABEL_CLASS}>
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
              id={fieldId}
              type="text"
              placeholder={field.placeholder}
              {...register(field.id as keyof DesignBriefFormData)}
              className={INPUT_CLASS}
            />
            {field.helpText && <p className="text-xs text-gray-400 dark:text-gray-500">{field.helpText}</p>}
            {errorMsg && <p className={ERROR_CLASS}>{errorMsg}</p>}
          </div>
        )
      })}
    </div>
  )
}
