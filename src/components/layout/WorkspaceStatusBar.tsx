import { useDeferredValue } from 'react'
import { useBriefAttention } from '../brief/BriefAttention'
import { BRIEF_SECTIONS, type BriefSectionId } from '../../lib/briefSections'
import type { FormProblem } from '../../lib/formErrors'
import type { SaveStatus } from '../../hooks/useDraftPersistence'

/** "14:05" for a saved draft; empty before anything has been saved. */
export function formatSavedAt(savedAt: number | null): string {
  if (savedAt === null) return ''
  return new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

interface Props {
  saveStatus: SaveStatus
  /** When the draft was last written, or null if it has not been */
  savedAt: number | null
  /** The Brand Review score out of 100, or null when there is nothing to score yet */
  score: number | null
  minimumScore: number
  onContinue: () => void
  onJump: (path: string) => void
}

/**
 * The controls in the nav row on Brief & Build: whether the draft is saved, how the email scores against the brand rules so far,
 * which sections still need something, and Continue. Continue is always live. It checks the whole brief and says what is missing.
 */
export function WorkspaceStatusBar({ saveStatus, savedAt, score, minimumScore, onContinue, onJump }: Props) {
  const attention = useBriefAttention()
  // The score is the slowest thing to work out on the page, so typing is never held up waiting for it to redraw.
  const shownScore = useDeferredValue(score)

  const needing = attention
    ? (Object.keys(BRIEF_SECTIONS) as BriefSectionId[]).filter((id) => attention.progress[id].problems.length > 0)
    : []
  const firstProblem = needing.length > 0 ? attention?.progress[needing[0]].problems[0] : undefined
  const showAttention = !!attention?.attempted && needing.length > 0 && !!firstProblem

  const saved = saveStatus === 'saving' ? 'Saving…' : savedAt !== null ? `Draft saved ${formatSavedAt(savedAt)}` : ''

  return (
    <div className="flex items-center gap-x-5 shrink-0 py-1.5">
      <p className="hidden lg:block text-xs text-brand-text-muted dark:text-gray-400" aria-live="polite">{saved}</p>

      {shownScore !== null && (
        <p className="hidden md:block text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Brand review{' '}
          <strong className={shownScore >= minimumScore ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}>{shownScore}</strong>
          <span className="text-brand-text-muted dark:text-gray-500"> / 100 (minimum {minimumScore})</span>
        </p>
      )}

      {showAttention && firstProblem && (
        <button
          type="button"
          onClick={() => onJump(firstProblem.path)}
          className="text-xs text-red-700 dark:text-red-300 underline underline-offset-2 hover:no-underline whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          {needing.length} {needing.length === 1 ? 'section needs' : 'sections need'} attention
        </button>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="min-h-[40px] flex items-center gap-2 bg-brand-primary text-white px-5 py-2 text-xs font-ni-heading tracking-[0.15em] uppercase whitespace-nowrap hover:bg-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
      >
        Continue to review
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

/** What the last press of Continue found wrong, each as a button to its field. Nothing is drawn when nothing is wrong. */
export function WorkspaceProblems({ problems, onJump }: { problems: readonly FormProblem[]; onJump: (path: string) => void }) {
  if (problems.length === 0) return null
  return (
    <div role="alert" className="mb-4 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-800 dark:text-red-200">
      <p className="font-medium">Can&rsquo;t continue yet. Fix {problems.length === 1 ? 'this' : 'these'}:</p>
      <ul className="mt-1 space-y-0.5">
        {problems.slice(0, 5).map((p) => (
          <li key={p.path}>
            <button type="button" onClick={() => onJump(p.path)} className="underline underline-offset-2 hover:no-underline text-left">{p.field}</button>: {p.message}
          </li>
        ))}
        {problems.length > 5 && <li>…and {problems.length - 5} more</li>}
      </ul>
    </div>
  )
}
