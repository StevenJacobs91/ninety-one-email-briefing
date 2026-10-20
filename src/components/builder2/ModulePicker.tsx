import { useMemo, useState } from 'react'

// Structure, header, footer and disclaimer modules are slots, not free picks.
const NOT_PICKABLE = /^(Visually Hidden|Small Header|Header with Image|Plain Logo Header|Footer|Disclaimer)/i

interface Props {
  names: string[]
  onPick: (name: string) => void
  onClose: () => void
}

export function ModulePicker({ names, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const options = useMemo(
    () => names.filter((n) => !NOT_PICKABLE.test(n) && n.toLowerCase().includes(query.trim().toLowerCase())),
    [names, query],
  )

  return (
    <div role="dialog" aria-label="Add a module" className="border border-brand-border-warm dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules…"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2">Cancel</button>
      </div>
      <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        {options.map((n) => (
          <li key={n}>
            <button type="button" onClick={() => onPick(n)} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-brand-primary/5">
              {n}
            </button>
          </li>
        ))}
        {options.length === 0 && <li className="px-3 py-3 text-sm text-gray-400">No module matches “{query}”.</li>}
      </ul>
    </div>
  )
}
