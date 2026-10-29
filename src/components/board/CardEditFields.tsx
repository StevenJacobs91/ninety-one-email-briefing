import { useEffect, useMemo, useRef, useState } from 'react'
import type { KanbanCard } from '../../types/kanban.types'
import type { CardEdits } from '../../lib/cardEdits'
import { CHANNELS, CLIENT_GROUPS, REGIONS } from '../../lib/constants'
import { useSettings } from '../../contexts/SettingsContext'
import { getThemeColours } from '../../lib/themeColours'
import { ThemeSelect } from '../ui/ThemeSelect'
import { useAvailableThemes } from '../builder2/useAvailableThemes'
import { STATUS_COLOURS } from './SendStatusBadge'

type SaveResult = { ok: true } | { ok: false; error: string }

interface Props {
  card: KanbanCard
  /** Producers and admins edit; everyone else reads */
  canEdit: boolean
  onSave: (edits: CardEdits) => Promise<SaveResult>
  /** The brief has been through approval, which an edit marks out of date */
  approvalNote?: boolean
  /** The send date has passed, so it is shown in the overdue colour */
  overdue?: boolean
}

const HEADING = 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3'
const LABEL = 'text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1'
const VALUE = 'text-sm text-gray-800 dark:text-gray-200 mt-0.5'
const FIELD = 'w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent'
const RULE = <div className="h-px bg-gray-100 dark:bg-gray-800" />

const union = (...lists: (readonly string[])[]) => [...new Set(lists.flat())]
const day = (iso: string) => (iso ? iso.slice(0, 10) : '')

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

/** Copies the tags, ready to paste into Pardot. Left out when there are none. */
export function CopyTagsButton({ tags }: { tags: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timer.current), [])
  if (!tags.trim()) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tags)
      setState('copied')
    } catch {
      setState('failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2500)
  }

  return (
    <button type="button" onClick={copy} className="text-xs text-brand-primary dark:text-brand-accent hover:underline">
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Copy tags'}
    </button>
  )
}

function ChipGroup({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div role="group" aria-label={label}>
      <p className={LABEL}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const on = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${on
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The card's brief fields: subject line, brand theme, audience, deadlines and tags. Producers and admins edit them in place
 * and each change is saved as it is made; everyone else sees the values.
 */
export function CardEditFields(props: Props) {
  return props.canEdit ? <Editable {...props} /> : <ReadOnly card={props.card} overdue={props.overdue} />
}

function ReadOnly({ card, overdue = false }: { card: KanbanCard; overdue?: boolean }) {
  const { settings } = useSettings()
  const colours = getThemeColours(card.theme)
  const themeLabel = (settings.brandThemes ?? []).find((t) => t.id === card.theme)?.label ?? card.theme
  return (
    <>
      <section>
        <p className={HEADING}>Campaign</p>
        <div className="space-y-2.5">
          <div><p className={LABEL}>Subject line</p><p className={VALUE}>{card.subjectLine || '—'}</p></div>
          <div>
            <p className={LABEL}>Brand theme</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.primary }} />
              <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.accent }} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{themeLabel}</span>
            </div>
          </div>
        </div>
      </section>
      {RULE}
      <section>
        <p className={HEADING}>Audience</p>
        <div className="grid grid-cols-2 gap-3">
          <div><p className={LABEL}>Regions</p><p className={VALUE}>{card.region.join(', ') || '—'}</p></div>
          <div><p className={LABEL}>Channels</p><p className={VALUE}>{card.channel.join(', ') || '—'}</p></div>
          {card.clientGroup.length > 0 && <div className="col-span-2"><p className={LABEL}>Client groups</p><p className={VALUE}>{card.clientGroup.join(', ')}</p></div>}
        </div>
      </section>
      {RULE}
      <section>
        <p className={HEADING}>Deadlines</p>
        <div className="grid grid-cols-2 gap-3">
          <div><p className={LABEL}>Content approval</p><p className={VALUE}>{formatDate(card.contentApprovalDate)}</p></div>
          <div>
            <p className={LABEL}>Send date</p>
            <p className={`${VALUE} font-medium`} style={overdue ? { color: STATUS_COLOURS.overdue } : undefined}>{formatDate(card.sendDate)}</p>
          </div>
        </div>
      </section>
      {card.tags && (
        <>
          {RULE}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</p>
              <CopyTagsButton tags={card.tags} />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{card.tags}</p>
          </section>
        </>
      )}
    </>
  )
}

