import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { useSettings } from '../../contexts/SettingsContext'
import { getThemeColours } from '../../lib/themeColours'
import { useAuth } from '../../contexts/AuthContext'
import { canSaveCampaignBuild, templateFromBuild } from '../../lib/campaignTemplate'
import {
  addModule, duplicateModule, isLocked, moveModule, removeModule, setImage, setRegion, setRepeat, setStyle, clearStyle, setTheme, swapModule,
  type BuildModule, type EmailBuild,
} from '../../lib/moduleEngine/build'
import { describeModule } from '../../lib/moduleEngine/describe'
import { browserParse, type RegionValue } from '../../lib/moduleEngine/regions'
import { renderBuild } from '../../lib/moduleEngine/render'
import { deriveCta } from '../../lib/moduleEngine/derive'
import { applyGreeting } from '../../lib/moduleEngine/greeting'
import { bindBrief, buildFromLegacy, headerModuleFor, seedBuild } from '../../lib/moduleEngine/seed'
import { ModuleInspector } from './ModuleInspector'
import { ModulePicker } from './ModulePicker'
import { ModulePreview } from './ModulePreview'
import { useCatalogue } from './useCatalogue'

type BoundField = 'headline' | 'subHeadline' | 'bodyIntro'

export function LibraryBuilder() {
  const { watch, setValue, getValues, formState: { errors } } = useFormContext<BriefFormData>()
  const { settings, updateSettings } = useSettings()
  const { profile } = useAuth()
  const [saveNote, setSaveNote] = useState('')

  const theme = watch('campaign.theme')
  const regions = (watch('audience.region') ?? []) as string[]
  const headerTypeId = watch('assets.headerType') ?? 'standard'
  const headline = watch('content.headline') ?? ''
  const subHeadline = watch('content.subHeadline') ?? ''
  const bodyIntro = watch('content.bodyIntro') ?? ''
  const build = watch('content.build') as EmailBuild | undefined
  const greetingId = watch('content.greetingId') ?? ''
  const greetings = settings.greetings ?? []
  const chosenGreeting = greetings.find((g) => g.id === greetingId) ?? greetings.find((g) => g.isDefault) ?? null
  const heroImageUrl = watch('assets.heroImageUrl') ?? ''
  const heroImageAlt = watch('assets.heroImageAlt') ?? ''
  const requiresHero = (settings.headers ?? []).find((h) => h.id === headerTypeId)?.requiresHeroImage ?? false

  const cat = useCatalogue(theme)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerAt, setPickerAt] = useState<number | null>(null)

  const themeSettings = settings.brandThemes?.find((t) => t.id === theme)
  // Bold text uses the selected theme's accent: the saved override, else the library colour.
  const accent = themeSettings?.accent ?? getThemeColours(theme).accent
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

    // The form's hero image is the single source of truth for header types that need one.
    const hdr = b.modules.find((m) => m.slot === 'header')
    if (hdr && requiresHero && (hdr.images['img:0']?.src ?? '') !== heroImageUrl) {
      b = setImage(b, hdr.instanceId, 'img:0', { src: heroImageUrl })
    }

    const disclaimer = b.modules.find((m) => m.slot === 'disclaimer')
    const wantDisclaimer = regions.includes('UK') ? 'Disclaimer - UK' : 'Disclaimer'
    if (disclaimer && /^Disclaimer/.test(disclaimer.moduleName) && disclaimer.moduleName !== wantDisclaimer) {
      b = swapModule(b, disclaimer.instanceId, wantDisclaimer)
    }

    const next = applyGreeting(bindBrief(b, { headline, subHeadline, bodyIntro }, catalogue, browserParse), chosenGreeting?.value ?? null)
    if (JSON.stringify(next) !== JSON.stringify(build)) commit(next)

    // The brief's single CTA (Pardot, Power Automate, Brand Review) follows the first edited button.
    const cta = deriveCta(next, catalogue, browserParse) ?? { label: '', url: '' }
    const current = getValues('content.cta')
    if (current?.label !== cta.label || current?.url !== cta.url) {
      setValue('content.cta', { label: cta.label, url: cta.url, openInNewTab: current?.openInNewTab ?? true }, { shouldDirty: true })
    }
  }, [catalogue, build, theme, headerTypeId, regions.join(','), headline, subHeadline, bodyIntro, requiresHero, heroImageUrl, chosenGreeting?.value]) // eslint-disable-line react-hooks/exhaustive-deps

  const previews = useMemo(() => {
    if (!catalogue || !build) return new Map<string, { html: string; dropped: number }>()
    const map = new Map<string, { html: string; dropped: number }>()
    for (const m of build.modules) {
      const out = renderBuild({ ...build, modules: [m] }, catalogue, { parse: browserParse, assets, accent })
      map.set(m.instanceId, { html: out.html, dropped: out.report.droppedKeys.length })
    }
    return map
  }, [catalogue, build, assets, accent])

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

  const removeOne = (m: BuildModule) => {
    commit(removeModule(build, m.instanceId))
    if (m.instanceId === selectedId) setSelectedId(null)
    // The brief's body intro follows the body module; without it there is no intro.
    if (Object.values(m.boundFields).includes('bodyIntro')) setValue('content.bodyIntro', '', { shouldDirty: true })
  }

  const pick = (name: string, at: number) => {
    const next = addModule(build, name, at)
    commit(next)
    const added = next.modules.find((x) => !build.modules.some((o) => o.instanceId === x.instanceId))
    setSelectedId(added?.instanceId ?? null)
    setPickerAt(null)
  }

  const campaignName = getValues('campaign.campaignName')
  const campaign = (settings.campaigns ?? []).find((c) => c.name === campaignName)
  const canSave = canSaveCampaignBuild(profile?.role, settings.rolePermissions)

  const saveTemplate = () => {
    if (!campaign) return
    const existing = campaign.contentPreset
    if (existing?.build && !window.confirm(`Overwrite the saved layout for “${campaign.name}”?`)) return
    const template = { ...templateFromBuild(build), headerTypeId: headerTypeId }
    const preset = {
      theme: theme, subjectLine: '', previewText: '', heroImageUrl: '', headline: '', subHeadline: '',
      signatureId: '', disclaimerId: '', distributionList: '', pardotListId: '',
      ...existing,
      build: template,
    }
    updateSettings({
      campaigns: (settings.campaigns ?? []).map((c) => (c.id === campaign.id ? { ...c, contentPreset: preset } : c)),
    })
    setSaveNote(`Saved as the “${campaign.name}” template.`)
  }

  const headlineError = errors.content?.headline?.message

  return (
    <div>
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-1">Layout &amp; Content</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Choose the modules this email needs, then click a module to edit its content.
      </p>

      {canSave && (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={saveTemplate}
            disabled={!campaign}
            title={campaign ? undefined : 'Select a configured campaign on the Campaign tab first'}
            className="border border-brand-primary/40 text-brand-primary dark:text-brand-accent px-3 py-1.5 text-xs font-medium hover:bg-brand-primary/5 disabled:opacity-40"
          >
            Save as campaign template
          </button>
          {saveNote && <span role="status" className="text-green-700 dark:text-green-400 text-xs">{saveNote}</span>}
        </div>
      )}

      {headlineError && (
        <div role="alert" className="mb-4 border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
          {headlineError && <p>Headline: {headlineError}. Add it in the header module.</p>}
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
                    onPick={(name) => pick(name, i)}
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
                      <button type="button" aria-label={`Move ${m.moduleName} up`} disabled={isLocked(m)} onClick={() => commit(moveModule(build, m.instanceId, i - 1))} className="px-1.5 disabled:opacity-30">↑</button>
                      <button type="button" aria-label={`Move ${m.moduleName} down`} disabled={isLocked(m)} onClick={() => commit(moveModule(build, m.instanceId, i + 1))} className="px-1.5 disabled:opacity-30">↓</button>
                      <button type="button" aria-label={`Duplicate ${m.moduleName}`} disabled={isLocked(m)} onClick={() => commit(duplicateModule(build, m.instanceId))} className="px-1.5 disabled:opacity-30">⧉</button>
                      <button type="button" aria-label={`Remove ${m.moduleName}`} disabled={isLocked(m)} onClick={() => removeOne(m)} className="px-1.5 text-red-600 disabled:opacity-30">✕</button>
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
              <ModulePicker names={catalogue.order} onClose={() => setPickerAt(null)} onPick={(name) => pick(name, build.modules.length)} />
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
            accentColour={accent}
            onRegion={(key, patch) => onRegion(selected, key, patch)}
            onRepeat={(group, count) => commit(setRepeat(build, selected.instanceId, group, count))}
            onImage={(key, src) => commit(setImage(build, selected.instanceId, key, { src }))}
            onStyle={(key, patch) => commit(setStyle(build, selected.instanceId, key, patch))}
            onClearStyle={(key) => commit(clearStyle(build, selected.instanceId, key))}
            onHeaderType={(id) => setValue('assets.headerType', id, { shouldDirty: true })}
            greeting={{
              options: greetings.map((g) => ({ id: g.id, label: g.label, value: g.value })),
              selectedId: chosenGreeting?.id ?? '',
              onSelect: (id) => setValue('content.greetingId', id, { shouldDirty: true }),
            }}
            hero={requiresHero ? {
              url: heroImageUrl,
              alt: heroImageAlt,
              themeId: theme,
              headline,
              subHeadline,
              onChange: (patch) => {
                if (patch.url !== undefined) setValue('assets.heroImageUrl', patch.url, { shouldValidate: true, shouldDirty: true })
                if (patch.alt !== undefined) setValue('assets.heroImageAlt', patch.alt, { shouldValidate: true, shouldDirty: true })
              },
            } : undefined}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}
