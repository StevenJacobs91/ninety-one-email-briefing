import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '../../contexts/AuthContext'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useSettings } from '../../contexts/SettingsContext'
import { CLIENT_GROUPS, CLIENT_GROUP_REGIONS } from '../../lib/constants'
import type { ClientGroup } from '../../lib/constants'
import type {
  RolePermissionKey,
  RolePermissionConfig,
  UserGroup,
} from '../../types/settings.types'
import { DEFAULT_ROLE_PERMISSIONS } from '../../lib/settingsDefaults'
import {
  fetchTeamMembers,
  updateMemberRole,
  updateMemberDisplayName,
  updateMemberPresets,
  removeMember,
  createTeamMember,
  type TeamMember,
  type UserRole,
} from '../../lib/supabaseQueries'

// ─── Constants ───────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  producer: 'Producer',
  requester: 'Requester',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full access — settings, users, board, briefs',
  producer: 'Settings, board management, all briefs',
  requester: 'Submit briefs and manage own drafts',
}

const ROLE_COLOURS: Record<UserRole, { bg: string; text: string; dot: string }> = {
  admin:     { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  producer:  { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500'   },
  requester: { bg: 'bg-gray-100 dark:bg-gray-800',       text: 'text-gray-600 dark:text-gray-400',   dot: 'bg-gray-400'   },
}

type UsersSubTab = 'members' | 'permissions' | 'teams'

// ─── Permission matrix definition ───────────────────────────

interface PermissionGroup {
  label: string
  keys: { key: RolePermissionKey; label: string; description: string }[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Briefs',
    keys: [
      { key: 'canSubmitBriefs',   label: 'Submit briefs',        description: 'Create and submit new email briefs' },
      { key: 'canViewAllBriefs',  label: 'View all briefs',      description: "View other team members' briefs" },
      { key: 'canEditAnyBrief',   label: 'Edit any brief',       description: 'Modify briefs created by others' },
      { key: 'canDeleteBriefs',   label: 'Delete briefs',        description: 'Permanently remove briefs' },
    ],
  },
  {
    label: 'Kanban Board',
    keys: [
      { key: 'canViewKanban',        label: 'View board',          description: 'Access the kanban production board' },
      { key: 'canMoveKanbanCards',   label: 'Move cards',          description: 'Drag cards between workflow columns' },
      { key: 'canDeleteKanbanCards', label: 'Delete cards',        description: 'Remove cards from the board' },
    ],
  },
  {
    label: 'Content & Exports',
    keys: [
      { key: 'canViewAnalytics',    label: 'View analytics',      description: 'Access Campaign Insights and reports' },
      { key: 'canManageAssets',     label: 'Manage assets',       description: 'Add, edit and remove library assets' },
      { key: 'canManageTemplates',  label: 'Manage templates',    description: 'Edit HTML templates and email modules' },
      { key: 'canExportData',       label: 'Export data',         description: 'Download briefs as JSON or CSV' },
    ],
  },
  {
    label: 'Administration',
    keys: [
      { key: 'canAccessSettings',        label: 'Access settings',        description: 'Open the Settings panel' },
      { key: 'canConfigureNotifications',label: 'Configure notifications',description: 'Set up Power Automate webhooks' },
      { key: 'canManageApprovals',       label: 'Manage approvals',       description: 'Configure and process approval workflows' },
      { key: 'canManageUsers',           label: 'Manage users & teams',   description: 'Invite users, change roles and create teams' },
    ],
  },
]

const TEAM_PALETTE = [
  '#134848', '#0a3323', '#591739', '#221b3b', '#74908d',
  '#d83949', '#009d80', '#cf6f13', '#fcaa28', '#fbaa96',
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#6b7280',
]

// ─── Shared sub-components ───────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const c = ROLE_COLOURS[role]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {ROLE_LABELS[role]}
    </span>
  )
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm'
    ? 'w-6 h-6 text-[10px]'
    : 'w-9 h-9 text-xs'
  return (
    <div className={`${cls} rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 flex items-center justify-center shrink-0`}>
      <span className="font-semibold text-brand-primary dark:text-brand-accent">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

// ─── MemberRow ───────────────────────────────────────────────

function MemberRow({
  member,
  isCurrentUser,
  isLastAdmin,
  allClientGroups,
  onRoleChange,
  onNameChange,
  onPresetChange,
  onRemove,
}: {
  member: TeamMember
  isCurrentUser: boolean
  isLastAdmin: boolean
  allClientGroups: string[]
  onRoleChange: (id: string, role: UserRole) => void
  onNameChange: (id: string, name: string) => void
  onPresetChange: (id: string, clientGroups: string[], regions: string[]) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(member.displayName)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [presetClientGroups, setPresetClientGroups] = useState<string[]>(member.presetClientGroups)
  const [presetRegions, setPresetRegions] = useState<string[]>(member.presetRegions)

  const availablePresetRegions = presetClientGroups.length === 0
    ? Object.values(CLIENT_GROUP_REGIONS).flat()
    : presetClientGroups.flatMap((g) => CLIENT_GROUP_REGIONS[g as ClientGroup] ?? [])

  function togglePresetClientGroup(group: string) {
    const isRemoving = presetClientGroups.includes(group)
    const next = isRemoving
      ? presetClientGroups.filter((g) => g !== group)
      : [...presetClientGroups, group]
    setPresetClientGroups(next)
    if (isRemoving) {
      const validRegions = new Set(next.flatMap((g) => CLIENT_GROUP_REGIONS[g as ClientGroup] ?? []))
      setPresetRegions((prev) => prev.filter((r) => validRegions.has(r)))
    }
  }

  function togglePresetRegion(region: string) {
    setPresetRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    )
  }

  function handleSavePresets() {
    onPresetChange(member.id, presetClientGroups, presetRegions)
    setShowPresets(false)
  }

  function handleCancelPresets() {
    setPresetClientGroups(member.presetClientGroups)
    setPresetRegions(member.presetRegions)
    setShowPresets(false)
  }

  const hasPresets = member.presetClientGroups.length > 0 || member.presetRegions.length > 0
  const canChangeRole = !isCurrentUser || !isLastAdmin
  const canRemove = !isCurrentUser

  function handleSaveName() {
    if (editName.trim() && editName !== member.displayName) {
      onNameChange(member.id, editName.trim())
    }
    setEditing(false)
  }

  return (
    <div className="rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      <div className="flex items-center gap-4 py-3 px-4">
        <Avatar name={member.displayName} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false) }}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-primary w-40"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-xs text-brand-primary hover:underline">Save</button>
                <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{member.displayName}</span>
                {isCurrentUser && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">(you)</span>
                )}
                <button
                  onClick={() => { setEditName(member.displayName); setEditing(true) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                  title="Edit name"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
            {hasPresets && (
              <span className="text-[10px] text-brand-primary dark:text-brand-accent bg-brand-primary/8 dark:bg-brand-primary/15 px-1.5 py-0.5 rounded font-medium shrink-0">
                {[...member.presetClientGroups, ...member.presetRegions].join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Role selector */}
        <div className="relative">
          <button
            onClick={() => canChangeRole && setRoleMenuOpen(!roleMenuOpen)}
            disabled={!canChangeRole}
            className={`${canChangeRole ? 'cursor-pointer hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600' : 'cursor-default opacity-75'}`}
          >
            <RoleBadge role={member.role} />
          </button>
          {roleMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setRoleMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1">
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => { onRoleChange(member.id, role); setRoleMenuOpen(false) }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${member.role === role ? 'bg-gray-50 dark:bg-gray-700/30' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <RoleBadge role={role} />
                      {member.role === role && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-brand-primary ml-auto">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 pl-5">{ROLE_DESCRIPTIONS[role]}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Preset button */}
        <button
          onClick={() => setShowPresets(!showPresets)}
          title="Set targeting preset"
          className={`opacity-0 group-hover:opacity-100 shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
            hasPresets
              ? 'opacity-100 text-brand-primary dark:text-brand-accent bg-brand-primary/8 dark:bg-brand-primary/15 hover:bg-brand-primary/15'
              : 'text-gray-400 hover:text-brand-primary hover:bg-brand-primary/8 dark:hover:bg-brand-primary/15'
          }`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
          Presets
        </button>

        {/* Joined date */}
        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 hidden sm:block w-20 text-right">
          {new Date(member.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>

        {/* Remove */}
        <div className="relative shrink-0">
          {canRemove ? (
            showRemoveConfirm ? (
              <div className="flex items-center gap-1">
                <button onClick={() => { onRemove(member.id); setShowRemoveConfirm(false) }} className="text-[10px] text-red-600 hover:text-red-700 font-medium">Confirm</button>
                <button onClick={() => setShowRemoveConfirm(false)} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                title="Remove member"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )
          ) : (
            <div className="w-7" />
          )}
        </div>
      </div>

      {/* Preset editor */}
      {showPresets && (
        <div className="mx-4 mb-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Targeting Preset — auto-fills Campaign tab on login
          </p>
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Client Group</p>
            <div className="flex flex-wrap gap-1.5">
              {allClientGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => togglePresetClientGroup(group)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    presetClientGroups.includes(group)
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
          {presetClientGroups.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Region</p>
              <div className="flex flex-wrap gap-1.5">
                {availablePresetRegions.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => togglePresetRegion(region)}
                    className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                      presetRegions.includes(region)
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={handleSavePresets} className="px-3 py-1.5 rounded bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 transition-colors">Save preset</button>
            <button type="button" onClick={handleCancelPresets} className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">Cancel</button>
            {hasPresets && (
              <button
                type="button"
                onClick={() => { setPresetClientGroups([]); setPresetRegions([]); onPresetChange(member.id, [], []); setShowPresets(false) }}
                className="ml-auto text-[10px] text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear preset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AddUserForm ─────────────────────────────────────────────

const INITIAL_FORM = { email: '', password: '', displayName: '', role: 'requester' as UserRole }

function AddUserForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.password) return
    setSaving(true)
    setError('')
    try {
      await createTeamMember(form.email.trim(), form.password, form.displayName.trim() || form.email.trim(), form.role)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">New Team Member</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email address <span className="text-red-500">*</span></label>
          <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@example.com"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Display name</label>
          <input type="text" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="e.g. Jane Smith (defaults to email)"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Password <span className="text-red-500">*</span></label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min. 6 characters"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 pr-9 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" tabIndex={-1}>
              {showPassword
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={saving || !form.email.trim() || !form.password}
          className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
          {saving
            ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Creating…</>
            : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Create user</>
          }
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── SubTabMembers ───────────────────────────────────────────

function SubTabMembers() {
  const { profile: currentProfile } = useAuth()
  const { log: audit } = useAuditLog()
  const { settings } = useSettings()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const teamId = currentProfile?.teamId
  const isAdmin = currentProfile?.role === 'admin'

  const allClientGroups = [
    ...CLIENT_GROUPS,
    ...(settings.customClientGroups ?? []).map((cg) => cg.name).filter((n) => !(CLIENT_GROUPS as readonly string[]).includes(n)),
  ]

  const loadMembers = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchTeamMembers(teamId)
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => { loadMembers() }, [loadMembers])

  const handleRoleChange = useCallback(async (userId: string, role: UserRole) => {
    const target = members.find((m) => m.id === userId)
    const oldRole = target?.role
    setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role } : m))
    try {
      await updateMemberRole(userId, role)
      audit({ action: `Changed role from ${oldRole} to ${role}`, category: 'user', entityType: 'profile', entityId: userId, details: { targetEmail: target?.email, oldRole, newRole: role } })
    } catch { loadMembers() }
  }, [loadMembers, members, audit])

  const handleNameChange = useCallback(async (userId: string, name: string) => {
    setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, displayName: name } : m))
    try { await updateMemberDisplayName(userId, name) } catch { loadMembers() }
  }, [loadMembers])

  const handlePresetChange = useCallback(async (userId: string, clientGroups: string[], regions: string[]) => {
    setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, presetClientGroups: clientGroups, presetRegions: regions } : m))
    try { await updateMemberPresets(userId, clientGroups, regions) } catch { loadMembers() }
  }, [loadMembers])

  const handleRemove = useCallback(async (userId: string) => {
    const target = members.find((m) => m.id === userId)
    setMembers((prev) => prev.filter((m) => m.id !== userId))
    try {
      await removeMember(userId)
      audit({ action: 'Removed team member', category: 'user', entityType: 'profile', entityId: userId, details: { targetEmail: target?.email, targetName: target?.displayName } })
    } catch { loadMembers() }
  }, [loadMembers, members, audit])

  const adminCount = members.filter((m) => m.role === 'admin').length

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 px-4 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            </div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        <button onClick={loadMembers} className="text-xs text-brand-primary hover:underline font-medium">Try again</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Team Members</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && !showAddForm && (
            <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 transition-colors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add user
            </button>
          )}
          <button onClick={loadMembers} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1" title="Refresh">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddUserForm onSuccess={() => { setShowAddForm(false); loadMembers() }} onCancel={() => setShowAddForm(false)} />
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isCurrentUser={member.id === currentProfile?.id}
            isLastAdmin={member.role === 'admin' && adminCount <= 1}
            allClientGroups={allClientGroups}
            onRoleChange={handleRoleChange}
            onNameChange={handleNameChange}
            onPresetChange={handlePresetChange}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {!showAddForm && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3 flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-[11px] text-amber-800 dark:text-amber-200">
            {isAdmin
              ? <>Use <strong>Add user</strong> above to create accounts directly, or users can sign up at the login page (assigned <strong>Requester</strong> by default).</>
              : <>New users sign up at the login page and are automatically assigned the <strong>Requester</strong> role. Admins can promote them here.</>
            }
          </p>
        </div>
      )}
    </div>
  )
}

// ─── SubTabPermissions ───────────────────────────────────────

function SubTabPermissions() {
  const { settings, updateSettings } = useSettings()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const perms: RolePermissionConfig = settings.rolePermissions ?? DEFAULT_ROLE_PERMISSIONS

  function toggle(role: 'producer' | 'requester', key: RolePermissionKey) {
    const updated: RolePermissionConfig = {
      ...perms,
      [role]: { ...perms[role], [key]: !perms[role][key] },
    }
    updateSettings({ rolePermissions: updated })
  }

  function resetToDefaults() {
    updateSettings({ rolePermissions: DEFAULT_ROLE_PERMISSIONS })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Roles &amp; Permissions</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure what each role can do. Admin permissions are always full access and cannot be changed.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={resetToDefaults}
            className="shrink-0 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Reset to defaults
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-1/2">Permission</th>
              {(['admin', 'producer', 'requester'] as const).map((role) => (
                <th key={role} className="pb-2 text-center w-[80px]">
                  <RoleBadge role={role} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <>
                <tr key={group.label} className="border-b border-gray-100 dark:border-gray-800/50">
                  <td colSpan={4} className="pt-4 pb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      {group.label}
                    </span>
                  </td>
                </tr>
                {group.keys.map(({ key, label, description }) => (
                  <tr key={key} className="border-b border-gray-50 dark:border-gray-800/30 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{label}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{description}</div>
                    </td>
                    {/* Admin — always checked, locked */}
                    <td className="py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 rounded accent-purple-600 opacity-60 cursor-not-allowed"
                        readOnly
                      />
                    </td>
                    {/* Producer */}
                    <td className="py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={perms.producer[key]}
                        onChange={() => isAdmin && toggle('producer', key)}
                        disabled={!isAdmin}
                        className={`w-4 h-4 rounded accent-brand-primary ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      />
                    </td>
                    {/* Requester */}
                    <td className="py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={perms.requester[key]}
                        onChange={() => isAdmin && toggle('requester', key)}
                        disabled={!isAdmin}
                        className={`w-4 h-4 rounded accent-brand-primary ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                      />
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        Changes are saved automatically. These permissions control UI access — database-level security (RLS) is always enforced regardless of these settings.
      </p>
    </div>
  )
}

// ─── SubTabTeams ─────────────────────────────────────────────

interface TeamFormState {
  name: string
  description: string
  colour: string
  memberIds: string[]
}

function TeamCard({
  group,
  members,
  isAdmin,
  onEdit,
  onDelete,
}: {
  group: UserGroup
  members: TeamMember[]
  isAdmin: boolean
  onEdit: (g: UserGroup) => void
  onDelete: (id: string) => void
}) {
  const [showDelete, setShowDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const teamMembers = members.filter((m) => group.memberIds.includes(m.id))

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Colour swatch */}
        <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: group.colour }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{group.name}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
              {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
            </span>
          </div>
          {group.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{group.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Expand/collapse member list */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={expanded ? 'Collapse' : 'Show members'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => onEdit(group)}
                className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-brand-primary hover:bg-brand-primary/8 transition-colors"
                title="Edit team"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              {showDelete ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => onDelete(group.id)} className="text-[10px] text-red-600 hover:text-red-700 font-medium px-1">Confirm</button>
                  <button onClick={() => setShowDelete(false)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDelete(true)}
                  className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete team"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Member list (expanded) */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
          {teamMembers.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No members assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-full px-2.5 py-1">
                  <Avatar name={m.displayName} size="sm" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{m.displayName}</span>
                  <RoleBadge role={m.role} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TeamFormPanel({
  initial,
  allMembers,
  onSave,
  onCancel,
}: {
  initial?: UserGroup
  allMembers: TeamMember[]
  onSave: (data: TeamFormState) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<TeamFormState>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    colour: initial?.colour ?? TEAM_PALETTE[0],
    memberIds: initial?.memberIds ?? [],
  })

  function toggleMember(id: string) {
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(id)
        ? prev.memberIds.filter((m) => m !== id)
        : [...prev.memberIds, id],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        {initial ? 'Edit Team' : 'New Team'}
      </p>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Team name <span className="text-red-500">*</span></label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Fund Products, Marketing"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Optional — brief description of this team's remit"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
        />
      </div>

      {/* Colour */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Colour</label>
        <div className="flex flex-wrap gap-2">
          {TEAM_PALETTE.map((colour) => (
            <button
              key={colour}
              type="button"
              onClick={() => setForm((p) => ({ ...p, colour }))}
              className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.colour === colour ? 'ring-2 ring-offset-2 ring-gray-500 dark:ring-offset-gray-800 scale-110' : ''}`}
              style={{ backgroundColor: colour }}
              title={colour}
            />
          ))}
        </div>
      </div>

      {/* Members */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Members <span className="text-gray-400 font-normal">({form.memberIds.length} selected)</span>
        </label>
        <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gray-200 dark:border-gray-600 p-2 bg-white dark:bg-gray-800">
          {allMembers.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 italic">No members found</p>
          ) : (
            allMembers.map((m) => (
              <label key={m.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.memberIds.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="w-4 h-4 rounded accent-brand-primary"
                />
                <Avatar name={m.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{m.displayName}</span>
                  <span className="text-[10px] text-gray-400 ml-1">{m.email}</span>
                </div>
                <RoleBadge role={m.role} />
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={!form.name.trim()}
          className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {initial ? 'Save changes' : 'Create team'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

function SubTabTeams() {
  const { settings, updateSettings } = useSettings()
  const { profile: currentProfile } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null)

  const isAdmin = currentProfile?.role === 'admin'
  const groups: UserGroup[] = settings.userGroups ?? []

  useEffect(() => {
    if (!currentProfile?.teamId) { setLoadingMembers(false); return }
    fetchTeamMembers(currentProfile.teamId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoadingMembers(false))
  }, [currentProfile?.teamId])

  function handleCreate(data: TeamFormState) {
    const newGroup: UserGroup = {
      id: uuidv4(),
      name: data.name.trim(),
      description: data.description.trim(),
      colour: data.colour,
      memberIds: data.memberIds,
      createdAt: new Date().toISOString(),
    }
    updateSettings({ userGroups: [newGroup, ...groups] })
    setShowForm(false)
  }

  function handleEdit(data: TeamFormState) {
    if (!editingGroup) return
    const updated = groups.map((g) =>
      g.id === editingGroup.id
        ? { ...g, name: data.name.trim(), description: data.description.trim(), colour: data.colour, memberIds: data.memberIds }
        : g
    )
    updateSettings({ userGroups: updated })
    setEditingGroup(null)
  }

  function handleDelete(id: string) {
    updateSettings({ userGroups: groups.filter((g) => g.id !== id) })
  }

  function startEdit(group: UserGroup) {
    setShowForm(false)
    setEditingGroup(group)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Teams</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Organise members into teams for filtering and reporting.
          </p>
        </div>
        {isAdmin && !showForm && !editingGroup && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New team
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && !loadingMembers && (
        <TeamFormPanel
          allMembers={members}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit form */}
      {editingGroup && !loadingMembers && (
        <TeamFormPanel
          initial={editingGroup}
          allMembers={members}
          onSave={handleEdit}
          onCancel={() => setEditingGroup(null)}
        />
      )}

      {/* Team list */}
      {loadingMembers ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-300 dark:text-gray-600 mb-3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No teams yet</p>
          {isAdmin && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Create a team to group members for filtering and reporting.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <TeamCard
              key={group.id}
              group={group}
              members={members}
              isAdmin={isAdmin}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        Teams are stored in your team settings and synced across all users. They do not affect authentication or database permissions.
      </p>
    </div>
  )
}

// ─── TabUsers (main) ─────────────────────────────────────────

export function TabUsers() {
  const [subTab, setSubTab] = useState<UsersSubTab>('members')

  const SUB_TABS: { id: UsersSubTab; label: string }[] = [
    { id: 'members',     label: 'Members' },
    { id: 'permissions', label: 'Roles & Permissions' },
    { id: 'teams',       label: 'Teams' },
  ]

  return (
    <div className="space-y-5">
      {/* Sub-tab nav */}
      <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              subTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'members'     && <SubTabMembers />}
      {subTab === 'permissions' && <SubTabPermissions />}
      {subTab === 'teams'       && <SubTabTeams />}
    </div>
  )
}
