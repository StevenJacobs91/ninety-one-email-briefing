import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAuditLog } from '../../hooks/useAuditLog'
import {
  fetchTeamMembers,
  updateMemberRole,
  updateMemberDisplayName,
  removeMember,
  type TeamMember,
  type UserRole,
} from '../../lib/supabaseQueries'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  producer: 'Producer',
  requester: 'Requester',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full access: settings, users, board, briefs',
  producer: 'Settings, board management, all briefs',
  requester: 'Submit briefs and manage own drafts',
}

const ROLE_COLOURS: Record<UserRole, { bg: string; text: string; dot: string }> = {
  admin: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  producer: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  requester: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
}

function RoleBadge({ role }: { role: UserRole }) {
  const c = ROLE_COLOURS[role]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {ROLE_LABELS[role]}
    </span>
  )
}

function MemberRow({
  member,
  isCurrentUser,
  isLastAdmin,
  onRoleChange,
  onNameChange,
  onRemove,
}: {
  member: TeamMember
  isCurrentUser: boolean
  isLastAdmin: boolean
  onRoleChange: (id: string, role: UserRole) => void
  onNameChange: (id: string, name: string) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(member.displayName)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

  const canChangeRole = !isCurrentUser || !isLastAdmin
  const canRemove = !isCurrentUser

  function handleSaveName() {
    if (editName.trim() && editName !== member.displayName) {
      onNameChange(member.id, editName.trim())
    }
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-brand-primary dark:text-brand-accent">
          {member.displayName.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false); }}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand-primary w-40"
                autoFocus
              />
              <button onClick={handleSaveName} className="text-xs text-brand-primary hover:underline">Save</button>
              <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {member.displayName}
              </span>
              {isCurrentUser && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">(you)</span>
              )}
              <button
                onClick={() => { setEditName(member.displayName); setEditing(true); }}
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
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
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
                  onClick={() => {
                    onRoleChange(member.id, role)
                    setRoleMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    member.role === role ? 'bg-gray-50 dark:bg-gray-700/30' : ''
                  }`}
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

      {/* Joined date */}
      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 hidden sm:block w-20 text-right">
        {new Date(member.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>

      {/* Remove button */}
      <div className="relative shrink-0">
        {canRemove ? (
          showRemoveConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onRemove(member.id); setShowRemoveConfirm(false); }}
                className="text-[10px] text-red-600 hover:text-red-700 font-medium"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="text-[10px] text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
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
  )
}

export function TabUsers() {
  const { profile: currentProfile } = useAuth()
  const { log: audit } = useAuditLog()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const teamId = currentProfile?.teamId

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

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleRoleChange = useCallback(async (userId: string, role: UserRole) => {
    const target = members.find((m) => m.id === userId)
    const oldRole = target?.role
    // Optimistic update
    setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role } : m))
    try {
      await updateMemberRole(userId, role)
      audit({
        action: `Changed role from ${oldRole} to ${role}`,
        category: 'user',
        entityType: 'profile',
        entityId: userId,
        details: { targetEmail: target?.email, oldRole, newRole: role },
      })
    } catch (err) {
      loadMembers()
      console.error('Failed to update role:', err)
    }
  }, [loadMembers, members, audit])

  const handleNameChange = useCallback(async (userId: string, name: string) => {
    setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, displayName: name } : m))
    try {
      await updateMemberDisplayName(userId, name)
    } catch (err) {
      loadMembers()
      console.error('Failed to update name:', err)
    }
  }, [loadMembers])

  const handleRemove = useCallback(async (userId: string) => {
    const target = members.find((m) => m.id === userId)
    setMembers((prev) => prev.filter((m) => m.id !== userId))
    try {
      await removeMember(userId)
      audit({
        action: `Removed team member`,
        category: 'user',
        entityType: 'profile',
        entityId: userId,
        details: { targetEmail: target?.email, targetName: target?.displayName },
      })
    } catch (err) {
      loadMembers()
      console.error('Failed to remove member:', err)
    }
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
        <button
          onClick={loadMembers}
          className="text-xs text-brand-primary hover:underline font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Team Members
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''} on this team
          </p>
        </div>
        <button
          onClick={loadMembers}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
          title="Refresh"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Role legend */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Roles</p>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <div key={role} className="flex items-start gap-2">
              <RoleBadge role={role} />
              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                {ROLE_DESCRIPTIONS[role]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Member list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isCurrentUser={member.id === currentProfile?.id}
            isLastAdmin={member.role === 'admin' && adminCount <= 1}
            onRoleChange={handleRoleChange}
            onNameChange={handleNameChange}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* Info note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3 flex items-start gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p className="text-[11px] text-amber-800 dark:text-amber-200">
          New users sign up at the login page and are automatically assigned the <strong>Requester</strong> role.
          Promote them here to <strong>Producer</strong> or <strong>Admin</strong> as needed.
        </p>
      </div>
    </div>
  )
}
