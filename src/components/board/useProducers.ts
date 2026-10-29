import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchTeamMembers } from '../../lib/supabaseQueries'
import { producersFrom } from '../../lib/cardEdits'

/**
 * The names an assignee can be picked from: the team's producers and admins. Fetched only when `enabled`, so a screen
 * that cannot assign anyone never asks.
 */
export function useProducers(enabled: boolean): string[] {
  const { profile } = useAuth()
  const teamId = profile?.teamId
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    if (!enabled || !teamId) return
    let cancelled = false
    fetchTeamMembers(teamId)
      .then((members) => { if (!cancelled) setNames(producersFrom(members)) })
      .catch(() => { /* the list stays empty; the current assignee is still shown */ })
    return () => { cancelled = true }
  }, [enabled, teamId])

  return names
}
