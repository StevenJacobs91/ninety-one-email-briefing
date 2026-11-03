import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'
import { useInspectorSlot } from './InspectorSlot'
import type { BriefFormData } from '../../lib/schema'
import { useSettings } from '../../contexts/SettingsContext'
import { getThemeColours } from '../../lib/themeColours'
import { useAuth } from '../../contexts/AuthContext'
import { canSaveCampaignBuild, templateFromBuild } from '../../lib/campaignTemplate'
import {
  addHeader, addModule, duplicateModule, isLocked, isMovable, isRemovable, moveModule, removeModule, setDisclaimer, setFooter, setImage, setRegion, setRepeat, setStyle, clearStyle, setButtonWidths, setTheme, swapModule,
  type BuildModule, type EmailBuild,
} from '../../lib/moduleEngine/build'
import { describeModule } from '../../lib/moduleEngine/describe'
import { browserParse, type RegionValue } from '../../lib/moduleEngine/regions'
import { renderBuild } from '../../lib/moduleEngine/render'
import { deriveCta } from '../../lib/moduleEngine/derive'
import { applyGreeting } from '../../lib/moduleEngine/greeting'
import { signoffSummary } from '../../lib/signoff'
import { categoryGroup, customLayoutIcons, disabledModuleNames } from '../../lib/customModules'
import { defaultImageCategory, describePickerModule } from '../../lib/moduleKinds'
import { moduleCategories, resolveCategory } from '../../lib/moduleCategories'
import type { FooterOptions } from '../../lib/moduleEngine/footer'
import { defaultDisclaimerFor, disclaimerSource, disclaimerToText } from '../../lib/disclaimer'
import { bindBrief, buildFromLegacy, headerModuleFor, headerRequiresHero, seedBuild } from '../../lib/moduleEngine/seed'
import { ModuleInspector } from './ModuleInspector'
import { ModulePicker } from './ModulePicker'
import { DESKTOP_WIDTH, MOBILE_WIDTH, ModulePreview } from './ModulePreview'
import { canRedo, canUndo, emptyHistory, record, redo, undo, type History, type Snapshot } from '../../lib/buildHistory'
import { useCatalogue } from './useCatalogue'

type BoundField = 'headline' | 'subHeadline' | 'bodyIntro'

