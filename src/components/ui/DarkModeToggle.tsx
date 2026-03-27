type Mode = 'light' | 'dark' | 'system'

interface DarkModeToggleProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

const OPTIONS: { value: Mode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '\u2600' },
  { value: 'system', label: 'System', icon: '\u{1F4BB}' },
  { value: 'dark', label: 'Dark', icon: '\u263E' },
]

export function DarkModeToggle({ mode, onModeChange }: DarkModeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onModeChange(opt.value)}
          title={opt.label}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            mode === opt.value
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="mr-1">{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}
