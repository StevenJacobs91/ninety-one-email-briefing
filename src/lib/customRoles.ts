import type { BaseRole, CustomRole } from '../types/settings.types'

export const BASE_ROLE_LABEL: Record<BaseRole, string> = { admin: 'Admin', producer: 'Producer', requester: 'Requester' }

/** Producers need to see what has been briefed in, so they open on the board; so does any custom role set to. */
export function opensOnBoard(role: BaseRole, custom?: CustomRole): boolean {
  if (custom) return custom.opensOn === 'board'
  return role === 'producer'
}

/** The custom role a person holds, or undefined if they have none or it has since been deleted. */
export function resolveCustomRole(id: string | null | undefined, roles: readonly CustomRole[] | undefined): CustomRole | undefined {
  if (!id) return undefined
  return roles?.find((r) => r.id === id)
}

const slug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export function validateRoleName(name: string, existing: readonly CustomRole[]): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Give the role a name.'
  const builtIn = (Object.keys(BASE_ROLE_LABEL) as BaseRole[]).find((r) => r === trimmed.toLowerCase())
  if (builtIn) return `There is already a role called ${BASE_ROLE_LABEL[builtIn]}.`
  const clash = existing.find((r) => r.name.trim().toLowerCase() === trimmed.toLowerCase())
  if (clash) return `There is already a role called ${clash.name}.`
  return null
}

export function addCustomRole(
  existing: readonly CustomRole[],
  role: Omit<CustomRole, 'id'>,
  opts: { allowDuplicateName?: boolean } = {},
): CustomRole[] {
  if (!opts.allowDuplicateName) {
    const problem = validateRoleName(role.name, existing)
    if (problem) throw new Error(problem)
  }
  const base = slug(role.name) || 'role'
  let id = base
  for (let n = 2; existing.some((r) => r.id === id); n++) id = `${base}-${n}`
  return [...existing, { ...role, name: role.name.trim(), id }]
}
