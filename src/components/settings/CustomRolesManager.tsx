import { useState } from 'react'
import type { BaseRole, CustomRole } from '../../types/settings.types'
import { addCustomRole, BASE_ROLE_LABEL, validateRoleName } from '../../lib/customRoles'

interface Props {
  roles: CustomRole[]
  /** How many team members hold each custom role, by role id */
  memberCounts: Record<string, number>
  onChange: (roles: CustomRole[]) => void
}

const COLOURS = ['#134848', '#fbaa96', '#cf6f13', '#591739', '#221b3b', '#009d80', '#d83949', '#74908d']
const FIELD = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30'
const LABEL = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1'

const opensLabel = (r: CustomRole) => (r.opensOn === 'board' ? 'the Campaign Board' : 'the brief form')

export function CustomRolesManager({ roles, memberCounts, onChange }: Props) {
  const [name, setName] = useState('')
  const [baseRole, setBaseRole] = useState<BaseRole>('requester')
  const [opensOn, setOpensOn] = useState<CustomRole['opensOn']>('form')
  const [colour, setColour] = useState(COLOURS[0])
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function add() {
    const problem = validateRoleName(name, roles)
    if (problem) { setError(problem); return }
    onChange(addCustomRole(roles, { name, baseRole, opensOn, colour }))
    setName('')
    setError(null)
  }

  return (
    <section aria-label="Custom roles" className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Custom roles</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Add a role to the three built in. It works like the role you choose for what people can see and change, and has its own name, colour and starting page.
        </p>
      </div>

      {roles.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No custom roles yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {roles.map((r) => {
            const count = memberCounts[r.id] ?? 0
            return (
              <li key={r.id} className="py-2 flex items-center gap-3">
                <span aria-hidden="true" className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.colour }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{r.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Works like {BASE_ROLE_LABEL[r.baseRole]} · Opens on {opensLabel(r)}</p>
                  {confirmId === r.id && (
                    <p className="text-xs text-red-600 mt-1">
                      {count > 0 ? `${count} ${count === 1 ? 'person' : 'people'} will keep working as ${BASE_ROLE_LABEL[r.baseRole]}. ` : ''}Delete this role?
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{count} {count === 1 ? 'person' : 'people'}</span>
                {confirmId === r.id ? (
                  <span className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => { onChange(roles.filter((x) => x.id !== r.id)); setConfirmId(null) }} className="text-xs text-red-600 hover:underline">Yes, delete</button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-xs text-gray-500 hover:underline">Keep</button>
                  </span>
                ) : (
                  <button type="button" aria-label={`Delete ${r.name}`} onClick={() => setConfirmId(r.id)} className="text-xs text-gray-400 hover:text-red-600 shrink-0">Delete</button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label htmlFor="role-name" className={LABEL}>Role name</label>
          <input id="role-name" value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder="e.g. Campaign reviewer" className={FIELD} />
        </div>
        <div>
          <label htmlFor="role-base" className={LABEL}>Works like</label>
          <select id="role-base" value={baseRole} onChange={(e) => setBaseRole(e.target.value as BaseRole)} className={FIELD}>
            {(Object.keys(BASE_ROLE_LABEL) as BaseRole[]).map((b) => <option key={b} value={b}>{BASE_ROLE_LABEL[b]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="role-opens" className={LABEL}>Opens on</label>
          <select id="role-opens" value={opensOn} onChange={(e) => setOpensOn(e.target.value as CustomRole['opensOn'])} className={FIELD}>
            <option value="form">Brief form</option>
            <option value="board">Campaign Board</option>
          </select>
        </div>
        <fieldset>
          <legend className={LABEL}>Colour</legend>
          <div className="flex flex-wrap gap-1.5">
            {COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={colour === c}
                onClick={() => setColour(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border border-black/10 ${colour === c ? 'ring-2 ring-offset-1 ring-brand-primary' : ''}`}
              />
            ))}
          </div>
        </fieldset>
      </div>

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <button type="button" onClick={add} className="bg-brand-primary text-white hover:bg-brand-primary-hover px-4 py-2 text-sm font-medium">Add role</button>
    </section>
  )
}
