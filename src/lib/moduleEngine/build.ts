import type { RegionValue } from './regions'

export type Slot = 'header' | 'body' | 'disclaimer' | 'footer'

export interface BuildModule {
  instanceId: string
  moduleName: string
  slot: Slot | null
  repeats: Record<string, number>
  regions: Record<string, RegionValue>
  images: Record<string, { src?: string }>
  boundFields: Record<string, string>
}

export interface EmailBuild {
  version: 1
  themeId: string
  headerTypeId?: string
  modules: BuildModule[]
}

export function newInstanceId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function newModule(moduleName: string, slot: Slot | null = null): BuildModule {
  return { instanceId: newInstanceId(), moduleName, slot, repeats: {}, regions: {}, images: {}, boundFields: {} }
}

// Free modules live between the header and the disclaimer/footer slots.
function freeRange(modules: BuildModule[]): [number, number] {
  const header = modules.findIndex((m) => m.slot === 'header')
  const tail = modules.findIndex((m) => m.slot === 'footer' || m.slot === 'disclaimer')
  return [header >= 0 ? header + 1 : 0, tail >= 0 ? tail : modules.length]
}

function clamp(modules: BuildModule[], at: number): number {
  const [lo, hi] = freeRange(modules)
  return Math.min(Math.max(at, lo), hi)
}

function insertAt(modules: BuildModule[], mod: BuildModule, at: number): BuildModule[] {
  const index = clamp(modules, at)
  return [...modules.slice(0, index), mod, ...modules.slice(index)]
}

export function addModule(b: EmailBuild, name: string, at: number): EmailBuild {
  return { ...b, modules: insertAt(b.modules, newModule(name), at) }
}

export function removeModule(b: EmailBuild, instanceId: string): EmailBuild {
  const m = b.modules.find((x) => x.instanceId === instanceId)
  if (!m || m.slot) return b
  return { ...b, modules: b.modules.filter((x) => x.instanceId !== instanceId) }
}

export function moveModule(b: EmailBuild, instanceId: string, to: number): EmailBuild {
  const m = b.modules.find((x) => x.instanceId === instanceId)
  if (!m || m.slot) return b
  const rest = b.modules.filter((x) => x.instanceId !== instanceId)
  return { ...b, modules: insertAt(rest, m, to) }
}

export function duplicateModule(b: EmailBuild, instanceId: string): EmailBuild {
  const i = b.modules.findIndex((x) => x.instanceId === instanceId)
  const m = b.modules[i]
  if (!m || m.slot) return b
  const copy: BuildModule = {
    ...m,
    instanceId: newInstanceId(),
    regions: { ...m.regions },
    repeats: { ...m.repeats },
    images: { ...m.images },
    boundFields: {},
  }
  return { ...b, modules: insertAt(b.modules, copy, i + 1) }
}

// Swaps the library module in place. Values carry over by region key; keys the
// new module lacks are reported at render time rather than lost silently.
export function swapModule(b: EmailBuild, instanceId: string, moduleName: string): EmailBuild {
  return {
    ...b,
    modules: b.modules.map((m) => {
      if (m.instanceId !== instanceId) return m
      // Values bound to the brief belong to the old module's keys; drop them.
      const regions = { ...m.regions }
      for (const key of Object.keys(m.boundFields)) delete regions[key]
      return { ...m, moduleName, regions, boundFields: {}, repeats: {}, images: {} }
    }),
  }
}

function update(b: EmailBuild, instanceId: string, fn: (m: BuildModule) => BuildModule): EmailBuild {
  return { ...b, modules: b.modules.map((m) => (m.instanceId === instanceId ? fn(m) : m)) }
}

// A direct edit breaks a live brief binding; the builder wins from then on.
// Pass `bind` to set a value on behalf of a brief field instead.
export function setRegion(
  b: EmailBuild, instanceId: string, key: string, patch: RegionValue, bind?: string,
): EmailBuild {
  return update(b, instanceId, (m) => {
    const boundFields = { ...m.boundFields }
    if (bind) boundFields[key] = bind
    else delete boundFields[key]
    return { ...m, regions: { ...m.regions, [key]: { ...m.regions[key], ...patch } }, boundFields }
  })
}

export function setRepeat(b: EmailBuild, instanceId: string, group: string, count: number): EmailBuild {
  return update(b, instanceId, (m) => ({ ...m, repeats: { ...m.repeats, [group]: Math.max(count, 1) } }))
}

export function setImage(b: EmailBuild, instanceId: string, key: string, patch: { src?: string }): EmailBuild {
  return update(b, instanceId, (m) => ({ ...m, images: { ...m.images, [key]: { ...m.images[key], ...patch } } }))
}

export function setTheme(b: EmailBuild, themeId: string): EmailBuild {
  return { ...b, themeId }
}
