import { useRef, useState } from 'react'
import type { BuildModule } from '../../lib/moduleEngine/build'
import type { FieldInfo, ModuleInfo } from '../../lib/moduleEngine/describe'
import type { RegionValue } from '../../lib/moduleEngine/regions'
import { headerModuleFor } from '../../lib/moduleEngine/seed'
import type { HeaderTypeConfig } from '../../types/settings.types'
import { RegionEditor } from './RegionEditor'
import { BoxModelEditor } from './BoxModelEditor'
import { ButtonWidthEditor } from './ButtonWidthEditor'
import type { BackgroundColours, BoxStyle } from '../../lib/moduleEngine/boxModel'
import type { AssetCategory } from '../../types/settings.types'
import { HeroImagePicker } from './HeroImagePicker'
import { AssetLibraryPicker } from './AssetLibraryPicker'

interface Props {
  module: BuildModule
  info: ModuleInfo
  headerTypes: HeaderTypeConfig[]
  headerTypeId: string
  accentColour?: string
  /** The theme's primary and tint colours, for the module background choice */
  backgrounds?: BackgroundColours
  /** The media library images start in: Profiles for a People module, Graphics otherwise */
  imageCategory?: AssetCategory
  onRegion: (key: string, patch: RegionValue) => void
  onRepeat: (group: string, count: number) => void
  onImage: (key: string, patch: { src?: string; alt?: string }) => void
  onStyle: (key: string, patch: BoxStyle) => void
  onClearStyle: (key: string) => void
  /** Sets how wide a row of buttons is; `undefined` goes back to the library design. Without it the width control is not shown. */
  onButtonWidths?: (row: number, widths: number[] | undefined) => void
  onHeaderType: (id: string) => void
  /** Background image for header types that require one (replaces the plain placeholder-image field). */
  hero?: React.ComponentProps<typeof HeroImagePicker>
  /** Greetings saved in Settings → Greetings, for the Greeting module. */
  greeting?: { options: { id: string; label: string; value: string }[]; selectedId: string; onSelect: (id: string) => void }
  /** Disclaimers saved in Settings → Disclaimers, for the Disclaimer module. `selectedId` is 'module' for the module's own wording. */
  disclaimer?: { options: { id: string; label: string; region: string }[]; selectedId: string; preview: string; onSelect: (id: string) => void }
  /** For a Footer module: the sign-off, the signature chosen from Settings, and the social icons. */
  footer?: {
    signoffIncluded: boolean
    onSignoff: (include: boolean) => void
    social: boolean
    onSocial: (show: boolean) => void
    /** `selectedId` is a signature's id, 'none', or 'module' for the module's own signature */
    signature: { options: { id: string; label: string }[]; selectedId: string; preview: string; onSelect: (id: string) => void }
  }
  onClose: () => void
}

