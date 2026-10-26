import { useState } from 'react'
import type { BoxInfo } from '../../lib/moduleEngine/describe'
import { BACKGROUND_CHOICES, normaliseLength, type BackgroundChoice, type BackgroundColours, type BoxStyle, type Side } from '../../lib/moduleEngine/boxModel'

const BACKGROUND_LABEL: Record<BackgroundChoice, string> = { primary: 'Primary', tint01: 'Tint 01', tint02: 'Tint 02', tint03: 'Tint 03' }

interface Props {
  boxes: BoxInfo[]
  styles: Record<string, BoxStyle>
  /** The selected theme's colours for the module background; with none, the choice is not offered */
  backgrounds?: BackgroundColours
  onStyle: (key: string, patch: BoxStyle) => void
  onClear: (key: string) => void
}

const SIDE_LABEL: Record<Side, string> = { top: 'top', right: 'right', bottom: 'bottom', left: 'left' }

function hasOverride(style: BoxStyle | undefined): boolean {
  if (!style) return false
  const any = (s?: Record<string, string | undefined>) => Object.values(s ?? {}).some((v) => v !== undefined && v !== '')
  return any(style.margin) || any(style.padding) || (style.class !== undefined && style.class !== '') || !!style.background
}

/** A length field for one side. Shows the design's own value as a placeholder until it is overridden. */
function SideInput({ kind, side, value, placeholder, disabled, onChange }: {
  kind: 'Margin' | 'Padding'
  side: Side
  value: string
  placeholder: string
  disabled: boolean
  onChange: (v: string) => void
}) {
  const invalid = value !== '' && normaliseLength(value) === null
  return (
    <input
      aria-label={`${kind} ${SIDE_LABEL[side]}`}
      aria-invalid={invalid ? true : undefined}
      disabled={disabled}
      value={value}
      placeholder={disabled ? '–' : placeholder || '0'}
      onChange={(e) => onChange(e.target.value)}
      className={`w-14 text-center text-xs tabular-nums bg-white/80 dark:bg-gray-900/70 border rounded px-1 py-1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:bg-transparent disabled:border-transparent disabled:cursor-not-allowed ${invalid ? 'border-red-500 text-red-600' : 'border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100'}`}
    />
  )
}

/**
 * Spacing and class for one element of the selected module, laid out like the browser inspector's box
 * model: margin outside, padding inside, the content in the middle. Empty fields keep the design's value.
 */
export function BoxModelEditor({ boxes, styles, backgrounds, onStyle, onClear }: Props) {
  const [selected, setSelected] = useState(boxes[0]?.key ?? 'container')
  if (boxes.length === 0) return null

  const box = boxes.find((b) => b.key === selected) ?? boxes[0]
  const style = styles[box.key]
  const value = (kind: 'margin' | 'padding', side: Side) => style?.[kind]?.[side] ?? ''

  const sideInput = (kind: 'margin' | 'padding', side: Side) => (
    <SideInput
      kind={kind === 'margin' ? 'Margin' : 'Padding'}
      side={side}
      value={value(kind, side)}
      placeholder={box.read[kind][side]}
      disabled={kind === 'margin' && !box.allowMargin}
      onChange={(v) => onStyle(box.key, { [kind]: { [side]: v } })}
    />
  )

  return (
    <section aria-label="Spacing and class">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Spacing &amp; class</p>
        <button
          type="button"
          onClick={() => onClear(box.key)}
          disabled={!hasOverride(style)}
          className="text-[11px] text-brand-primary dark:text-brand-accent hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
        >
          Reset to design
        </button>
      </div>

      <div className="pt-3 space-y-3">
        <div>
          <label htmlFor="box-element" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Element</label>
          <select
            id="box-element"
            value={box.key}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm"
          >
            {boxes.map((b) => <option key={b.key} value={b.key}>{b.label}{hasOverride(styles[b.key]) ? ' •' : ''}</option>)}
          </select>
        </div>

        {box.key === 'container' && backgrounds && BACKGROUND_CHOICES.some((c) => backgrounds[c]) && (
          <div>
            <p id="box-background-label" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Background</p>
            <div role="radiogroup" aria-labelledby="box-background-label" className="flex flex-wrap items-center gap-2">
              {[{ id: '' as const, label: 'Design', colour: '' }, ...BACKGROUND_CHOICES.filter((c) => backgrounds[c]).map((c) => ({ id: c, label: BACKGROUND_LABEL[c], colour: backgrounds[c] as string }))].map((o) => {
                const selected = (style?.background ?? '') === o.id
                return (
                  <label key={o.id || 'design'} title={o.colour ? `${o.label} · ${o.colour}` : 'Keep the design\'s own colour'} className={`flex items-center gap-1.5 cursor-pointer rounded-md border px-2 py-1 text-xs ${selected ? 'border-brand-primary dark:border-brand-accent ring-2 ring-brand-primary/30 text-gray-900 dark:text-gray-100' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                    <input type="radio" name="box-background" aria-label={o.label} checked={selected} onChange={() => onStyle(box.key, { background: o.id })} className="sr-only" />
                    <span className="w-4 h-4 rounded-full border border-black/10" style={o.colour ? { backgroundColor: o.colour } : undefined} aria-hidden="true" />
                    {o.label}
                  </label>
                )
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">The module's background, from the theme. Design keeps the library's own colour.</p>
          </div>
        )}

        {/* Margin (outer) → padding (inner) → content, centred, in the brand colours */}
        <div className="mx-auto max-w-[19rem] rounded-md bg-brand-accent/30 dark:bg-brand-accent/15 border border-dashed border-brand-accent-muted p-2">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary dark:text-brand-accent pl-1">margin{!box.allowMargin && ' (n/a here)'}</p>
          <div className="flex justify-center">{sideInput('margin', 'top')}</div>
          <div className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-1">
            <div className="flex justify-center">{sideInput('margin', 'left')}</div>
            <div className="rounded-md bg-white/70 dark:bg-brand-primary/40 border border-dashed border-brand-primary/60 p-2">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary dark:text-gray-100 pl-1">padding</p>
              <div className="flex justify-center">{sideInput('padding', 'top')}</div>
              <div className="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-1">
                <div className="flex justify-center">{sideInput('padding', 'left')}</div>
                <div className="rounded bg-brand-primary py-3 text-center text-[11px] text-white">content</div>
                <div className="flex justify-center">{sideInput('padding', 'right')}</div>
              </div>
              <div className="flex justify-center">{sideInput('padding', 'bottom')}</div>
            </div>
            <div className="flex justify-center">{sideInput('margin', 'right')}</div>
          </div>
          <div className="flex justify-center">{sideInput('margin', 'bottom')}</div>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">Numbers are pixels. Leave a side empty to keep the design's value.</p>

        <div>
          <label htmlFor="box-class" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Class</label>
          <input
            id="box-class"
            value={style?.class ?? ''}
            placeholder={box.read.class || 'none'}
            onChange={(e) => onStyle(box.key, { class: e.target.value })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Replaces the element's classes. Separate several with spaces.</p>
        </div>
      </div>
    </section>
  )
}