function Editable({ card, onSave, approvalNote = false, overdue = false }: Props) {
  const { settings } = useSettings()
  const { ids: availableThemes, approximate: approximateThemes } = useAvailableThemes()
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' } | { kind: 'error'; message: string }>({ kind: 'idle' })
  // Bumped when a change is refused, so the boxes go back to what is saved
  const [resetKey, setResetKey] = useState(0)

  const [subject, setSubject] = useState(card.subjectLine)
  const [approval, setApproval] = useState(day(card.contentApprovalDate))
  const [send, setSend] = useState(day(card.sendDate))
  const [tags, setTags] = useState(card.tags)
  useEffect(() => {
    setSubject(card.subjectLine)
    setApproval(day(card.contentApprovalDate))
    setSend(day(card.sendDate))
    setTags(card.tags)
  }, [card.subjectLine, card.contentApprovalDate, card.sendDate, card.tags, resetKey])

  const clientGroups = useMemo(() => union(CLIENT_GROUPS, (settings.customClientGroups ?? []).map((g) => g.name), card.clientGroup), [settings.customClientGroups, card.clientGroup])
  const regions = useMemo(() => union(REGIONS, (settings.customRegions ?? []).map((r) => r.name), card.region), [settings.customRegions, card.region])
  const channels = useMemo(() => union(CHANNELS, (settings.customChannels ?? []).map((c) => c.label), card.channel), [settings.customChannels, card.channel])

  async function save(edits: CardEdits) {
    setStatus({ kind: 'saving' })
    const result = await onSave(edits)
    if (result.ok) {
      setStatus({ kind: 'saved' })
    } else {
      setStatus({ kind: 'error', message: result.error })
      setResetKey((n) => n + 1)
    }
  }

  const toggle = (current: string[], value: string) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value])

  return (
    <>
      <div className="min-h-[1.25rem] text-xs" aria-live="polite">
        {status.kind === 'saving' && <span className="text-gray-500 dark:text-gray-400">Saving…</span>}
        {status.kind === 'saved' && <span className="text-green-700 dark:text-green-400">Saved</span>}
        {status.kind === 'error' && <span role="alert" className="text-red-600 dark:text-red-400">{status.message}</span>}
        {status.kind === 'idle' && approvalNote && (
          <span className="text-amber-700 dark:text-amber-400">Edits here also update the saved brief, which marks its earlier approval out of date.</span>
        )}
      </div>

      <section>
        <p className={HEADING}>Campaign</p>
        <div className="space-y-3">
          <div>
            <label htmlFor="card-subject" className={LABEL}>Subject line</label>
            <input
              id="card-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => { if (subject !== card.subjectLine) void save({ subjectLine: subject }) }}
              className={FIELD}
            />
          </div>
          <div>
            <p id="card-theme-label" className={LABEL}>Brand theme</p>
            <ThemeSelect
              id="card-theme"
              name="card.theme"
              labelledBy="card-theme-label"
              value={card.theme}
              options={(settings.brandThemes ?? []).map((theme) => {
                // A theme with no module library cannot be built, so it cannot be moved to.
                const pending = availableThemes !== null && !availableThemes.includes(theme.id)
                return {
                  id: theme.id,
                  label: theme.label,
                  primary: theme.primary,
                  accent: theme.accent,
                  disabled: pending && card.theme !== theme.id,
                  note: pending ? 'Module library pending' : approximateThemes.includes(theme.id) ? 'Approximate module library' : undefined,
                }
              })}
              onChange={(id) => { if (id !== card.theme) void save({ theme: id }) }}
            />
          </div>
        </div>
      </section>

      {RULE}

      <section>
        <p className={HEADING}>Audience</p>
        <div className="space-y-3">
          <ChipGroup label="Client groups" options={clientGroups} selected={card.clientGroup} onToggle={(v) => void save({ clientGroup: toggle(card.clientGroup, v) })} />
          <ChipGroup label="Regions" options={regions} selected={card.region} onToggle={(v) => void save({ region: toggle(card.region, v) })} />
          <ChipGroup label="Channels" options={channels} selected={card.channel} onToggle={(v) => void save({ channel: toggle(card.channel, v) })} />
        </div>
      </section>

      {RULE}

      <section>
        <p className={HEADING}>Deadlines</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="card-approval" className={LABEL}>Content approval</label>
            <input
              id="card-approval"
              type="date"
              value={approval}
              onChange={(e) => setApproval(e.target.value)}
              onBlur={() => { if (approval !== day(card.contentApprovalDate)) void save({ contentApprovalDate: approval }) }}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="card-send" className={LABEL}>Send date</label>
            <input
              id="card-send"
              type="date"
              value={send}
              onChange={(e) => setSend(e.target.value)}
              onBlur={() => { if (send !== day(card.sendDate)) void save({ sendDate: send }) }}
              style={overdue ? { color: STATUS_COLOURS.overdue } : undefined}
              className={FIELD}
            />
          </div>
        </div>
      </section>

      {RULE}

      <section>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="card-tags" className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</label>
          <CopyTagsButton tags={tags} />
        </div>
        <textarea
          id="card-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onBlur={() => { if (tags !== card.tags) void save({ tags }) }}
          rows={4}
          placeholder="Tags for Pardot, separated by commas"
          className={`${FIELD} resize-none`}
        />
      </section>
    </>
  )
}
