import type { ReactNode } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { BoardCard } from '../board/BoardCard'
import {
  BOARD_COLUMNS, BOARD_VIEWS, BOARD_VIEW_LABEL, CARD_FIELDS, defaultCardFields, moveCardField, resolveBoardSettings,
  resolveCardFields, toggleCardField, type BoardColumnId, type BoardView, type CardAccent, type CardDensity, type CardFieldsConfig,
} from '../../lib/boardConfig'
import type { CampaignPlannerSettings } from '../../types/settings.types'
import type { KanbanCard } from '../../types/kanban.types'

const COLUMN_LABEL: Record<BoardColumnId, string> = { briefed: 'Briefed', 'in-progress': 'In Progress', distributed: 'Distributed' }

const SAMPLE_CARD: KanbanCard = {
  id: 'preview',
  briefId: 'preview',
  emailName: '2026-11-03 UK Advisers — Taking Stock',
  emailType: 'newsletter',
  theme: 'agulhas-coral',
  subjectLine: 'Taking Stock — November 2026',
  region: ['UK', 'EU'],
  channel: ['INTERMEDIARY'],
  clientGroup: ['Wealth managers'],
  sendDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  contentApprovalDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  urgency: 'urgent',
  column: 'in-progress',
  submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  columnHistory: [{ column: 'in-progress', at: new Date(Date.now() - 86400000).toISOString() }],
  notes: '',
  tags: 'quarterly, uk',
  assignee: 'Priya Naidoo',
  startDate: new Date().toISOString().slice(0, 10),
  progress: 60,
  comments: [{ id: '1', authorId: 'u', authorName: 'Sam', text: 'Looks good', createdAt: new Date().toISOString() }],
  submittedByName: 'Ayesha Khan',
  submittedByEmail: 'ayesha.khan@ninetyone.com',
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border border-brand-border-warm dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{description}</p>}
      {children}
    </section>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${checked ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Choice<T extends string>({ value, options, onChange, name }: { value: T; options: { id: T; label: string; hint?: string }[]; onChange: (v: T) => void; name: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`text-left p-3 border-2 rounded-lg transition-colors ${value === o.id ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/5' : 'border-gray-200 dark:border-gray-700 hover:border-brand-primary/40'}`}
        >
          <span className={`block text-xs font-medium ${value === o.id ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-700 dark:text-gray-300'}`}>{o.label}</span>
          {o.hint && <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{o.hint}</span>}
        </button>
      ))}
    </div>
  )
}

