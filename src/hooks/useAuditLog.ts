import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { writeAuditLog, type AuditLogParams } from '../lib/auditLog'

/**
 * Hook that provides a `log` function pre-bound to the current
 * user and team. Respects the audit.enabled toggle in settings.
 *
 * Usage:
 *   const { log } = useAuditLog()
 *   log({ action: 'Submitted brief', category: 'brief', entityId: briefId })
 */
export function useAuditLog() {
  const { user, profile } = useAuth()
  const { settings } = useSettings()

  const log = useCallback(
    (params: AuditLogParams) => {
      if (!user || !profile) return

      writeAuditLog(
        {
          teamId: profile.teamId,
          userId: user.id,
          userEmail: user.email ?? '',
          userName: profile.displayName,
        },
        settings.audit,
        params
      )
    },
    [user, profile, settings.audit]
  )

  return { log }
}
