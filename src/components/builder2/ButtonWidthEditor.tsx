import { PAIR_SPLITS, SINGLE_WIDTHS } from '../../lib/moduleEngine/buttonWidths'

interface Props {
  /** How many buttons are in each row of the module, top to bottom */
  rows: number[]
  /** The widths chosen so far, by row */
  widths: Record<string, number[]> | undefined
  /** `undefined` goes back to the library design */
  onChange: (row: number, widths: number[] | undefined) => void
}

const SELECT = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm'
const LABEL = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1'

/**
 * How wide the buttons are. A single button can take a share of the row, to fit a longer label; two buttons share the
 * row in a split, such as 30% / 70%. A row of any other size is left as the library designed it.
 */
export function ButtonWidthEditor({ rows, widths, onChange }: Props) {
  const adjustable = rows.map((buttons, row) => ({ buttons, row })).filter((r) => r.buttons === 1 || r.buttons === 2)
  if (adjustable.length === 0) return null

  return (
    <section aria-label="Button width" className="space-y-3">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Button width</h3>
      {adjustable.map(({ buttons, row }, n) => {
        const noun = buttons === 1 ? 'width' : 'split'
        const label = adjustable.length > 1 ? `Row ${n + 1} ${noun}` : noun[0].toUpperCase() + noun.slice(1)
        const id = `button-${noun}-${row}`
        const chosen = widths?.[String(row)]?.[0]
        return (
          <div key={row}>
            <label htmlFor={id} className={LABEL}>{label}</label>
            <select
              id={id}
              value={chosen === undefined ? '' : String(chosen)}
              onChange={(e) => {
                const value = Number(e.target.value)
                if (!e.target.value) onChange(row, undefined)
                else onChange(row, buttons === 1 ? [value] : [value, 100 - value])
              }}
              className={SELECT}
            >
              <option value="">As designed</option>
              {buttons === 1
                ? SINGLE_WIDTHS.map((w) => <option key={w} value={w}>{w}%</option>)
                : PAIR_SPLITS.map((a) => <option key={a} value={a}>{a}% / {100 - a}%</option>)}
            </select>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              {buttons === 1 ? 'A wider button holds longer text.' : "The first button's share of the row; the second takes the rest."}
            </p>
          </div>
        )
      })}
    </section>
  )
}
