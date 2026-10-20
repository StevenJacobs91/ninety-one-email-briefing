import { AccentBar, Bar, Star, SubjectText } from './shared'

interface Props {
  subject: string
  limit: number
  charWidthEm: number
}

const ROW_WIDTHS = ['w-3/5', 'w-2/3', 'w-1/2', 'w-3/4', 'w-3/5', 'w-2/3', 'w-1/2']

export function DesktopPreview({ subject, limit, charWidthEm }: Props) {
  return (
    <div className="overflow-hidden rounded-lg bg-[var(--preview-surface)] shadow-lg" data-testid="desktop-preview">
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[var(--preview-skeleton)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--preview-skeleton)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--preview-skeleton)]" />
      </div>
      <div className="flex">
        <div className="w-[22%] shrink-0 space-y-3 border-r border-gray-100 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--preview-panel-bg)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--preview-icon-stroke)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <polyline points="3 7 12 13 21 7" />
            </svg>
          </span>
          <Bar className="w-4/5" />
          <Bar className="w-3/5" />
          <Bar className="w-2/3" />
        </div>
        <ul className="min-w-0 flex-1 divide-y divide-gray-100 p-2">
          <li className="flex items-center gap-3 rounded-md bg-[var(--preview-highlight)] px-2 py-2.5">
            <Star filled />
            <div className="min-w-0 flex-1">
              <SubjectText subject={subject} limit={limit} charWidthEm={charWidthEm} testId="desktop-subject" className="text-[13px]" />
            </div>
            <AccentBar className="w-10 shrink-0" />
          </li>
          {ROW_WIDTHS.map((w, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-2.5">
              <Star />
              <Bar className={w} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
