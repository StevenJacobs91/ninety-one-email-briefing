import { AccentBar, Bar, SubjectText } from './shared'

interface Props {
  subject: string
  senderName?: string
  preheader?: string
  limit: number
  charWidthEm: number
}

const Dot = () => <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--preview-accent-dot)]" aria-hidden="true" />

export function MobilePreview({ subject, senderName, preheader, limit, charWidthEm }: Props) {
  const sender = senderName?.trim()
  const pre = preheader?.trim()
  return (
    <div className="rounded-t-[1.75rem] bg-[var(--preview-surface)] px-3 pb-10 pt-5 shadow-xl" data-testid="mobile-preview">
      <ul className="divide-y divide-gray-100">
        <li className="flex items-start gap-2.5 rounded-lg bg-[var(--preview-highlight)] p-2.5">
          <Dot />
          <div className="min-w-0 flex-1 space-y-1">
            {sender ? (
              <span data-testid="mobile-sender" className="block truncate text-[11px] text-gray-600">{sender}</span>
            ) : (
              <AccentBar testId="mobile-sender-skeleton" className="w-1/3" />
            )}
            <SubjectText subject={subject} limit={limit} charWidthEm={charWidthEm} testId="mobile-subject" className="text-[13px]" />
            {pre ? (
              <span data-testid="mobile-preheader" className="block truncate text-[11px] text-gray-500">{pre}</span>
            ) : (
              <AccentBar testId="mobile-preheader-skeleton" className="w-4/5" />
            )}
          </div>
        </li>
        {[0, 1].map((i) => (
          <li key={i} className="flex items-start gap-2.5 p-2.5">
            <Dot />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bar className="w-2/5" />
              <Bar className="w-3/4" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