/** Show/hide and reorder the fields for one surface (the task card or the list's columns). */
function FieldEditor({ config, onChange, label }: { config: CardFieldsConfig; onChange: (c: CardFieldsConfig) => void; label: string }) {
  const fields = resolveCardFields(config)
  const defs = new Map(CARD_FIELDS.map((f) => [f.id, f]))
  return (
    <div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" aria-label={label}>
        {fields.map((f, i) => {
          const def = defs.get(f.id)!
          return (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2">
              <Switch checked={f.visible} onChange={() => onChange(toggleCardField(config, f.id))} label={`Show ${def.label}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${f.visible ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{def.label}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{def.hint}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => onChange(moveCardField(config, f.id, -1))} disabled={i === 0} aria-label={`Move ${def.label} up`}
                  className="w-7 h-7 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
                <button type="button" onClick={() => onChange(moveCardField(config, f.id, 1))} disabled={i === fields.length - 1} aria-label={`Move ${def.label} down`}
                  className="w-7 h-7 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
              </div>
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={() => onChange(defaultCardFields())} className="mt-2 text-xs text-brand-primary dark:text-brand-accent hover:underline">Reset to defaults</button>
    </div>
  )
}

export function TabCampaignPlanner() {
  const { settings, updateSettings } = useSettings()
  const cfg = settings.campaignPlanner
  const board = resolveBoardSettings(cfg)

  function patch(p: Partial<CampaignPlannerSettings>) {
    updateSettings({ campaignPlanner: { ...cfg, ...p } })
  }

  function toggleView(v: BoardView) {
    const on = board.enabledViews.includes(v)
    const next = on ? board.enabledViews.filter((x) => x !== v) : BOARD_VIEWS.filter((x) => x === v || board.enabledViews.includes(x))
    if (next.length === 0) return
    patch({ enabledViews: next, ...(on && board.defaultView === v ? { defaultView: next[0] } : {}) })
  }

  function toggleColumn(col: BoardColumnId) {
    const on = board.visibleColumns.includes(col)
    const next = on ? board.visibleColumns.filter((c) => c !== col) : BOARD_COLUMNS.filter((c) => c === col || board.visibleColumns.includes(c))
    if (next.length === 0) return
    patch({ visibleColumns: next })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-ni-display text-brand-primary dark:text-brand-accent text-2xl leading-none mb-1.5">Campaign Board</h2>
        <p className="text-sm text-brand-text-body dark:text-gray-400">
          One shared board for every submitted brief, with Board, List, Timeline and Calendar views. Choose what your team sees and what each task card shows.
        </p>
      </div>

      <Section title="Campaign Board">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Show the Campaign Board</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg">
              When off, the board is hidden for everyone. Briefs you submit are still added to it in the background, so nothing is lost and turning it back on shows them all.
            </p>
          </div>
          <Switch checked={board.enabled} onChange={() => patch({ enabled: !board.enabled })} label="Show the Campaign Board" />
        </div>
      </Section>

      <div className={board.enabled ? 'space-y-8' : 'space-y-8 opacity-50 pointer-events-none'} aria-disabled={!board.enabled}>
        <Section title="Views" description="Which views the board offers. At least one must stay on.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BOARD_VIEWS.map((v) => {
              const on = board.enabledViews.includes(v)
              return (
                <label key={v} className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer ${on ? 'border-brand-primary dark:border-brand-accent' : 'border-gray-200 dark:border-gray-700'}`}>
                  <input type="checkbox" checked={on} disabled={on && board.enabledViews.length === 1} onChange={() => toggleView(v)} className="w-4 h-4 accent-brand-primary" />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{BOARD_VIEW_LABEL[v]}</span>
                </label>
              )
            })}
          </div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-5 mb-2">Opens on</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Default view">
            {board.enabledViews.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={board.defaultView === v} onClick={() => patch({ defaultView: v })}
                className={`px-3 py-1.5 text-xs rounded-full border ${board.defaultView === v ? 'bg-brand-primary text-white border-brand-primary' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {BOARD_VIEW_LABEL[v]}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">Each person's own last-used view takes over once they switch.</p>
        </Section>

        <Section title="Stages" description="Which columns appear on the Board view.">
          <div className="space-y-2">
            {BOARD_COLUMNS.map((col) => {
              const on = board.visibleColumns.includes(col)
              const last = on && board.visibleColumns.length === 1
              return (
                <label key={col} className={`flex items-center gap-3 ${last ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input type="checkbox" checked={on} disabled={last} onChange={() => toggleColumn(col)} className="w-4 h-4 accent-brand-primary" />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{COLUMN_LABEL[col]}</span>
                  {last && <span className="text-xs text-gray-400 dark:text-gray-500">(at least one required)</span>}
                </label>
              )
            })}
          </div>
        </Section>

        <Section title="Task card" description="Choose which fields show on a task card, and in what order. The preview updates as you change them.">
          <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Size</p>
                <Choice<CardDensity> name="Card size" value={board.density} onChange={(density) => patch({ density })}
                  options={[{ id: 'comfortable', label: 'Comfortable', hint: 'Labelled fields with room to breathe' }, { id: 'compact', label: 'Compact', hint: 'Tighter, no field labels' }]} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Coloured edge</p>
                <Choice<CardAccent> name="Coloured edge" value={board.accent} onChange={(accent) => patch({ accent })}
                  options={[{ id: 'none', label: 'None' }, { id: 'theme', label: 'Brand theme', hint: "The email's primary colour" }, { id: 'urgency', label: 'Urgency', hint: 'Red when urgent' }]} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Fields <span className="font-normal text-gray-400">(the email name is always shown)</span></p>
                <FieldEditor label="Task card fields" config={board.cardFields} onChange={(cardFields) => patch({ cardFields })} />
              </div>
            </div>
            <div className="lg:sticky lg:top-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Preview</p>
              <div className="bg-gray-100/60 dark:bg-gray-800/40 p-3 rounded-xl">
                <BoardCard card={SAMPLE_CARD} board={board} approvalOverride="pending" readOnly />
              </div>
            </div>
          </div>
        </Section>

        <Section title="List view columns" description="The List view shows the same fields as the task card, one per column.">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Choose different columns for the List</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Off: the List uses the task card fields above.</p>
            </div>
            <Switch checked={board.separateListFields} onChange={() => patch({ separateListFields: !board.separateListFields })} label="Choose different columns for the List" />
          </div>
          {board.separateListFields && (
            <FieldEditor label="List columns" config={board.listFields} onChange={(listFields) => patch({ listFields })} />
          )}
        </Section>

        <Section title="Manual campaigns">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
              Let people add campaigns directly to the board without going through the briefing form. Turn off to limit the board to submitted briefs.
            </p>
            <Switch checked={board.allowManualCampaigns} onChange={() => patch({ allowManualCampaigns: !board.allowManualCampaigns })} label="Allow manual campaigns" />
          </div>
        </Section>
      </div>
    </div>
  )
}
