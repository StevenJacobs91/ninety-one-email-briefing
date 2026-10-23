import type { ModuleKind } from '../../lib/moduleKinds'

type Box = { l: number; t: number; w: number; h: number; tone?: 'bar' | 'primary' | 'accent' | 'outline'; round?: boolean }

const TONE = {
  bar: 'bg-gray-300 dark:bg-gray-600',
  primary: 'bg-brand-primary',
  accent: 'bg-brand-accent',
  outline: 'border border-brand-primary bg-transparent',
} as const

const text = (l: number, t: number, w: number): Box[] => [
  { l, t, w, h: 10 }, { l, t: t + 22, w: w + 6, h: 8 }, { l, t: t + 38, w: w - 10, h: 8 },
]

function buttons(n: number): Box[] {
  const row: Box[] = []
  const w = n === 1 ? 36 : n === 2 ? 36 : 26
  const gap = 4
  const start = (100 - (n * w + (n - 1) * gap)) / 2
  for (let i = 0; i < n; i++) row.push({ l: start + i * (w + gap), t: 50, w, h: 24, tone: i === 0 ? 'primary' : 'outline' })
  return [{ l: 14, t: 18, w: 72, h: 10 }, ...row]
}

function layout(kind: ModuleKind, count: number): Box[] {
  switch (kind) {
    case 'numbered': return [{ l: 6, t: 16, w: 14, h: 28, tone: 'primary', round: true }, ...text(26, 18, 56)]
    case 'podcast': return [{ l: 6, t: 14, w: 30, h: 70, tone: 'primary' }, { l: 42, t: 20, w: 50, h: 10 }, { l: 42, t: 42, w: 36, h: 8 }, { l: 42, t: 62, w: 28, h: 16, tone: 'outline' }]
    case 'video': return [{ l: 6, t: 10, w: 88, h: 78, tone: 'primary' }, { l: 42, t: 30, w: 16, h: 38, tone: 'accent', round: true }]
    case 'buttons': return buttons(count)
    case 'gallery': return [0, 1, 2].flatMap((c) => [0, 1].map((r) => ({ l: 6 + c * 31, t: 12 + r * 40, w: 28, h: 36, tone: (c + r) % 2 ? 'accent' : 'primary' } as Box)))
    case 'event': return [{ l: 6, t: 12, w: 40, h: 10, tone: 'primary' }, { l: 6, t: 32, w: 60, h: 8 }, { l: 6, t: 46, w: 50, h: 8 }, { l: 6, t: 66, w: 30, h: 20, tone: 'accent' }]
    case 'table': return [0, 1, 2, 3].flatMap((r) => [{ l: 6, t: 12 + r * 20, w: 22, h: 10, tone: r === 0 ? 'primary' : 'bar' } as Box, { l: 34, t: 12 + r * 20, w: 58, h: 10 }])
    case 'people': return [0, 1].flatMap((c) => [{ l: 8 + c * 46, t: 14, w: 20, h: 34, tone: 'accent', round: true } as Box, { l: 8 + c * 46, t: 56, w: 38, h: 8 }, { l: 8 + c * 46, t: 72, w: 28, h: 8 }])
    case 'list': return [0, 1, 2].flatMap((r) => [{ l: 6, t: 12 + r * 28, w: 22, h: 22, tone: 'accent' } as Box, { l: 34, t: 14 + r * 28, w: 58, h: 8 }, { l: 34, t: 28 + r * 28, w: 44, h: 6 }])
    case 'tabs': return [{ l: 6, t: 12, w: 24, h: 14, tone: 'primary' }, { l: 34, t: 12, w: 24, h: 14, tone: 'outline' }, { l: 62, t: 12, w: 24, h: 14, tone: 'outline' }, ...text(6, 40, 70).slice(1)]
    case 'legal': return [0, 1, 2, 3].map((r) => ({ l: 8, t: 14 + r * 18, w: r === 3 ? 40 : 84, h: 6 }))
    case 'text': return text(8, 14, 62)
    default: return [{ l: 8, t: 14, w: 84, h: 70, tone: 'outline' }]
  }
}

/** A tiny wireframe of the module's layout, drawn from its kind. Decorative; the name carries the meaning. */
export function ModuleThumb({ kind, buttons: count = 0 }: { kind: ModuleKind; buttons?: number }) {
  return (
    <span aria-hidden="true" className="relative block w-12 h-8 shrink-0 overflow-hidden rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {layout(kind, count).map((b, i) => (
        <i
          key={i}
          className={`absolute block ${b.round ? 'rounded-full' : 'rounded-[2px]'} ${TONE[b.tone ?? 'bar']}`}
          style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%` }}
        />
      ))}
    </span>
  )
}
