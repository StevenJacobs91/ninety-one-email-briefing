import { useState } from 'react'
import { DEFAULT_CONFIG } from '../../engine/config'
import { DesktopPreview } from './DesktopPreview'
import { MobilePreview } from './MobilePreview'
import { PREVIEW_TOKENS } from './tokens'
import { describeTruncation } from './truncation'

export type PreviewView = 'both' | 'desktop' | 'mobile'
const VIEWS: { id: PreviewView; label: string }[] = [
  { id: 'both', label: 'Both' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'mobile', label: 'Mobile' },
]

interface Props {
  /** The subject as a recipient sees it (merge tags already replaced with sample values). */
  subject: string
  senderName?: string
  preheader?: string
  /** Characters visible before the subject is cut off. */
  desktopChars?: number
  mobileChars?: number
  /** Average glyph width in em, used to turn a character count into a container width. */
  charWidthEm?: number
  defaultView?: PreviewView
}

export function InboxPreview({
  subject,
  senderName,
  preheader,
  desktopChars = DEFAULT_CONFIG.preview.desktopChars,
  mobileChars = DEFAULT_CONFIG.preview.mobileChars,
  charWidthEm = 0.56,
  defaultView = 'both',
}: Props) {
  const [view, setView] = useState<PreviewView>(defaultView)
  const showDesktop = view !== 'mobile'
  const showMobile = view !== 'desktop'
  return (
    <figure className="space-y-3" aria-label="Subject line preview">
      <div role="group" aria-label="Preview device" className="inline-flex rounded-md border border-gray-300 bg-white p-0.5 dark:border-gray-600 dark:bg-gray-800">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
            className={`rounded px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
              view === v.id ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div
        style={PREVIEW_TOKENS}
        className={`relative overflow-hidden rounded-2xl bg-[var(--preview-panel-bg)] p-4 sm:p-6 ${view === 'both' ? 'sm:h-[400px]' : ''}`}
      >
        <div aria-hidden="true" className={`flex flex-col gap-5 ${view === 'both' ? '' : 'items-center'}`}>
          {showDesktop && (
            <div className={view === 'both' ? 'sm:w-[80%]' : 'w-full max-w-xl'}>
              <DesktopPreview subject={subject} limit={desktopChars} charWidthEm={charWidthEm} />
            </div>
          )}
          {showMobile && (
            <div
              className={
                view === 'both'
                  ? 'mx-auto w-full max-w-[260px] sm:absolute sm:-bottom-10 sm:right-6 sm:mx-0 sm:w-[36%] sm:max-w-none'
                  : 'w-full max-w-[280px]'
              }
            >
              <MobilePreview subject={subject} senderName={senderName} preheader={preheader} limit={mobileChars} charWidthEm={charWidthEm} />
            </div>
          )}
        </div>
      </div>
      <figcaption className="sr-only">{describeTruncation(subject, desktopChars, mobileChars)}</figcaption>
    </figure>
  )
}
