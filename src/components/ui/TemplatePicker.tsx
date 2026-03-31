import { useState } from 'react'
import { BRIEF_TEMPLATES, type BriefTemplate } from '../../lib/constants'

interface TemplatePickerProps {
  onSelect: (template: BriefTemplate) => void
  onSkip: () => void
}

export function TemplatePicker({ onSelect, onSkip }: TemplatePickerProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Start from a template</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Choose a template to pre-fill common fields and modules, or start with a blank brief.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {BRIEF_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl)}
            onMouseEnter={() => setHovered(tpl.id)}
            onMouseLeave={() => setHovered(null)}
            className={`text-left p-4 rounded-lg border transition-all ${
              hovered === tpl.id
                ? 'border-brand-primary bg-brand-primary/5 dark:border-brand-accent dark:bg-brand-accent/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">{tpl.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{tpl.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{tpl.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tpl.suggestedModules.slice(0, 3).map((mod) => (
                    <span key={mod} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                      {mod.replace(/-/g, ' ')}
                    </span>
                  ))}
                  {tpl.suggestedModules.length > 3 && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                      +{tpl.suggestedModules.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="w-full py-2.5 border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        Start with blank brief
      </button>
    </div>
  )
}
