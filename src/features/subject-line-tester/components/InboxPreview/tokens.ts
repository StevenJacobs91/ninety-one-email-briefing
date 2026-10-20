import type { CSSProperties } from 'react'

// Design tokens from the spec §3.6. The platform has no equivalent teal/green inbox palette,
// so these are scoped to the preview as CSS variables rather than added to the global theme.
export const PREVIEW_TOKENS = {
  '--preview-panel-bg': '#48817D',
  '--preview-surface': '#FFFFFF',
  '--preview-highlight': '#EEF7EC',
  '--preview-accent-bar': '#CDEBC5',
  '--preview-accent-dot': '#9AD686',
  '--preview-icon-stroke': '#C6F24E',
  '--preview-skeleton': '#E5E7E8',
  '--preview-text': '#1A1A1A',
} as CSSProperties

export const PLACEHOLDER_SUBJECT = 'Your subject line will appear here'
