export function getModuleIcon(category: string): JSX.Element {
  switch (category) {
    case 'Headers':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="5" rx="1" />
          <rect x="3" y="10" width="18" height="3" rx="1" opacity="0.4" />
          <rect x="3" y="15" width="12" height="3" rx="1" opacity="0.4" />
        </svg>
      )
    case 'Content':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="3" rx="1" />
          <rect x="3" y="8" width="18" height="3" rx="1" />
          <rect x="3" y="13" width="14" height="3" rx="1" />
          <rect x="3" y="18" width="10" height="3" rx="1" />
        </svg>
      )
    case 'CTAs':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M5 3l11 9-11 9V3z" strokeLinejoin="round" />
        </svg>
      )
    case 'Events':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'Speakers':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="8" r="3" />
          <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
        </svg>
      )
    case 'Articles':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="3" rx="1" />
          <rect x="13" y="8" width="8" height="3" rx="1" />
          <rect x="3" y="13" width="18" height="3" rx="1" />
          <rect x="3" y="18" width="14" height="3" rx="1" />
        </svg>
      )
    case 'Media':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <polygon points="10,9 10,15 15,12" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'Navigation':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )
    case 'Footers':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="3" rx="1" opacity="0.4" />
          <rect x="3" y="8" width="18" height="3" rx="1" opacity="0.4" />
          <rect x="3" y="16" width="18" height="5" rx="1" />
        </svg>
      )
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      )
  }
}
