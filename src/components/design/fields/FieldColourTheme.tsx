import { BRAND_THEMES } from '../../../lib/constants'

interface FieldColourThemeProps {
  value: string
  onChange: (themeId: string) => void
  label?: string
}

export function FieldColourTheme({ value, onChange, label = 'Colour theme' }: FieldColourThemeProps) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 tracking-[0.12em] uppercase">
        {label}
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {/* No preference option */}
        <button
          type="button"
          onClick={() => onChange('')}
          className={`
            relative flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-all
            ${value === ''
              ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/10'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }
          `}
          aria-pressed={value === ''}
          aria-label="No preference"
        >
          <div className="flex gap-1">
            <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="text-gray-400">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight font-medium">No preference</span>
          {value === '' && (
            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-brand-primary dark:bg-brand-accent rounded-full flex items-center justify-center">
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          )}
        </button>

        {/* Theme swatches */}
        {BRAND_THEMES.map((theme) => {
          const isSelected = value === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className={`
                relative flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-all
                ${isSelected
                  ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }
              `}
              aria-pressed={isSelected}
              aria-label={theme.label}
              title={theme.label}
            >
              {/* Colour swatches */}
              <div className="flex gap-0.5">
                <span
                  className="w-5 h-5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: theme.primary }}
                />
                <span
                  className="w-3 h-3 rounded-full border border-black/10 shrink-0 mt-1"
                  style={{ backgroundColor: theme.accent }}
                />
              </div>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight line-clamp-2">
                {theme.label.split(' / ').map((part, i) => (
                  <span key={i} className={i === 0 ? 'block' : 'block text-gray-400 dark:text-gray-600'}>{part}</span>
                ))}
              </span>

              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-brand-primary dark:bg-brand-accent rounded-full flex items-center justify-center">
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