// Memoised: it takes no props and watches its own values, so the form shell redrawing for a keystroke elsewhere does not redraw the email.
export const LibraryBuilder = memo(function LibraryBuilder() {
  const { control, setValue, getValues } = useFormContext<BriefFormData>()
  // Each value is watched by name here, so typing in the brief's other fields does not redraw the email.
  const { errors } = useFormState({ control, name: 'content.headline' })
  const [briefId, theme, regionsRaw, headerTypeRaw, headlineRaw, subHeadlineRaw, bodyIntroRaw, buildRaw, greetingIdRaw, disclaimerIdRaw, footerSignoffIdRaw, heroImageUrlRaw, heroImageAltRaw] = useWatch({
    control,
    name: ['meta.briefId', 'campaign.theme', 'audience.region', 'assets.headerType', 'content.headline', 'content.subHeadline', 'content.bodyIntro', 'content.build', 'content.greetingId', 'content.disclaimerId', 'content.footerSignoffId', 'assets.heroImageUrl', 'assets.heroImageAlt'],
  })
  const slot = useInspectorSlot()
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  // In the workspace the inspector has a column of its own; on its own it stays beside the canvas.
  const place = (node: ReactNode) => (slot ? createPortal(node, slot) : node)
  const { settings, updateSettings } = useSettings()
  const { profile } = useAuth()
  const [saveNote, setSaveNote] = useState('')

  const regions = (regionsRaw ?? []) as string[]
  const headerTypeId = headerTypeRaw ?? 'standard'
  const headline = headlineRaw ?? ''
  const subHeadline = subHeadlineRaw ?? ''
  const bodyIntro = bodyIntroRaw ?? ''
  const build = buildRaw as EmailBuild | undefined
  const greetingId = greetingIdRaw ?? ''
  const greetings = settings.greetings ?? []
  const chosenGreeting = greetings.find((g) => g.id === greetingId) ?? greetings.find((g) => g.isDefault) ?? null
  const disclaimers = settings.legalDisclaimers ?? []
  const disclaimerId = disclaimerIdRaw ?? ''
  // The chosen disclaimer, else the default for the brief's regions; 'module' keeps the module's own wording.
  const chosenDisclaimer = disclaimerId === 'module' ? null : (disclaimers.find((d) => d.id === disclaimerId) ?? defaultDisclaimerFor(disclaimers, regions))
  const disclaimerHtml = chosenDisclaimer ? disclaimerSource(chosenDisclaimer) : null
  const signoffs = settings.signoffs ?? []
  const footerSignoffId = footerSignoffIdRaw ?? ''
  // The chosen signature, else the default one; 'none' takes it out and 'module' keeps the module's own.
  const chosenSignoff = footerSignoffId === 'none' || footerSignoffId === 'module'
    ? undefined
    : (signoffs.find((s) => s.id === footerSignoffId) ?? signoffs.find((s) => s.isDefault) ?? signoffs[0])
  const footerSignature: FooterOptions['signature'] = footerSignoffId === 'none' ? 'none' : chosenSignoff ? { entry: chosenSignoff } : undefined
  const footerSignatureKey = JSON.stringify(footerSignature ?? null)
  const heroImageUrl = heroImageUrlRaw ?? ''
  const heroImageAlt = heroImageAltRaw ?? ''
  const requiresHero = headerRequiresHero((settings.headers ?? []).find((h) => h.id === headerTypeId))

  const cat = useCatalogue(theme)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerAt, setPickerAt] = useState<number | null>(null)

  const themeSettings = settings.brandThemes?.find((t) => t.id === theme)
  // Bold text uses the selected theme's accent: the saved override, else the library colour.
  const accent = themeSettings?.accent ?? getThemeColours(theme).accent
  // The module background can be the theme's primary or one of its tints: the same colours the email is rendered with.
  const backgrounds = { primary: themeSettings?.primary ?? getThemeColours(theme).primary, tint01: themeSettings?.tint01, tint02: themeSettings?.tint02, tint03: themeSettings?.tint03 }
  const assets = useMemo(
    () => ({ logoUrl: themeSettings?.logoUrl, stripeUrl: themeSettings?.stripeUrl, slimStripeUrl: themeSettings?.slimStripeUrl, footerLogoUrl: themeSettings?.footerLogoUrl }),
    [themeSettings?.logoUrl, themeSettings?.stripeUrl, themeSettings?.slimStripeUrl, themeSettings?.footerLogoUrl],
  )

  const commit = useCallback(
    (b: EmailBuild) => setValue('content.build', b, { shouldDirty: true }),
    [setValue],
  )

  // Create the build, then keep it reconciled with the theme, header type,
  // region and the three brief fields bound to the header and body.
  const catalogue = cat.status === 'ready' ? cat.catalogue : null
  // Modules switched off in Settings are not offered, and those added there are grouped by their category.
  const disabled = useMemo(() => disabledModuleNames(settings.htmlModules ?? []), [settings.htmlModules])
  const pickable = useMemo(() => (catalogue?.order ?? []).filter((n) => !disabled.has(n)), [catalogue, disabled])
  // The categories are the ones in Settings → Email Modules. A module filed there is grouped by that in the picker; one that is not is grouped by its name.
  const categories = useMemo(() => moduleCategories(settings), [settings])
  const customGroups = useMemo(
    () => Object.fromEntries((settings.htmlModules ?? []).map((m) => [m.label, resolveCategory(categories, categoryGroup(m.category))])),
    [settings.htmlModules, categories],
  )
  const customIcons = useMemo(() => customLayoutIcons(settings.htmlModules ?? []), [settings.htmlModules])
  useEffect(() => {
    if (!catalogue) return
    let b = build
    if (!b) {
      const content = getValues('content')
      const hasLegacy = (content.modules?.length ?? 0) > 0 || (content.sections ?? []).some((s) => s.heading || s.body)
      b = hasLegacy
        ? buildFromLegacy(content, theme, { headerTypeId, regions, headers: settings.headers }).build
        : seedBuild(theme, { headerTypeId, regions, headers: settings.headers })
    }
    if (b.themeId !== theme) b = setTheme(b, theme)

    const header = b.modules.find((m) => m.slot === 'header')
    const wantHeader = headerModuleFor(headerTypeId, settings.headers)
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

    for (const dm of b.modules.filter((x) => x.slot === 'disclaimer' && /^Disclaimer/.test(x.moduleName))) {
      if ((dm.disclaimerHtml ?? null) !== disclaimerHtml) b = setDisclaimer(b, dm.instanceId, disclaimerHtml)
    }

    for (const fm of b.modules.filter((x) => x.slot === 'footer' && /^Footer/.test(x.moduleName))) {
      if (JSON.stringify(fm.footer?.signature ?? null) !== footerSignatureKey) b = setFooter(b, fm.instanceId, { signature: footerSignature })
    }

    // The brief's plain-text disclaimer (summary, Brand Guardian) follows the one in the email.
    const plainDisclaimer = chosenDisclaimer?.text ?? ''
    if (getValues('content.legalDisclaimer') !== plainDisclaimer) setValue('content.legalDisclaimer', plainDisclaimer, { shouldDirty: true })

    const next = applyGreeting(bindBrief(b, { headline, subHeadline, bodyIntro }, catalogue, browserParse), chosenGreeting?.value ?? null)
    if (JSON.stringify(next) !== JSON.stringify(build)) commit(next)

    // The brief's single CTA (Pardot, Power Automate, Brand Review) follows the first edited button.
    const cta = deriveCta(next, catalogue, browserParse) ?? { label: '', url: '' }
    const current = getValues('content.cta')
    if (current?.label !== cta.label || current?.url !== cta.url) {
      setValue('content.cta', { label: cta.label, url: cta.url, openInNewTab: current?.openInNewTab ?? true }, { shouldDirty: true })
    }
  }, [catalogue, build, theme, headerTypeId, regions.join(','), headline, subHeadline, bodyIntro, requiresHero, heroImageUrl, chosenGreeting?.value, disclaimerHtml, footerSignatureKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const previews = useMemo(() => {
    if (!catalogue || !build) return new Map<string, { html: string; dropped: number }>()
    const map = new Map<string, { html: string; dropped: number }>()
    for (const m of build.modules) {
      // brandThemes gives the tints their colours, so a Background choice shows here as it will in the email.
      const out = renderBuild({ ...build, modules: [m] }, catalogue, { parse: browserParse, assets, accent, brandThemes: settings.brandThemes })
      map.set(m.instanceId, { html: out.html, dropped: out.report.droppedKeys.length })
    }
    return map
  }, [catalogue, build, assets, accent, settings.brandThemes])

  const selected = build?.modules.find((m) => m.instanceId === selectedId) ?? null
  const info = useMemo(() => {
    if (!catalogue || !selected) return null
    const html = catalogue.modules[selected.moduleName]
    return html === undefined ? null : describeModule(selected.moduleName, html, browserParse, selected.repeats)
  }, [catalogue, selected])

  // Where a module's pictures start in the media library: Profiles for people, Images for articles, Graphics otherwise.
  const imageCategory = selected ? defaultImageCategory(selected.moduleName, customGroups[selected.moduleName] ?? describePickerModule(selected.moduleName).group) : 'graphics'

  // Undo and redo cover the email and its theme. Edits in the same place within half a second are one step.
  const [history, setHistory] = useState<History>(emptyHistory)
  const applying = useRef(false)
  const snap = useRef<Snapshot>({ build, theme })
  const current: Snapshot = { build, theme }

  // A theme change comes from the brief, not from here, so it is noticed as it happens.
  useEffect(() => {
    if (snap.current.theme === theme) return
    if (!applying.current) setHistory((h) => record(h, snap.current, undefined, Date.now()))
    applying.current = false
    snap.current = { build: snap.current.build, theme }
  }, [theme]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (snap.current.theme === theme) snap.current = { build, theme }
  }, [build, theme])

  // A different brief (new, or loaded from a draft) starts with a clean history.
  const briefIdRef = useRef(briefId)
  useEffect(() => {
    if (briefIdRef.current === briefId) return
    briefIdRef.current = briefId
    setHistory(emptyHistory())
    snap.current = { build, theme }
  }, [briefId]) // eslint-disable-line react-hooks/exhaustive-deps

  const applySnapshot = (snapshot: Snapshot) => {
    if (snapshot.theme !== theme) {
      applying.current = true
      setValue('campaign.theme', snapshot.theme, { shouldDirty: true })
    }
    if (snapshot.build) setValue('content.build', snapshot.build, { shouldDirty: true })
  }
  const goBack = () => {
    const move = undo(history, current)
    if (!move.snapshot) return
    setHistory(move.history)
    applySnapshot(move.snapshot)
  }
  const goForward = () => {
    const move = redo(history, current)
    if (!move.snapshot) return
    setHistory(move.history)
    applySnapshot(move.snapshot)
  }

  // Cmd/Ctrl+Z on the email or the inspector's own controls. Inside a text box the browser's own undo is left alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      const key = e.key.toLowerCase()
      const wantsUndo = key === 'z' && !e.shiftKey
      const wantsRedo = (key === 'z' && e.shiftKey) || key === 'y'
      if (!wantsUndo && !wantsRedo) return
      const target = e.target as HTMLElement | null
      if (!target || target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"], .cm-editor')) return
      if (!target.closest('#brief-email-builder, [aria-label="Module inspector"]')) return
      e.preventDefault()
      if (wantsUndo) goBack()
      else goForward()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

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

  // A change the person made: remembered for undo, then applied.
  const edit = (next: EmailBuild, key?: string) => {
    setHistory((h) => record(h, { build, theme }, key, Date.now()))
    commit(next)
  }

  const onRegion = (m: BuildModule, key: string, patch: RegionValue) => {
    const bind = m.boundFields[key] as BoundField | undefined
    edit(setRegion(build, m.instanceId, key, patch, bind), `region:${m.instanceId}:${key}`)
    if (bind && patch.value !== undefined) setValue(`content.${bind}`, patch.value, { shouldValidate: true, shouldDirty: true })
  }

  const removeOne = (m: BuildModule) => {
    edit(removeModule(build, m.instanceId))
    if (m.instanceId === selectedId) setSelectedId(null)
    // The brief's body intro follows the body module; without it there is no intro.
    if (Object.values(m.boundFields).includes('bodyIntro')) setValue('content.bodyIntro', '', { shouldDirty: true })
  }

  const pick = (name: string, at: number) => {
    const next = addModule(build, name, at)
    edit(next)
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
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <div role="group" aria-label="History" className="inline-flex border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
          <button type="button" onClick={goBack} disabled={!canUndo(history)} aria-label="Undo" title="Undo (Cmd/Ctrl+Z)" className="px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">↶ Undo</button>
          <button type="button" onClick={goForward} disabled={!canRedo(history)} aria-label="Redo" title="Redo (Shift+Cmd/Ctrl+Z)" className="px-3 py-1.5 border-l border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">↷ Redo</button>
        </div>
        <div role="group" aria-label="Preview width" className="inline-flex border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-0.5">
          {([['desktop', 'Desktop'], ['mobile', 'Mobile']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              onClick={() => setDevice(id)}
              className={`px-3 py-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${device === id ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {canSave && (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={saveTemplate}
            disabled={!campaign}
            title={campaign ? undefined : 'Select a configured campaign in the brief first'}
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
          {!build.modules.some((m) => m.slot === 'header') && (
            <button type="button" onClick={() => edit(addHeader(build, headerModuleFor(headerTypeId, settings.headers) ?? 'Plain Logo Header'))} className="w-full mb-2 py-2 text-sm font-medium text-brand-primary dark:text-brand-accent border border-dashed border-brand-primary/40 hover:bg-brand-primary/5">
              + Add header
            </button>
          )}
          {build.modules.map((m, i) => {
            const p = previews.get(m.instanceId)
            const isSel = m.instanceId === selectedId
            return (
              <div key={m.instanceId}>
                {pickerAt === i ? (
                  <ModulePicker
                    names={pickable}
                    groups={customGroups}
                    categories={categories}
                    icons={customIcons}
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
                      <button type="button" aria-label={`Move ${m.moduleName} up`} disabled={!isMovable(m)} onClick={() => edit(moveModule(build, m.instanceId, i - 1))} className="px-1.5 disabled:opacity-30">↑</button>
                      <button type="button" aria-label={`Move ${m.moduleName} down`} disabled={!isMovable(m)} onClick={() => edit(moveModule(build, m.instanceId, i + 1))} className="px-1.5 disabled:opacity-30">↓</button>
                      <button type="button" aria-label={`Duplicate ${m.moduleName}`} disabled={isLocked(m)} onClick={() => edit(duplicateModule(build, m.instanceId))} className="px-1.5 disabled:opacity-30">⧉</button>
                      <button type="button" aria-label={`Remove ${m.moduleName}`} disabled={!isRemovable(m)} onClick={() => removeOne(m)} className="px-1.5 text-red-600 disabled:opacity-30">✕</button>
                    </span>
                  </div>
                  <div className="relative">
                    {p ? <ModulePreview html={p.html} title={m.moduleName} width={device === 'mobile' ? MOBILE_WIDTH : DESKTOP_WIDTH} /> : <p className="p-4 text-sm text-red-600">“{m.moduleName}” is not in this theme’s library.</p>}
                    <button type="button" aria-label={`Edit ${m.moduleName}`} onClick={() => setSelectedId(m.instanceId)} className="absolute inset-0 w-full h-full cursor-pointer bg-transparent hover:bg-brand-primary/5" />
                  </div>
                </div>
              </div>
            )
          })}
          <div className="mt-2">
            {pickerAt === build.modules.length ? (
              <ModulePicker names={pickable} groups={customGroups} categories={categories} icons={customIcons} onClose={() => setPickerAt(null)} onPick={(name) => pick(name, build.modules.length)} />
            ) : (
              <button type="button" onClick={() => setPickerAt(build.modules.length)} className="w-full py-2 text-sm font-medium text-brand-primary dark:text-brand-accent border border-dashed border-brand-primary/40 hover:bg-brand-primary/5">
                + Add module
              </button>
            )}
          </div>
        </div>

        {selected && info && place(
          <ModuleInspector
            module={selected}
            info={info}
            headerTypes={settings.headers ?? []}
            headerTypeId={headerTypeId}
            accentColour={accent}
            backgrounds={backgrounds}
            imageCategory={imageCategory}
            onRegion={(key, patch) => onRegion(selected, key, patch)}
            onRepeat={(group, count) => edit(setRepeat(build, selected.instanceId, group, count))}
            onImage={(key, patch) => edit(setImage(build, selected.instanceId, key, patch), `image:${selected.instanceId}:${key}`)}
            onStyle={(key, patch) => edit(setStyle(build, selected.instanceId, key, patch), `style:${selected.instanceId}:${key}`)}
            onClearStyle={(key) => edit(clearStyle(build, selected.instanceId, key))}
            onButtonWidths={(row, widths) => edit(setButtonWidths(build, selected.instanceId, row, widths))}
            onHeaderType={(id) => setValue('assets.headerType', id, { shouldDirty: true })}
            greeting={{
              options: greetings.map((g) => ({ id: g.id, label: g.label, value: g.value })),
              selectedId: chosenGreeting?.id ?? '',
              onSelect: (id) => setValue('content.greetingId', id, { shouldDirty: true }),
            }}
            disclaimer={{
              options: disclaimers.map((d) => ({ id: d.id, label: d.label, region: d.region })),
              selectedId: disclaimerId === 'module' ? 'module' : (chosenDisclaimer?.id ?? 'module'),
              preview: chosenDisclaimer ? disclaimerToText(disclaimerSource(chosenDisclaimer)) : '',
              onSelect: (id) => {
                setValue('content.disclaimerId', id, { shouldDirty: true })
                const picked = disclaimers.find((d) => d.id === id)
                setValue('content.legalDisclaimer', picked?.text ?? '', { shouldDirty: true })
              },
            }}
            footer={{
              signoffIncluded: !selected.footer?.removeSignoff,
              onSignoff: (include) => edit(setFooter(build, selected.instanceId, { removeSignoff: include ? undefined : true })),
              social: selected.footer?.social ?? info.footer?.hasSocial ?? false,
              onSocial: (show) => edit(setFooter(build, selected.instanceId, { social: show })),
              signature: {
                options: signoffs.map((s) => ({ id: s.id, label: s.name })),
                selectedId: footerSignoffId === 'none' ? 'none' : footerSignoffId === 'module' ? 'module' : (chosenSignoff?.id ?? 'module'),
                preview: chosenSignoff ? signoffSummary(chosenSignoff) : '',
                onSelect: (id) => setValue('content.footerSignoffId', id, { shouldDirty: true }),
              },
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
})
