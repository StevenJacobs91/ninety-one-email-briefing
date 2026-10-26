import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MutableRefObject, type ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import type { FormProblem } from '../../lib/formErrors'
import { sectionForField, sectionProgress, BRIEF_SECTIONS, type BriefSectionId, type SectionProgress } from '../../lib/briefSections'
import { defaultRequiredMap, type RequiredMap } from '../../lib/briefRequirements'

interface Attention {
  progress: Record<BriefSectionId, SectionProgress>
  /** Whether each field is required, as the team has set it in Settings */
  required: RequiredMap
  /** Where each section sits on the page, as the team has set it in Settings */
  order: Record<BriefSectionId, number>
  /** Where each field sits within its section, as the team has set it in Settings */
  fieldOrder: Record<string, number>
  /** The fields the team has switched off in Settings: not on the form, and never asked for */
  hidden: ReadonlySet<string>
  /** True once Continue has been pressed; only then do sections with something wrong turn red */
  attempted: boolean
  isOpen: (id: BriefSectionId) => boolean
  toggle: (id: BriefSectionId) => void
  /** Opens a section, and leaves it open if it already is */
  open: (id: BriefSectionId) => void
}

const AttentionContext = createContext<Attention | null>(null)

/** The state of the Brief panel's sections, or null outside the panel (sections then render as plain headings). */
export function useBriefAttention(): Attention | null {
  return useContext(AttentionContext)
}

// The two sections that set the email up are open to begin with; the rest open when needed.
const OPEN_AT_FIRST: BriefSectionId[] = ['identity', 'envelope']

const FOCUSABLE = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
const isFocusable = (el: Element) => el.matches(FOCUSABLE)

/** The control to focus for a field: the input registered under its name, a group marked data-field, or the section's first control. */
function findTarget(path: string, section: BriefSectionId | null): HTMLElement | null {
  const byName = document.querySelector<HTMLElement>(`[name="${path}"]`)
  if (byName) return byName
  const group = document.querySelector<HTMLElement>(`[data-field="${path}"]`)
  if (group) return isFocusable(group) ? group : group.querySelector<HTMLElement>(FOCUSABLE) ?? group
  if (!section) return null
  return document.querySelector<HTMLElement>(`[data-brief-section="${section}"] :is(input, select, textarea, button):not([aria-expanded])`)
}

interface ProviderProps {
  attempted: boolean
  /** What Continue found wrong; the sections holding these open */
  problems: readonly FormProblem[]
  /** The team's required/optional choices; without them the schema's own rules stand */
  required?: RequiredMap
  /** Each section's position on the page; without it the built-in order stands */
  order?: Record<BriefSectionId, number>
  /** Each field's position within its section; without it the built-in order stands */
  fieldOrder?: Record<string, number>
  /** Fields switched off in Settings */
  hidden?: ReadonlySet<string>
  /** Filled with a function that opens a field's section and focuses the field, for the buttons outside the panel */
  jumpRef?: MutableRefObject<((path: string) => void) | null>
  children: ReactNode
}

const DEFAULT_REQUIRED = defaultRequiredMap()
const NO_HIDDEN: ReadonlySet<string> = new Set()
const NO_FIELD_ORDER: Record<string, number> = {}
const DEFAULT_ORDER = Object.fromEntries(Object.entries(BRIEF_SECTIONS).map(([id, def]) => [id, def.order])) as Record<BriefSectionId, number>

export function BriefAttentionProvider({ attempted, problems, required = DEFAULT_REQUIRED, order = DEFAULT_ORDER, fieldOrder = NO_FIELD_ORDER, hidden = NO_HIDDEN, jumpRef, children }: ProviderProps) {
  const { control } = useFormContext<BriefFormData>()
  const values = useWatch({ control }) as BriefFormData
  const progress = useMemo(() => sectionProgress(values, required, hidden), [values, required, hidden])
  const [open, setOpen] = useState<Set<BriefSectionId>>(() => new Set(OPEN_AT_FIRST))

  const isOpen = useCallback((id: BriefSectionId) => open.has(id), [open])
  const toggle = useCallback((id: BriefSectionId) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const openSection = useCallback((id: BriefSectionId) => setOpen((prev) => (prev.has(id) ? prev : new Set([...prev, id]))), [])

  // A section with a problem opens, so it is never hidden from the person who has to fix it.
  useEffect(() => {
    const ids = problems.map((p) => sectionForField(p.path)).filter((id): id is BriefSectionId => !!id && id !== 'email')
    if (ids.length === 0) return
    setOpen((prev) => (ids.every((id) => prev.has(id)) ? prev : new Set([...prev, ...ids])))
  }, [problems])

  const jump = useCallback((path: string) => {
    const section = sectionForField(path)
    if (section === 'email') {
      document.getElementById('brief-email-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (section) setOpen((prev) => (prev.has(section) ? prev : new Set([...prev, section])))
    // Once the section has opened.
    window.setTimeout(() => {
      const target = findTarget(path, section)
      // Focus first: scrolling is a nicety, and not every environment can do it.
      target?.focus()
      target?.scrollIntoView?.({ block: 'center' })
    }, 30)
  }, [])

  useEffect(() => {
    if (!jumpRef) return
    jumpRef.current = jump
    return () => { jumpRef.current = null }
  }, [jump, jumpRef])

  const value = useMemo(() => ({ progress, required, order, fieldOrder, hidden, attempted, isOpen, toggle, open: openSection }), [progress, required, order, fieldOrder, hidden, attempted, isOpen, toggle, openSection])
  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>
}
