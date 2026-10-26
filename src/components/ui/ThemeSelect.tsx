import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export interface ThemeOption {
  id: string
  label: string
  primary: string
  accent: string
  /** A theme that cannot be chosen yet (no module library) */
  disabled?: boolean
  /** A short note shown under the name */
  note?: string
}

interface Props {
  id: string
  /** The form field this stands for, which a problem on the field jumps to */
  name: string
  /** The id of the label naming this control */
  labelledBy: string
  value: string
  options: ThemeOption[]
  onChange: (id: string) => void
}

function Swatch({ primary, accent }: { primary: string; accent: string }) {
  return (
    <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
      <span data-swatch="primary" className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: primary }} />
      <span data-swatch="accent" className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: accent }} />
    </span>
  )
}

/**
 * A drop-down for choosing a brand theme, with each theme's two colours beside its name in the list as well as in the closed
 * control. A native select cannot draw colours inside its list, so this is a listbox: arrows move, Enter chooses, Escape closes.
 */
export function ThemeSelect({ id, name, labelledBy, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const chosen = options.find((o) => o.id === value)

  const optionId = (i: number) => `${listId}-${i}`
  const enabled = (i: number) => i >= 0 && i < options.length && !options[i].disabled

  const show = () => {
    const at = options.findIndex((o) => o.id === value)
    setActive(enabled(at) ? at : options.findIndex((o) => !o.disabled))
    setOpen(true)
  }
  const close = (refocus = false) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }
  const choose = (i: number) => {
    if (!enabled(i)) return
    onChange(options[i].id)
    close(true)
  }
  // Moves to the next theme that can be chosen, skipping the ones that cannot.
  const step = (from: number, direction: 1 | -1) => {
    for (let i = from + direction; i >= 0 && i < options.length; i += direction) if (enabled(i)) return i
    return from
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  // Keeps the highlighted theme in view as the arrows move through a long list.
  useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active]) // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        show()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((a) => step(a, 1)); break
      case 'ArrowUp': e.preventDefault(); setActive((a) => step(a, -1)); break
      case 'Home': e.preventDefault(); setActive(step(-1, 1)); break
      case 'End': e.preventDefault(); setActive(step(options.length, -1)); break
      case 'Enter':
      case ' ': e.preventDefault(); choose(active); break
      case 'Escape': e.preventDefault(); close(true); break
      case 'Tab': close(); break
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        id={id}
        name={name}
        data-field={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelledBy} ${id}`}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        className="w-full flex items-center gap-3 border px-3 py-3 text-sm text-left bg-white dark:bg-gray-800 dark:text-gray-100 border-brand-border-field dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent"
      >
        {chosen && <Swatch primary={chosen.primary} accent={chosen.accent} />}
        <span className="flex-1 min-w-0 truncate">{chosen?.label ?? 'Select a theme'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={labelledBy}
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto border border-brand-border-field dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1"
        >
          {options.map((option, i) => (
            <li
              key={option.id}
              id={optionId(i)}
              role="option"
              aria-selected={option.id === value}
              aria-disabled={option.disabled || undefined}
              title={option.disabled ? option.note : undefined}
              onMouseEnter={() => enabled(i) && setActive(i)}
              onClick={() => choose(i)}
              className={`flex items-center gap-3 px-3 py-2 text-sm ${
                option.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : `cursor-pointer ${i === active ? 'bg-brand-primary/10 dark:bg-white/10' : ''}`
              } ${option.id === value ? 'font-medium' : ''}`}
            >
              <Swatch primary={option.primary} accent={option.accent} />
              <span className="flex-1 min-w-0">
                <span className="block truncate text-gray-800 dark:text-gray-100">{option.label}</span>
                {option.note && <span className="block text-[10px] text-gray-500 dark:text-gray-400">{option.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
