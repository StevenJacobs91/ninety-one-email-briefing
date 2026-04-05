type Mode = 'light' | 'dark' | 'system'

interface DarkModeToggleProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

const CYCLE: Mode[] = ['light', 'system', 'dark']

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const SystemIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const ICONS: Record<Mode, () => JSX.Element> = {
  light: SunIcon,
  system: SystemIcon,
  dark: MoonIcon,
}

const LABELS: Record<Mode, string> = {
  light: 'Light mode — click to switch to System',
  system: 'System mode — click to switch to Dark',
  dark: 'Dark mode — click to switch to Light',
}

export function DarkModeToggle({ mode, onModeChange }: DarkModeToggleProps) {
  const Icon = ICONS[mode]
  const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length]

  return (
    <button
      type="button"
      onClick={() => onModeChange(next)}
      title={LABELS[mode]}
      aria-label={LABELS[mode]}
      className="w-8 h-8 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
    >
      <Icon />
    </button>
  )
}
