import { useMemo, useState } from 'react'
import { describePickerModule, groupPickerModules, type PickerGroup } from '../../lib/moduleKinds'
import { ModuleThumb } from './ModuleThumb'

// Structure, header, footer and disclaimer modules are slots, not free picks.
const NOT_PICKABLE = /^(Visually Hidden|Small Header|Header with Image|Plain Logo Header|Footer|Disclaimer)/i

interface Props {
  names: string[]
  /** Where modules added in Settings belong, by name; built-in modules are grouped by what they are */
  groups?: Record<string, PickerGroup>
  onPick: (name: string) => void
  onClose: () => void
}

export function ModulePicker({ names, groups: customGroups, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const groups = useMemo(
    () => groupPickerModules(names.filter((n) => !NOT_PICKABLE.test(n) && n.toLowerCase().includes(query.trim().toLowerCase())), customGroups),
    [names, query, customGroups],
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
      <div className="max-h-80 overflow-y-auto">
        {groups.map(({ group, names: inGroup }) => (
          <section key={group}>
            <h3 className="sticky top-0 bg-white dark:bg-gray-900 pt-2 pb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">{group}</h3>
            <ul aria-label={group} className="divide-y divide-gray-100 dark:divide-gray-800">
              {inGroup.map((n) => {
                const info = describePickerModule(n, customGroups?.[n])
                return (
                  <li key={n}>
                    <button type="button" onClick={() => onPick(n)} className="w-full flex items-center gap-3 text-left px-3 py-2 hover:bg-brand-primary/5">
                      <ModuleThumb kind={info.kind} buttons={info.buttons} />
                      <span className="min-w-0">
                        <span className="block text-sm text-gray-700 dark:text-gray-200">{n}</span>
                        {info.blurb && <span className="block text-xs text-gray-400 dark:text-gray-500">{info.blurb}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="px-3 py-3 text-sm text-gray-400">No module matches “{query}”.</p>}
      </div>
    </div>
  )
}
