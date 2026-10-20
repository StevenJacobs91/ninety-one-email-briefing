import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { useSettings } from '../../contexts/SettingsContext'
import {
  addModule, duplicateModule, moveModule, removeModule, setImage, setRegion, setRepeat, setTheme, swapModule,
  type BuildModule, type EmailBuild,
} from '../../lib/moduleEngine/build'
import { describeModule } from '../../lib/moduleEngine/describe'
import { browserParse, type RegionValue } from '../../lib/moduleEngine/regions'
import { renderBuild } from '../../lib/moduleEngine/render'
import { bindBrief, buildFromLegacy, headerModuleFor, seedBuild } from '../../lib/moduleEngine/seed'
import { ModuleInspector } from './ModuleInspector'
import { ModulePicker } from './ModulePicker'
import { ModulePreview } from './ModulePreview'
import { useCatalogue } from './useCatalogue'

type BoundField = 'headline' | 'subHeadline' | 'bodyIntro'

export function LibraryBuilder() {
  const { watch, setValue, getValues, formState: { errors } } = useFormContext<BriefFormData>()
  const { settings } = useSettings()

  const theme = watch('campaign.theme')
  const regions = (watch('audience.region') ?? []) as string[]
  const headerTypeId = watch('assets.headerType') ?? 'standard'
  const headline = watch('content.headline') ?? ''
  const subHeadline = watch('content.subHeadline') ?? ''
  const bodyIntro = watch('content.bodyIntro') ?? ''
  const build = watch('content.build') as EmailBuild | undefined

  const cat = useCatalogue(theme)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerAt, setPickerAt] = useState<number | null>(null)

  const themeSettings = settings.brandThemes?.find((t) => t.id === theme)
  const assets = useMemo(
    () => ({ logoUrl: themeSettings?.logoUrl, stripeUrl: themeSettings?.stripeUrl, footerLogoUrl: themeSettings?.footerLogoUrl }),
    [themeSettings?.logoUrl, themeSettings?.stripeUrl, themeSettings?.footerLogoUrl],
  )

  const commit = useCallback(
    (b: EmailBuild) => setValue('content.build', b, { shouldDirty: true }),
    [setValue],
  )

  // Create the build, then keep it reconciled with the theme, header type,
  // region and the three brief fields bound to the header and body.
  const catalogue = cat.status === 'ready' ? cat.catalogue : null
  useEffect(() => {
    if (!catalogue) return
    let b = build
    if (!b) {
      const content = getValues('content')
      const hasLegacy = (content.modules?.length ?? 0) > 0 || (content.sections ?? []).some((s) => s.heading || s.body)
      b = hasLegacy
        ? buildFromLegacy(content, theme, { headerTypeId, regions }).build
        : seedBuild(theme, { headerTypeId, regions })
    }
    if (b.themeId !== theme) b = setTheme(b, theme)

    const header = b.modules.find((m) => m.slot === 'header')
    const wantHeader = headerModuleFor(headerTypeId)
    if (header && wantHeader && header.moduleName !== wantHeader) b = swapModule(b, header.instanceId, wantHeader)

    const disclaimer = b.modules.find((m) => m.slot === 'disclaimer')
    const wantDisclaimer = regions.includes('UK') ? 'Disclaimer - UK' : 'Disclaimer'
    if (disclaimer && /^Disclaimer/.test(disclaimer.moduleName) && disclaimer.moduleName !== wantDisclaimer) {
      b = swapModule(b, disclaimer.instanceId, wantDisclaimer)
    }

    const next = bindBrief(b, { headline, subHeadline, bodyIntro }, catalogue, browserParse)
    if (JSON.stringify(next) !== JSON.stringify(build)) commit(next)
  }, [catalogue, build, theme, headerTypeId, regions.join(','), headline, subHeadline, bodyIntro]) // eslint-disable-line react-hooks/exhaustive-deps

  const previews = useMemo(() => {
    if (!catalogue || !build) return new Map<string, { html: string; dropped: number }>()
    const map = new Map<string, { html: string; dropped: number }>()
    for (const m of build.modules) {
      const out = renderBuild({ ...build, modules: [m] }, catalogue, { parse: browserParse, assets })
      map.set(m.instanceId, { html: out.html, dropped: out.report.droppedKeys.length })
    }
    return map
  }, [catalogue, build, assets])

  const selected = build?.modules.find((m) => m.instanceId === selectedId) ?? null
  const info = useMemo(() => {
    if (!catalogue || !selected) return null
    const html = catalogue.modules[selected.moduleName]
    return html === undefined ? null : describeModule(selected.moduleName, html, browserParse, selected.repeats)
  }, [catalogue, selected])

  if (cat.status === 'loading') return <p className="text-sm text-gray-500">Loading the module library…</p>
  if (cat.status === 'error') {
    return (
      <div role="alert" className="border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
        {cat.message}{' '}
        <button type="button" onClick={cat.retry} className="underline font-medium">Retry</button>
      </div>
    )
  }
  if (!build || !catalogue) return <p className="text-sm text-gray-500">Preparing your email…</p>

  const onRegion = (m: BuildModule, key: string, patch: RegionValue) => {
    const bind = m.boundFields[key] as BoundField | undefined
    commit(setRegion(build, m.instanceId, key, patch, bind))
    if (bind && patch.value !== undefined) setValue(`content.${bind}`, patch.value, { shouldValidate: true, shouldDirty: true })
  }

  const headlineError = errors.content?.headline?.message
  const bodyError = errors.content?.bodyIntro?.message

  return (
    <div>
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-1">Layout &amp; Content</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Choose the modules this email needs, then click a module to edit its content.
      </p>

      {(headlineError || bodyError) && (
        <div role="alert" className="mb-4 border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
          {headlineError && <p>Headline: {headlineError}. Add it in the header module.</p>}
          {bodyError && <p>Body intro: {bodyError}. Add it in the Body Content module.</p>}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {build.modules.map((m, i) => {
            const p = previews.get(m.instanceId)
            const isSel = m.instanceId === selectedId
            return (
              <div key={m.instanceId}>
                {pickerAt === i ? (
                  <ModulePicker
                    names={catalogue.order}
                    onClose={() => setPickerAt(null)}
                    onPick={(name) => {
                      const next = addModule(build, name, i)
                      commit(next)
                      const added = next.modules.find((x) => !build.modules.some((o) => o.instanceId === x.instanceId))
                      setSelectedId(added?.instanceId ?? null)
                      setPickerAt(null)
                    }}
                  />
                ) : (
                  i > 0 && (
                    <button type="button" onClick={() => setPickerAt(i)} className="w-full py-1 text-xs text-brand-primary dark:text-brand-accent hover:bg-brand-primary/5">
                      + Add module here
                    </button>
                  )
                )}
                <div className={`relative border ${isSel ? 'border-brand-primary dark:border-brand-accent ring-2 ring-brand-primary/20' : 'border-brand-border-warm dark:border-gray-700'}`}>
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-200 truncate">
                      {m.moduleName}{m.slot ? ` · ${m.slot}` : ''}
                      {p && p.dropped > 0 && <span className="ml-2 text-amber-600">{p.dropped} saved value{p.dropped > 1 ? 's' : ''} not in this theme</span>}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <button type="button" aria-label={`Move ${m.moduleName} up`} disabled={!!m.slot} onClick={() => commit(moveModule(build, m.instanceId, i - 1))} className="px-1.5 disabled:opacity-30">↑</button>
                      <button type="button" aria-label={`Move ${m.moduleName} down`} disabled={!!m.slot} onClick={() => commit(moveModule(build, m.instanceId, i + 1))} className="px-1.5 disabled:opacity-30">↓</button>
                      <button type="button" aria-label={`Duplicate ${m.moduleName}`} disabled={!!m.slot} onClick={() => commit(duplicateModule(build, m.instanceId))} className="px-1.5 disabled:opacity-30">⧉</button>
                      <button type="button" aria-label={`Remove ${m.moduleName}`} disabled={!!m.slot} onClick={() => { commit(removeModule(build, m.instanceId)); if (isSel) setSelectedId(null) }} className="px-1.5 text-red-600 disabled:opacity-30">✕</button>
                    </span>
                  </div>
                  <div className="relative">
                    {p ? <ModulePreview html={p.html} title={m.moduleName} /> : <p className="p-4 text-sm text-red-600">“{m.moduleName}” is not in this theme’s library.</p>}
                    <button type="button" aria-label={`Edit ${m.moduleName}`} onClick={() => setSelectedId(m.instanceId)} className="absolute inset-0 w-full h-full cursor-pointer bg-transparent hover:bg-brand-primary/5" />
                  </div>
                </div>
              </div>
            )
          })}
          <div className="mt-2">
            {pickerAt === build.modules.length ? (
              <ModulePicker names={catalogue.order} onClose={() => setPickerAt(null)} onPick={(name) => { commit(addModule(build, name, build.modules.length)); setPickerAt(null) }} />
            ) : (
              <button type="button" onClick={() => setPickerAt(build.modules.length)} className="w-full py-2 text-sm font-medium text-brand-primary dark:text-brand-accent border border-dashed border-brand-primary/40 hover:bg-brand-primary/5">
                + Add module
              </button>
            )}
          </div>
        </div>

        {selected && info && (
          <ModuleInspector
            module={selected}
            info={info}
            headerTypes={settings.headers ?? []}
            headerTypeId={headerTypeId}
            accentColour={themeSettings?.accent}
            onRegion={(key, patch) => onRegion(selected, key, patch)}
            onRepeat={(group, count) => commit(setRepeat(build, selected.instanceId, group, count))}
            onImage={(key, src) => commit(setImage(build, selected.instanceId, key, { src }))}
            onHeaderType={(id) => setValue('assets.headerType', id, { shouldDirty: true })}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}
