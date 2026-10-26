import type { ReactNode } from 'react'
import { SubSection } from '../ui/SubSection'
import { BRIEF_SECTIONS, type BriefSectionId } from '../../lib/briefSections'
import { useBriefAttention } from './BriefAttention'

interface Props {
  id: BriefSectionId
  title: string
  children: ReactNode
}

const BADGE = {
  done: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  open: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  bad: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

/**
 * One block of the brief with a badge showing how complete it is. Every block is always open and the blocks run one under
 * the other, so filling in the brief takes no clicks to open anything. Outside the Brief panel it is a plain heading.
 */
export function BriefSection({ id, title, children }: Props) {
  const attention = useBriefAttention()
  if (!attention) return <SubSection title={title}>{children}</SubSection>

  const { done, total, problems } = attention.progress[id]
  const needsAttention = attention.attempted && problems.length > 0
  const complete = total > 0 && done === total && problems.length === 0
  const text = total === 0 ? (needsAttention ? 'Needs attention' : 'Optional') : `${done} of ${total}`
  const tone = needsAttention ? BADGE.bad : complete ? BADGE.done : BADGE.open
  const status = needsAttention ? ' needs attention' : complete ? ' complete' : ''
  const bodyId = `brief-section-${id}`

  return (
    <section data-brief-section={id} style={{ order: attention.order[id] ?? BRIEF_SECTIONS[id].order }} className="border-t border-brand-border-warm dark:border-gray-700">
      <h3 className="flex items-center gap-3 px-4 py-3 bg-brand-primary/5 dark:bg-white/5">
        <span className="text-xs font-ni-heading text-brand-primary dark:text-brand-accent uppercase tracking-[0.18em]">{title}</span>
        <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full tabular-nums ${tone}`}>
          {text}
          <span className="sr-only">{status}</span>
        </span>
      </h3>
      <div id={bodyId} className="px-4 pb-5 pt-4 flex flex-col gap-5">{children}</div>
    </section>
  )
}
