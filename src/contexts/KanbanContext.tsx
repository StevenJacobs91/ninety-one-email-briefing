import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { KanbanCard, KanbanColumn } from '../types/kanban.types'
import type { BriefFormData } from '../lib/schema'
import { useAuth } from './AuthContext'
import { useSettings } from './SettingsContext'
import { writeAuditLog } from '../lib/auditLog'
import {
  fetchKanbanCards,
  insertKanbanCard,
  updateKanbanCard,
  deleteKanbanCard,
} from '../lib/supabaseQueries'

interface KanbanContextValue {
  cards: KanbanCard[]
  loading: boolean
  addCard: (brief: BriefFormData) => void
  moveCard: (id: string, column: KanbanColumn) => void
  updateCardNotes: (id: string, notes: string) => void
  removeCard: (id: string) => void
  getColumnCards: (column: KanbanColumn) => KanbanCard[]
}

const KanbanContext = createContext<KanbanContextValue | null>(null)

export function KanbanProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth()
  const { settings } = useSettings()
  const teamId = profile?.teamId
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [loading, setLoading] = useState(true)

  const auditCtx = teamId && user && profile ? {
    teamId,
    userId: user.id,
    userEmail: user.email ?? '',
    userName: profile.displayName,
  } : null

  // Fetch cards from Supabase on mount / team change
  useEffect(() => {
    if (!teamId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchKanbanCards(teamId).then((remote) => {
      if (!cancelled) {
        setCards(remote)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [teamId])

  const addCard = useCallback((brief: BriefFormData) => {
    if (!teamId) return
    const briefId = brief.meta?.briefId ?? uuidv4()

    setCards((prev) => {
      if (prev.some((c) => c.briefId === briefId)) return prev
      const now = new Date().toISOString()
      const newCard: KanbanCard = {
        id: uuidv4(),
        briefId,
        emailName: brief.campaign.campaignName,
        emailType: brief.campaign.emailType,
        theme: brief.campaign.theme,
        subjectLine: brief.campaign.subjectLine,
        region: brief.audience.region ?? [],
        channel: brief.audience.channel ?? [],
        clientGroup: brief.audience.clientGroup ?? [],
        sendDate: brief.deadlines.sendDate,
        contentApprovalDate: brief.deadlines.contentApprovalDate,
        urgency: brief.deadlines.urgency,
        column: 'briefed',
        submittedAt: now,
        columnHistory: [{ column: 'briefed', at: now }],
        notes: '',
        tags: brief.deadlines.tags ?? '',
      }

      // Optimistic update
      insertKanbanCard(teamId, newCard).catch((err) =>
        console.error('Failed to insert kanban card:', err)
      )

      return [newCard, ...prev]
    })
  }, [teamId])

  const moveCard = useCallback((id: string, column: KanbanColumn) => {
    const now = new Date().toISOString()
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const fromCol = c.column
        const updated = { ...c, column, columnHistory: [...c.columnHistory, { column, at: now }] }

        // Async persist
        updateKanbanCard(id, { column: updated.column, columnHistory: updated.columnHistory }).catch(
          (err) => console.error('Failed to move kanban card:', err)
        )

        // Audit
        if (auditCtx) {
          writeAuditLog(auditCtx, settings.audit, {
            action: `Moved card from ${fromCol} to ${column}`,
            category: 'kanban',
            entityType: 'kanban_card',
            entityId: id,
            details: { emailName: c.emailName, from: fromCol, to: column },
          })
        }

        return updated
      })
    )
  }, [auditCtx, settings.audit])

  const updateCardNotes = useCallback((id: string, notes: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)))
    updateKanbanCard(id, { notes }).catch((err) =>
      console.error('Failed to update kanban notes:', err)
    )
  }, [])

  const removeCard = useCallback((id: string) => {
    const card = cards.find((c) => c.id === id)
    setCards((prev) => prev.filter((c) => c.id !== id))
    deleteKanbanCard(id).catch((err) =>
      console.error('Failed to delete kanban card:', err)
    )
    if (auditCtx && card) {
      writeAuditLog(auditCtx, settings.audit, {
        action: 'Removed card from board',
        category: 'kanban',
        entityType: 'kanban_card',
        entityId: id,
        details: { emailName: card.emailName },
      })
    }
  }, [cards, auditCtx, settings.audit])

  const getColumnCards = useCallback(
    (column: KanbanColumn) => cards.filter((c) => c.column === column),
    [cards]
  )

  return (
    <KanbanContext.Provider value={{ cards, loading, addCard, moveCard, updateCardNotes, removeCard, getColumnCards }}>
      {children}
    </KanbanContext.Provider>
  )
}

export function useKanban(): KanbanContextValue {
  const ctx = useContext(KanbanContext)
  if (!ctx) throw new Error('useKanban must be used inside KanbanProvider')
  return ctx
}
