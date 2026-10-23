interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  /** The switch's name for screen readers, usually the setting's label */
  label: string
  size?: 'md' | 'sm' | 'xs'
  /** 'warning' is for a setting that is on but not yet ready to work, such as a flow with no web address */
  tone?: 'primary' | 'warning'
  disabled?: boolean
  title?: string
  className?: string
}

// Track and knob sizes where the knob travels exactly to the other end: track width - 4px padding - knob width.
const SIZE = {
  md: { track: 'h-5 w-9', knob: 'h-4 w-4', on: 'translate-x-4' },
  sm: { track: 'h-4 w-8', knob: 'h-3 w-3', on: 'translate-x-4' },
  xs: { track: 'h-4 w-7', knob: 'h-3 w-3', on: 'translate-x-3' },
} as const

/**
 * The one switch for Settings: left is off, right is on, in every tab. Keyboard users get Space and Enter
 * because it is a button. Sizes are chosen so the knob always reaches the far end of the track.
 */
export function Switch({ checked, onChange, label, size = 'md', tone = 'primary', disabled = false, title, className = '' }: Props) {
  const s = SIZE[size]
  const on = tone === 'warning' ? 'bg-amber-400' : 'bg-brand-primary dark:bg-brand-accent'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 dark:focus-visible:ring-brand-accent/50 disabled:cursor-not-allowed disabled:opacity-50 ${s.track} ${checked ? on : 'bg-gray-300 dark:bg-gray-600'} ${className}`}
    >
      <span className={`pointer-events-none inline-block rounded-full bg-white shadow transition-transform ${s.knob} ${checked ? s.on : 'translate-x-0'}`} />
    </button>
  )
}
