import { newInstanceId, type EmailBuild } from './moduleEngine/build'

type Perms = Partial<Record<'admin' | 'producer' | 'requester', { canManageTemplates?: boolean }>>

/** True when nothing the user chose or typed would be lost by replacing the build. */
export function isBuildEmpty(build: EmailBuild | undefined): boolean {
  if (!build) return true
  return build.modules.every((m) =>
    m.slot !== null
    // Values bound to the brief come from the brief itself, not from the builder.
    && Object.keys(m.regions).every((k) => m.boundFields[k] !== undefined)
    && Object.keys(m.repeats).length === 0
    && Object.keys(m.images).length === 0,
  )
}

// A template is a layout ready for new copy: values that follow the brief
// (headline, sub-headline, body intro) are not part of it.
export function templateFromBuild(build: EmailBuild): EmailBuild {
  const copy = JSON.parse(JSON.stringify(build)) as EmailBuild
  for (const m of copy.modules) {
    for (const key of Object.keys(m.boundFields)) delete m.regions[key]
    m.boundFields = {}
  }
  return copy
}

export function instantiateTemplate(template: EmailBuild, themeId: string): EmailBuild {
  const copy = JSON.parse(JSON.stringify(template)) as EmailBuild
  copy.themeId = themeId
  for (const m of copy.modules) m.instanceId = newInstanceId()
  return copy
}

export function canSaveCampaignBuild(role: string | undefined, perms: Perms | undefined): boolean {
  if (role !== 'admin' && role !== 'producer') return false
  return perms?.[role]?.canManageTemplates !== false
}
