import type { BuildModule } from '../../lib/moduleEngine/build'
import type { ModuleInfo } from '../../lib/moduleEngine/describe'
import type { RegionValue } from '../../lib/moduleEngine/regions'
import { headerModuleFor } from '../../lib/moduleEngine/seed'
import type { HeaderTypeConfig } from '../../types/settings.types'
import { RegionEditor } from './RegionEditor'
import { HeroImagePicker } from './HeroImagePicker'

interface Props {
  module: BuildModule
  info: ModuleInfo
  headerTypes: HeaderTypeConfig[]
  headerTypeId: string
  accentColour?: string
  onRegion: (key: string, patch: RegionValue) => void
  onRepeat: (group: string, count: number) => void
  onImage: (key: string, src: string) => void
  onHeaderType: (id: string) => void
  /** Background image for header types that require one (replaces the plain placeholder-image field). */
  hero?: React.ComponentProps<typeof HeroImagePicker>
  /** Greetings saved in Settings → Greetings, for the Greeting module. */
  greeting?: { options: { id: string; label: string; value: string }[]; selectedId: string; onSelect: (id: string) => void }
  onClose: () => void
}

export function ModuleInspector({
  module: m, info, headerTypes, headerTypeId, accentColour, onRegion, onRepeat, onImage, onHeaderType, hero, greeting, onClose,
}: Props) {
  const editable = info.fields.filter((f) => !f.locked)
  const lockedCount = info.fields.length - editable.length
  const showHero = !!hero && m.slot === 'header'
  const showGreeting = !!greeting && m.moduleName === 'Greeting'
  const hasContent = showHero || showGreeting || editable.length > 0 || info.images.length > 0 || info.repeats.some((r) => r.canResize)

  return (
    <aside className="w-full lg:w-[340px] shrink-0 border border-brand-border-warm dark:border-gray-700 bg-white dark:bg-gray-900 lg:sticky lg:top-[7.5rem] lg:max-h-[calc(100vh-12.5rem)] lg:overflow-y-auto shadow-sm">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{m.moduleName}</p>
          {m.slot && <p className="text-xs text-gray-400 capitalize">{m.slot}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close module editor" className="text-gray-400 hover:text-gray-600 px-1">&times;</button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {m.slot === 'header' && (
          <div>
            <label htmlFor="header-type" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Header type</label>
            <select
              id="header-type"
              value={headerTypeId}
              onChange={(e) => onHeaderType(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm"
            >
              {headerTypes.filter((h) => h.enabled).map((h) => {
                const pending = headerModuleFor(h.id) === null
                return <option key={h.id} value={h.id} disabled={pending}>{h.label}{pending ? ' (module pending)' : ''}</option>
              })}
            </select>
          </div>
        )}

        {showGreeting && (
          <div>
            <label htmlFor="greeting-select" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Greeting</label>
            {greeting!.options.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                No greetings yet. Add them in Settings → Greetings.
              </p>
            ) : (
              <>
                <select
                  id="greeting-select"
                  value={greeting!.selectedId}
                  onChange={(e) => greeting!.onSelect(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm"
                >
                  {greeting!.options.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
                <p className="mt-2 text-xs font-mono text-gray-500 dark:text-gray-400 break-words">
                  {greeting!.options.find((g) => g.id === greeting!.selectedId)?.value}
                </p>
              </>
            )}
          </div>
        )}

        {editable.map((f) => (
          <RegionEditor key={f.key} field={f} saved={m.regions[f.key]} accentColour={accentColour} onChange={(patch) => onRegion(f.key, patch)} />
        ))}

        {info.repeats.filter((r) => r.canResize).map((r) => (
          <div key={r.group} className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Items</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Remove an item" disabled={r.units <= 1} onClick={() => onRepeat(r.group, r.units - 1)}
                className="w-7 h-7 border border-gray-300 dark:border-gray-600 text-gray-600 disabled:opacity-40">−</button>
              <span className="w-6 text-center text-sm tabular-nums">{r.units}</span>
              <button type="button" aria-label="Add an item" onClick={() => onRepeat(r.group, r.units + 1)}
                className="w-7 h-7 border border-gray-300 dark:border-gray-600 text-gray-600">+</button>
            </div>
          </div>
        ))}

        {showHero && <HeroImagePicker {...hero!} />}

        {info.images.map((src, i) => (showHero && i === 0) ? null : (
          <div key={src}>
            <label htmlFor={`img-${i}`} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Image {info.images.length > 1 ? i + 1 : ''} URL</label>
            <input id={`img-${i}`} value={m.images[`img:${i}`]?.src ?? ''} placeholder="https://… (replaces the placeholder)"
              onChange={(e) => onImage(`img:${i}`, e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm" />
          </div>
        ))}

        {!hasContent && lockedCount === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">This module has no editable content; it is used as designed.</p>
        )}
      </div>
    </aside>
  )
}
