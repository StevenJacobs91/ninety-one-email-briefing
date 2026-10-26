import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useBriefAttention } from '../brief/BriefAttention'
import { InspectorSlotProvider } from '../builder2/InspectorSlot'
import { BRIEF_SECTIONS, type BriefSectionId } from '../../lib/briefSections'

// The sections shown on the rail when the Brief panel is collapsed.
const RAIL_SECTIONS: BriefSectionId[] = ['identity', 'envelope', 'sender', 'targeting', 'deadlines']

interface Props {
  /** The brief's own form: theme, email type, subject line and the rest */
  brief: ReactNode
  /** The email being built */
  canvas: ReactNode
  /** The strip above the columns: save state, score, what needs attention, Continue */
  statusBar?: ReactNode
}

/**
 * Brief & Build as one workspace: the brief on the left in a single column, the email in the middle, and the selected
 * module's inspector on the right. The Brief panel starts open and can collapse to a rail of section badges, to give the email
 * more room, once every section is complete; below 1280px the three stack. The brief stays on the page while collapsed, so its fields keep what has been typed and checked.
 */
export function BriefBuildWorkspace({ brief, canvas, statusBar }: Props) {
  const attention = useBriefAttention()
  // The panel is open to begin with. It can be collapsed once every section is complete (every pill green), and it opens
  // again by itself if a section stops being complete, so something left undone is never hidden.
  const [chosen, setChosen] = useState(false)
  const complete = !!attention && (Object.keys(BRIEF_SECTIONS) as BriefSectionId[])
    .filter((id) => id !== 'email')
    .every((id) => attention.progress[id].problems.length === 0 && attention.progress[id].done === attention.progress[id].total)
  const collapsed = chosen && complete
  useEffect(() => {
    if (chosen && !complete) setChosen(false)
  }, [chosen, complete])
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const expandRef = useRef<HTMLButtonElement>(null)
  const collapseRef = useRef<HTMLButtonElement>(null)
  const moved = useRef(false)

  // Keyboard focus follows the control that was used, which has just been replaced by its twin.
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    ;(collapsed ? expandRef : collapseRef).current?.focus()
  }, [collapsed])

  const setCollapsed = (value: boolean) => {
    moved.current = true
    setChosen(value)
  }

  const columns = collapsed
    ? 'xl:grid-cols-[3.5rem_minmax(0,1fr)_22rem]'
    : 'xl:grid-cols-[24rem_minmax(0,1fr)_22rem]'

  return (
    <InspectorSlotProvider value={slot}>
      {statusBar}
      <div className={`grid grid-cols-1 gap-6 items-start ${columns}`}>
        <aside aria-label="Brief" className="min-w-0 xl:sticky xl:top-[7.5rem] xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700">
          {collapsed && (
            <div className="hidden xl:flex flex-col items-center gap-2 py-3">
              <button
                ref={expandRef}
                type="button"
                onClick={() => setCollapsed(false)}
                aria-expanded={false}
                aria-label="Expand the brief panel"
                title="Expand the brief panel"
                className="p-1.5 text-brand-primary dark:text-brand-accent hover:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              {attention && RAIL_SECTIONS.map((id) => {
                const { done, total, problems } = attention.progress[id]
                const bad = attention.attempted && problems.length > 0
                const label = BRIEF_SECTIONS[id].label
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { attention.open(id); setCollapsed(false) }}
                    aria-label={`${label}: ${done} of ${total}${bad ? ', needs attention' : ''}. Open`}
                    title={label}
                    className={`w-11 text-[11px] tabular-nums py-1 rounded-full ${bad ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : done === total ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}
                  >
                    {done}/{total}
                  </button>
                )
              })}
            </div>
          )}
          <div className={collapsed ? 'xl:hidden' : undefined}>
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-xs font-ni-heading uppercase tracking-[0.18em] text-brand-primary dark:text-brand-accent">Brief</p>
              <button
                ref={collapseRef}
                type="button"
                onClick={() => setCollapsed(true)}
                disabled={!complete}
                aria-expanded
                aria-label="Collapse the brief panel"
                title={complete ? 'Collapse the brief panel' : 'Complete every section to collapse the brief panel'}
                className="hidden xl:block p-1.5 text-brand-primary dark:text-brand-accent hover:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            </div>
            <div className="pt-2 pb-0">{brief}</div>
          </div>
        </aside>

        <main aria-label="Email builder" className="min-w-0 bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 p-4 lg:p-6">
          {canvas}
        </main>

        <aside aria-label="Module inspector" className="min-w-0 xl:sticky xl:top-[7.5rem] xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
          <div ref={setSlot} className="peer" />
          <p className="hidden peer-empty:block text-sm text-gray-500 dark:text-gray-400 border border-dashed border-brand-border-warm dark:border-gray-700 p-4">
            Select a module in the email to edit its content, media and style here.
          </p>
        </aside>
      </div>
    </InspectorSlotProvider>
  )
}
