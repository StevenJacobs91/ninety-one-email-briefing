/**
 * How wide the buttons in a module are. A button module lays its buttons out in rows of cells: each button sits in a
 * cell, and a gap or empty cell fills the rest of the row. The library fixes those cell widths, so a long label has
 * nowhere to go; this lets a build choose them instead.
 */

export interface ButtonRow {
  /** Every cell of the row: the buttons, the gap between two of them, and any space beside a single one */
  cells: Element[]
  /** The cells that hold a button */
  buttons: Element[]
}

/** The gap between two buttons, as a percentage of the row. */
export const GAP = 2

/** The widths offered for a single button, as a percentage of the row. */
export const SINGLE_WIDTHS = [30, 40, 50, 60, 70, 80, 90, 100]

/** The splits offered for two buttons: the first button's share of the row, the second takes the rest. */
export const PAIR_SPLITS = [20, 30, 40, 50, 60, 70, 80]

const isCell = (el: Element) => /^(TH|TD)$/i.test(el.tagName)
const holdsButton = (cell: Element) => cell.querySelector('.button-copy') !== null && cell.querySelector('a') !== null

/** The rows of buttons in a module, in the order they appear. A module with no buttons has none. */
export function buttonRows(root: Element): ButtonRow[] {
  const rows: ButtonRow[] = []
  for (const tr of Array.from(root.querySelectorAll('tr'))) {
    const cells = Array.from(tr.children).filter(isCell)
    if (!cells.some((c) => /\bstack-column-button\b/.test(c.getAttribute('class') ?? ''))) continue
    const buttons = cells.filter(holdsButton)
    if (buttons.length > 0) rows.push({ cells, buttons })
  }
  return rows
}

const percent = (n: number) => `${n}%`

function setSingle(row: ButtonRow, share: number): void {
  const width = Math.min(100, Math.max(10, Math.round(share)))
  row.buttons[0].setAttribute('width', percent(width))
  const rest = row.cells.filter((c) => c !== row.buttons[0])
  if (width >= 100) {
    rest.forEach((c) => c.remove())
    return
  }
  const left = 100 - width
  if (rest.length === 1) {
    rest[0].setAttribute('width', percent(left))
    return
  }
  // A gap, then the space that fills the row.
  const space = rest.slice(1)
  rest[0]?.setAttribute('width', percent(GAP))
  space.forEach((c) => c.setAttribute('width', percent(Math.max(0, Math.floor((left - GAP) / space.length)))))
}

function setPair(row: ButtonRow, [first, second]: number[]): void {
  if (!(first > 0) || !(second > 0)) return
  const room = 100 - GAP
  const a = Math.round((room * first) / (first + second))
  row.buttons[0].setAttribute('width', percent(a))
  row.buttons[1].setAttribute('width', percent(room - a))
  row.cells.find((c) => !row.buttons.includes(c))?.setAttribute('width', percent(GAP))
}

/**
 * Applies a build's chosen widths, keyed by the row's position in the module. One number is a single button's width;
 * two are the shares of a pair. Widths that do not fit the row they name are ignored, so the library design stays.
 */
export function applyButtonWidths(root: Element, widths: Record<string, number[]> | undefined): void {
  if (!widths) return
  buttonRows(root).forEach((row, i) => {
    const chosen = widths[String(i)]
    if (!chosen) return
    if (row.buttons.length === 1 && chosen.length === 1) setSingle(row, chosen[0])
    else if (row.buttons.length === 2 && chosen.length === 2) setPair(row, chosen)
  })
}