export function ModuleInspector({
  module: m, info, headerTypes, headerTypeId, accentColour, backgrounds, imageCategory, onRegion, onRepeat, onImage, onStyle, onClearStyle, onButtonWidths, onHeaderType, hero, greeting, disclaimer, footer, onClose,
}: Props) {
  const editable = info.fields.filter((f) => !f.locked)
  const lockedCount = info.fields.length - editable.length
  // Only a row of one or two buttons can be widened; the control is left out when there is none.
  const buttonRows = info.buttonRows ?? []
  const showButtonWidths = !!onButtonWidths && buttonRows.some((n) => n === 1 || n === 2)
  const showHero = !!hero && m.slot === 'header'
  const showGreeting = !!greeting && m.moduleName === 'Greeting'
  const showDisclaimer = !!disclaimer && /^Disclaimer/i.test(m.moduleName)
  // With a disclaimer chosen from Settings its wording replaces the module's own, so those fields would do nothing.
  const disclaimerDrivesText = showDisclaimer && disclaimer!.selectedId !== 'module'
  // Where a module repeats (articles, say), each unit is edited as a section of its own, in the order it reads in the email.
  const repeating = info.repeats.filter((r) => r.canResize)
  const inUnit = (f: FieldInfo) => !!f.unit && repeating.some((r) => r.group === f.unit!.group)
  const imageFields = editable.filter((f) => f.kind === 'image' && !inUnit(f))
  const showFooter = !!footer && !!info.footer
  const textFields = editable.filter((f) => f.kind !== 'image' && !inUnit(f) && !disclaimerDrivesText && !showFooter)
  const unitSections = (group: string) => {
    const sections: { index: number; fields: FieldInfo[] }[] = []
    for (const f of editable.filter((x) => x.unit?.group === group)) {
      const found = sections.find((s) => s.index === f.unit!.index)
      if (found) found.fields.push(f)
      else sections.push({ index: f.unit!.index, fields: [f] })
    }
    return sections.sort((a, b) => a.index - b.index)
  }
  const footerFields = showFooter ? editable.filter((f) => f.kind !== 'image') : []
  const sharedImages = info.images.filter((_, i) => !info.imageInUnit?.[i])
  const hasMedia = showHero || sharedImages.length > 0 || imageFields.length > 0
  const hasContent = showHero || showGreeting || editable.length > 0 || info.images.length > 0 || repeating.length > 0

  return (
    <aside className="w-full lg:w-[340px] shrink-0 border border-brand-border-warm dark:border-gray-700 bg-white dark:bg-gray-900 lg:sticky lg:top-[7.5rem] lg:max-h-[calc(100vh-12.5rem)] lg:overflow-y-auto shadow-sm">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{m.moduleName}</p>
          {m.slot && <p className="text-xs text-gray-400 capitalize">{m.slot}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close module editor" className="text-gray-400 hover:text-gray-600 px-1">&times;</button>
      </div>

      <TabbedPanels
        key={m.instanceId}
        tabs={[
          { id: 'content', label: 'Content', show: true, panel: (
            <>
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
                const pending = headerModuleFor(h.id, headerTypes) === null
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

        {showDisclaimer && (
          <div>
            <label htmlFor="disclaimer-select" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Disclaimer</label>
            {disclaimer!.options.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                No disclaimers yet. Add them in Settings → Disclaimers.
              </p>
            ) : (
              <>
                <select
                  id="disclaimer-select"
                  value={disclaimer!.selectedId}
                  onChange={(e) => disclaimer!.onSelect(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm"
                >
                  {disclaimer!.options.map((d) => <option key={d.id} value={d.id}>{d.label} · {d.region}</option>)}
                  <option value="module">The module&apos;s own wording</option>
                </select>
                {disclaimerDrivesText && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-4">{disclaimer!.preview}</p>}
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  {disclaimerDrivesText ? 'Edit the wording in Settings → Disclaimers.' : "The fields below are the module's own wording."}
                </p>
              </>
            )}
          </div>
        )}

        {showFooter && <FooterPanels info={info} footer={footer!} fields={footerFields} renderField={(f) => (
          <RegionEditor key={f.key} field={f} saved={m.regions[f.key]} accentColour={accentColour} onChange={(patch) => onRegion(f.key, patch)} />
        )} />}

        {textFields.map((f) => (
          <RegionEditor key={f.key} field={f} saved={m.regions[f.key]} accentColour={accentColour} onChange={(patch) => onRegion(f.key, patch)} />
        ))}

        {repeating.map((r) => {
          const noun = r.group.charAt(0).toUpperCase() + r.group.slice(1)
          const sections = unitSections(r.group)
          return (
            <div key={r.group} className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{sections.length > 0 ? `${noun}s` : 'Items'}</span>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Remove an item" disabled={r.units <= 1} onClick={() => onRepeat(r.group, r.units - 1)}
                    className="w-7 h-7 border border-gray-300 dark:border-gray-600 text-gray-600 disabled:opacity-40">−</button>
                  <span className="w-6 text-center text-sm tabular-nums">{r.units}</span>
                  <button type="button" aria-label="Add an item" onClick={() => onRepeat(r.group, r.units + 1)}
                    className="w-7 h-7 border border-gray-300 dark:border-gray-600 text-gray-600">+</button>
                </div>
              </div>
              {sections.map((s) => (
                <section key={s.index} aria-label={`${noun} ${s.index + 1}`} className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <h3 className={SECTION}>{noun} {s.index + 1}</h3>
                  {s.fields.map((f) => (
                    <RegionEditor key={f.key} field={{ ...f, label: f.name ?? f.label }} saved={m.regions[f.key]} accentColour={accentColour} imageCategory={imageCategory} onChange={(patch) => onRegion(f.key, patch)} />
                  ))}
                </section>
              ))}
            </div>
          )
        })}

        {!hasContent && lockedCount === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">This module has no editable text or images; it is used as designed.</p>
        )}

            </>
          ) },
          { id: 'media', label: 'Media', show: hasMedia, panel: (
            <>
        {showHero && <HeroImagePicker {...hero!} />}

        {imageFields.map((f) => (
          <RegionEditor key={f.key} field={f} saved={m.regions[f.key]} accentColour={accentColour} imageCategory={imageCategory} onChange={(patch) => onRegion(f.key, patch)} />
        ))}

        {info.images.map((src, i) => {
          if (showHero && i === 0) return null
          if (info.imageInUnit?.[i]) return null
          const kind = info.imageKinds[i]
          const same = info.imageKinds.filter((k) => (k === 'profile') === (kind === 'profile'))
          const nth = info.imageKinds.slice(0, i + 1).filter((k) => (k === 'profile') === (kind === 'profile')).length
          const name = kind === 'profile' ? 'Profile photo' : 'Image'
          const saved = m.images[`img:${i}`]
          return (
            <AssetLibraryPicker
              key={src}
              category={kind === 'profile' ? 'profile' : imageCategory ?? 'graphics'}
              label={same.length > 1 ? `${name} ${nth}` : name}
              url={saved?.src ?? ''}
              alt={saved?.alt ?? ''}
              onChange={(patch) => onImage(`img:${i}`, { src: patch.url, alt: patch.alt })}
            />
          )
        })}

            </>
          ) },
          { id: 'style', label: 'Style', show: info.boxes.length > 0 || showButtonWidths, panel: (
            <>
              {showButtonWidths && <ButtonWidthEditor rows={buttonRows} widths={m.buttonWidths} onChange={onButtonWidths!} />}
              {info.boxes.length > 0 && <BoxModelEditor key={m.instanceId} boxes={info.boxes} styles={m.styles ?? {}} backgrounds={backgrounds} onStyle={onStyle} onClear={onClearStyle} />}
            </>
          ) },
        ]}
      />
    </aside>
  )
}

interface Tab { id: string; label: string; show: boolean; panel: React.ReactNode }

/** Content, Media and Style, each shown only when the module has something in it. Opens on the first tab. */
function TabbedPanels({ tabs }: { tabs: Tab[] }) {
  const shown = tabs.filter((t) => t.show)
  const [selected, setSelected] = useState(shown[0].id)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const active = shown.find((t) => t.id === selected) ?? shown[0]

  const move = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
    if (next === null) return
    e.preventDefault()
    const t = shown[(next + shown.length) % shown.length]
    setSelected(t.id)
    refs.current[t.id]?.focus()
  }

  return (
    <>
      <div role="tablist" aria-label="Module settings" className="flex border-b border-gray-100 dark:border-gray-800 px-2">
        {shown.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el }}
            type="button"
            role="tab"
            id={`inspector-tab-${t.id}`}
            aria-selected={t.id === active.id}
            aria-controls={`inspector-panel-${t.id}`}
            tabIndex={t.id === active.id ? 0 : -1}
            onClick={() => setSelected(t.id)}
            onKeyDown={(e) => move(e, i)}
            className={`px-3 py-2 text-xs font-medium -mb-px border-b-2 ${t.id === active.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`inspector-panel-${active.id}`} aria-labelledby={`inspector-tab-${active.id}`} className="px-4 py-4 space-y-5">
        {active.panel}
      </div>
    </>
  )
}

const SECTION = 'text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500'
const CHECK = 'flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 cursor-pointer'

/** A footer as its three parts, each with its own choice and the text that belongs to it. */
function FooterPanels({ info, footer, fields, renderField }: {
  info: ModuleInfo
  footer: NonNullable<Props['footer']>
  fields: FieldInfo[]
  renderField: (f: FieldInfo) => React.ReactNode
}) {
  const of = (section: FieldInfo['section']) => fields.filter((f) => f.section === section)
  const other = fields.filter((f) => !f.section)
  const sig = footer.signature
  const fromSettings = sig.selectedId !== 'module' && sig.selectedId !== 'none'
  const has = info.footer!

  return (
    <div className="space-y-6">
      {has.hasSignoff && (
        <section aria-label="Sign-off" className="space-y-3">
          <h3 className={SECTION}>Sign-off</h3>
          <label className={CHECK}>
            <input type="checkbox" checked={footer.signoffIncluded} onChange={(e) => footer.onSignoff(e.target.checked)} />
            Include sign-off text
          </label>
          {footer.signoffIncluded ? of('signoff').map(renderField) : <p className="text-xs text-gray-400">The message above the signature is left out.</p>}
        </section>
      )}

      {has.hasSignature && (
        <section aria-label="Signature" className="space-y-3">
          <h3 className={SECTION}>Signature</h3>
          <div>
            <label htmlFor="signature-select" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Signature</label>
            <select
              id="signature-select"
              value={sig.selectedId}
              onChange={(e) => sig.onSelect(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm"
            >
              {sig.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              <option value="none">No signature</option>
              <option value="module">The module&apos;s own signature</option>
            </select>
            {fromSettings && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{sig.preview}</p>}
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              {fromSettings ? 'Edit signatures in Settings → Signatures.' : sig.selectedId === 'none' ? 'The footer has no signature.' : "The fields below are the module's own signature."}
            </p>
          </div>
          {sig.selectedId === 'module' && of('signature').map(renderField)}
        </section>
      )}

      <section aria-label="Footer tail" className="space-y-3">
        <h3 className={SECTION}>Footer tail</h3>
        <label className={CHECK}>
          <input type="checkbox" checked={footer.social} onChange={(e) => footer.onSocial(e.target.checked)} />
          Show social icons
        </label>
        {of('tail').map(renderField)}
      </section>

      {other.length > 0 && (
        <section aria-label="Other footer text" className="space-y-3">
          <h3 className={SECTION}>More text</h3>
          {other.map(renderField)}
        </section>
      )}
    </div>
  )
}
