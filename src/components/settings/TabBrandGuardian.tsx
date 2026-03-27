import { useState, useCallback } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { BrandGuardianConfig } from '../../types/settings.types'

type ConfigKey = keyof BrandGuardianConfig

interface NumberField {
  key: ConfigKey
  label: string
  description: string
  min: number
  max: number
  step?: number
  unit?: string
}

interface ToggleField {
  key: ConfigKey
  label: string
  description: string
}

const NUMBER_FIELDS: NumberField[] = [
  { key: 'minimumScore', label: 'Minimum Score', description: 'Briefs scoring below this threshold cannot proceed past Brand Review.', min: 0, max: 100, unit: '%' },
  { key: 'subjectLineMaxLength', label: 'Subject Line Max Length', description: 'Maximum character count for subject lines.', min: 20, max: 120, unit: 'chars' },
  { key: 'subjectLineMobileOptimal', label: 'Subject Line Mobile Optimal', description: 'Characters visible on most mobile inbox previews. Lines exceeding this trigger a warning.', min: 20, max: 80, unit: 'chars' },
  { key: 'previewTextMinLength', label: 'Preview Text Min Length', description: 'Preview text shorter than this triggers a warning.', min: 10, max: 80, unit: 'chars' },
  { key: 'bodyIntroMaxLength', label: 'Body Intro Max Length', description: 'Body intros exceeding this length receive a readability warning.', min: 50, max: 500, unit: 'chars' },
  { key: 'headlineWarnLength', label: 'Headline Warn Length', description: 'Headlines longer than this may wrap on mobile.', min: 30, max: 120, unit: 'chars' },
  { key: 'sectionBodyWarnLength', label: 'Section Body Warn Length', description: 'Content sections exceeding this character count receive a warning.', min: 100, max: 800, unit: 'chars' },
  { key: 'ctaLabelMaxLength', label: 'CTA Label Max Length', description: 'Maximum character count for call-to-action button labels.', min: 10, max: 50, unit: 'chars' },
  { key: 'maxExclamationMarks', label: 'Max Exclamation Marks', description: 'Content exceeding this count of exclamation marks triggers a brand voice warning.', min: 0, max: 10 },
  { key: 'minDaysBetweenApprovalAndSend', label: 'Min Days: Approval to Send', description: 'Minimum business days between content approval and send date.', min: 0, max: 14, unit: 'days' },
]

const TOGGLE_FIELDS: ToggleField[] = [
  { key: 'requireNinetyOneDomain', label: 'Require @ninetyone.com Domain', description: 'Warn when from/reply-to addresses use external domains.' },
  { key: 'enableAccessibilityChecks', label: 'Accessibility Checks', description: 'Check hero image alt text quality and WCAG contrast concerns.' },
  { key: 'enableComplianceChecks', label: 'Compliance Checks', description: 'Validate unsubscribe links, legal disclaimers, and Pardot list IDs.' },
  { key: 'enableBrandVoiceChecks', label: 'Brand Voice Checks', description: 'Review subject line tone, spam triggers, capitalisation, and CTA language.' },
  { key: 'enableContentStructureChecks', label: 'Content Structure Checks', description: 'Validate section counts, headline length, module selection, and email type alignment.' },
  { key: 'enableAudienceAlignmentChecks', label: 'Audience Alignment Checks', description: 'Check region, channel, and client group targeting consistency.' },
  { key: 'enableBrandProtectionChecks', label: 'Brand Protection Checks', description: 'Verify brand name spelling, domain usage, asset URLs, and deadline timing.' },
]

export function TabBrandGuardian() {
  const { settings, updateSettings } = useSettings()
  const config = settings.brandGuardian

  const updateConfig = useCallback((patch: Partial<BrandGuardianConfig>) => {
    updateSettings({
      brandGuardian: { ...config, ...patch },
    })
  }, [config, updateSettings])

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Brand Guardian Configuration</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
        Fine-tune the automated brand review thresholds, toggle check categories, and manage word lists.
      </p>

      {/* Minimum score — highlighted */}
      <div className="bg-[#134848]/5 dark:bg-[#fbaa96]/5 border border-[#134848]/20 dark:border-[#fbaa96]/20 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-[#134848] dark:text-[#fbaa96]">Minimum Pass Score</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Briefs scoring below this cannot proceed past Brand Review.</p>
          </div>
          <span className="text-2xl font-bold text-[#134848] dark:text-[#fbaa96]">{config.minimumScore}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={config.minimumScore}
          onChange={(e) => updateConfig({ minimumScore: Number(e.target.value) })}
          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#134848] dark:accent-[#fbaa96]"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>0% (disabled)</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Numeric thresholds */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Thresholds</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NUMBER_FIELDS.filter((f) => f.key !== 'minimumScore').map((field) => (
            <div key={field.key} className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                <span className="text-xs font-mono text-[#134848] dark:text-[#fbaa96]">
                  {config[field.key] as number}{field.unit ? ` ${field.unit}` : ''}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">{field.description}</p>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                value={config[field.key] as number}
                onChange={(e) => updateConfig({ [field.key]: Number(e.target.value) })}
                className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#134848] dark:accent-[#fbaa96]"
              />
              <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                <span>{field.min}</span>
                <span>{field.max}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Check category toggles */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Review Categories</h4>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
          Disable specific categories to skip those checks in the Brand Guardian review.
        </p>
        <div className="space-y-1">
          {TOGGLE_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <button
                type="button"
                onClick={() => updateConfig({ [field.key]: !config[field.key] })}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                  config[field.key] as boolean ? 'bg-[#134848] dark:bg-[#fbaa96]' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  config[field.key] as boolean ? 'left-[18px]' : 'left-0.5'
                }`} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">{field.label}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{field.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Word lists */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Word Lists</h4>

        <WordListEditor
          label="Spam Trigger Words"
          description="Subject lines containing these words trigger a deliverability warning."
          items={config.spamTriggerWords}
          onChange={(words) => updateConfig({ spamTriggerWords: words })}
        />

        <WordListEditor
          label="Incorrect Brand Name Variants"
          description="Content containing these strings triggers a brand protection warning. The correct form is 'Ninety One'."
          items={config.brandNameVariants}
          onChange={(words) => updateConfig({ brandNameVariants: words })}
        />
      </div>
    </div>
  )
}

function WordListEditor({
  label,
  description,
  items,
  onChange,
}: {
  label: string
  description: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [newWord, setNewWord] = useState('')

  const addWord = () => {
    const word = newWord.trim().toLowerCase()
    if (!word || items.includes(word)) return
    onChange([...items, word])
    setNewWord('')
  }

  const removeWord = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-3">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">{description}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.map((word, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
          >
            {word}
            <button
              type="button"
              onClick={() => removeWord(index)}
              className="text-gray-400 hover:text-red-500 ml-0.5"
            >
              &times;
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-[11px] text-gray-400 italic">No words configured</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord() } }}
          placeholder="Add a word..."
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs px-2.5 py-1.5 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={addWord}
          className="text-xs font-medium text-[#134848] dark:text-[#fbaa96] px-2.5 py-1.5 border border-[#134848]/30 dark:border-[#fbaa96]/30 rounded-md hover:bg-[#134848]/5 dark:hover:bg-[#fbaa96]/5 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
