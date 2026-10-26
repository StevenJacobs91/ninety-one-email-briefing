import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { KanbanCard, KanbanColumn, CampaignComment, ManualCardInput } from '../types/kanban.types'
import type { BriefFormData } from '../lib/schema'
import { useAuth } from './AuthContext'
import { useSettings } from './SettingsContext'
import { writeAuditLog } from '../lib/auditLog'
import { triggerNotification } from '../lib/notificationService'
import { distributeWithOverride } from '../lib/approvalsService'
import { parseDistributionBlock, type DistributionBlockCode } from '../lib/approvalRouting'
import { overrideNotification } from '../lib/approvalNotifications'
import { DistributionBlockedDialog } from '../components/board/DistributionBlockedDialog'
import {
  fetchKanbanCards,
  insertKanbanCard,
  updateKanbanCard,
  deleteKanbanCard,
} from '../lib/supabaseQueries'

interface KanbanContextValue {
  cards: KanbanCard[]
  loading: boolean
  addCard: (brief: BriefFormData, extras?: { notes?: string; submittedBy?: { name: string; email: string }; attachments?: KanbanCard['attachments'] }) => void
  addManualCard: (data: ManualCardInput) => void
  moveCard: (id: string, column: KanbanColumn) => void
  updateCardNotes: (id: string, notes: string) => void
  updateCardMeta: (id: string, updates: { assignee?: string; startDate?: string; progress?: number }) => void
  addComment: (cardId: string, comment: Omit<CampaignComment, 'id'>) => void
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
  // Always the latest cards, so a move reads the card as it is now rather than as it was when the callback was made
  const cardsRef = useRef<KanbanCard[]>([])
  cardsRef.current = cards
  // A move to Distributed the database refused, waiting for the person to read why (and for an admin to override)
  const [blocked, setBlocked] = useState<{ cardId: string; code: DistributionBlockCode } | null>(null)

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

  const addCard = useCallback((brief: BriefFormData, extras?: { notes?: string; submittedBy?: { name: string; email: string }; attachments?: KanbanCard['attachments'] }) => {
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
        notes: extras?.notes ?? '',
        tags: brief.deadlines.tags ?? '',
        attachments: extras?.attachments ?? [],
        submittedByName: extras?.submittedBy?.name || undefined,
        submittedByEmail: extras?.submittedBy?.email || undefined,
      }

      // Optimistic update
      insertKanbanCard(teamId, newCard).catch((err) =>
        console.error('Failed to insert kanban card:', err)
      )

      return [newCard, ...prev]
    })
  }, [teamId])

  /** The audit entry and the "moved" notification, once a move has gone through. */
  const announceMove = useCallback((card: KanbanCard, column: KanbanColumn) => {
    if (auditCtx) {
      writeAuditLog(auditCtx, settings.audit, {
        action: `Moved card from ${card.column} to ${column}`,
        category: 'kanban',
        entityType: 'kanban_card',
        entityId: card.id,
        details: { emailName: card.emailName, from: card.column, to: column },
      })
    }
    if (settings.notifications) {
      triggerNotification('kanban_moved', {
        emailName: card.emailName,
        briefId: card.briefId,
        fromColumn: card.column,
        toColumn: column,
        movedBy: profile?.displayName ?? '',
        sendDate: card.sendDate ?? '',
        urgency: card.urgency,
      }, settings.notifications).catch(console.error)
    }
  }, [auditCtx, settings.audit, settings.notifications, profile])

  const moveCard = useCallback((id: string, column: KanbanColumn) => {
    const card = cardsRef.current.find((c) => c.id === id)
    if (!card) return
    const updated: KanbanCard = { ...card, column, columnHistory: [...card.columnHistory, { column, at: new Date().toISOString() }] }

    // Shown straight away, then put back if the database refuses (a card needing approval cannot be distributed without it).
    setCards((prev) => prev.map((c) => (c.id === id ? updated : c)))

    updateKanbanCard(id, { column: updated.column, columnHistory: updated.columnHistory })
      .then(() => { if (column === 'distributed') announceMove(card, column) })
      .catch((err: unknown) => {
        const code = parseDistributionBlock(err instanceof Error ? err.message : String(err))
        if (code) {
          setCards((prev) => prev.map((c) => (c.id === id ? card : c)))
          setBlocked({ cardId: id, code })
          return
        }
        console.error('Failed to move kanban card:', err)
      })

    if (column !== 'distributed') announceMove(card, column)
  }, [announceMove])

  /** An admin distributes a blocked card anyway. The database records the reason; the card and the team are updated here. */
  const overrideBlocked = useCallback(async (reason: string) => {
    if (!blocked) return
    const card = cardsRef.current.find((c) => c.id === blocked.cardId)
    if (!card) { setBlocked(null); return }

    await distributeWithOverride({ cardId: card.id, reason })

    const at = new Date().toISOString()
    setCards((prev) => prev.map((c) => (c.id === card.id
      ? { ...c, column: 'distributed', columnHistory: [...c.columnHistory, { column: 'distributed', at, override: true }] }
      : c)))
    announceMove(card, 'distributed')
    if (auditCtx) {
      writeAuditLog(auditCtx, settings.audit, {
        action: 'Distributed without the required approval',
        category: 'kanban',
        entityType: 'kanban_card',
        entityId: card.id,
        details: { emailName: card.emailName, reason, blockedFor: blocked.code },
      })
    }
    if (settings.notifications) {
      const { eventType, data } = overrideNotification({
        emailName: card.emailName,
        briefId: card.briefId,
        overriddenBy: profile?.displayName ?? '',
        reason,
        requester: card.submittedByEmail ? { name: card.submittedByName ?? '', email: card.submittedByEmail } : undefined,
      })
      triggerNotification(eventType, data, settings.notifications).catch(console.error)
    }
    setBlocked(null)
  }, [blocked, announceMove, auditCtx, settings.audit, settings.notifications, profile])

  const addManualCard = useCallback((data: ManualCardInput) => {
    if (!teamId) return
    const now = new Date().toISOString()
    const newCard: KanbanCard = {
      id: uuidv4(),
      briefId: uuidv4(),
      emailName: data.emailName,
      emailType: data.emailType,
      theme: data.theme,
      subjectLine: data.subjectLine ?? '',
      region: data.region ?? [],
      channel: data.channel ?? [],
      clientGroup: data.clientGroup ?? [],
      sendDate: data.sendDate ?? '',
      contentApprovalDate: data.contentApprovalDate ?? '',
      urgency: data.urgency,
      column: data.column,
      submittedAt: now,
      columnHistory: [{ column: data.column, at: now }],
      notes: data.notes ?? '',
      tags: data.tags ?? '',
      assignee: data.assignee,
      startDate: data.startDate,
      comments: [],
      progress: 0,
      submittedByName: profile?.displayName || undefined,
      submittedByEmail: user?.email || undefined,
    }
    setCards((prev) => [newCard, ...prev])
    insertKanbanCard(teamId, newCard).catch((err) =>
      console.error('Failed to insert manual kanban card:', err)
    )
  }, [teamId])

  const updateCardNotes = useCallback((id: string, notes: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)))
    updateKanbanCard(id, { notes }).catch((err) =>
      console.error('Failed to update kanban notes:', err)
    )
  }, [])

  const updateCardMeta = useCallback((id: string, updates: { assignee?: string; startDate?: string; progress?: number }) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
    updateKanbanCard(id, updates).catch((err) =>
      console.error('Failed to update kanban card meta:', err)
    )
  }, [])

  const addComment = useCallback((cardId: string, comment: Omit<CampaignComment, 'id'>) => {
    const newComment: CampaignComment = { ...comment, id: uuidv4() }
    setCards((prev) => prev.map((c) => {
      if (c.id !== cardId) return c
      const updated = { ...c, comments: [...(c.comments ?? []), newComment] }
      updateKanbanCard(cardId, { comments: updated.comments }).catch((err) =>
        console.error('Failed to persist comment:', err)
      )
      return updated
    }))
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
    if (settings.notifications && card) {
      triggerNotification('kanban_card_removed', {
        emailName: card.emailName,
        briefId: card.briefId,
        removedBy: profile?.displayName ?? '',
        sendDate: card.sendDate ?? '',
        urgency: card.urgency,
      }, settings.notifications).catch(console.error)
    }
  }, [cards, auditCtx, settings.audit, settings.notifications, profile])

  const getColumnCards = useCallback(
    (column: KanbanColumn) => cards.filter((c) => c.column === column),
    [cards]
  )

  return (
    <KanbanContext.Provider value={{ cards, loading, addCard, addManualCard, moveCard, updateCardNotes, updateCardMeta, addComment, removeCard, getColumnCards }}>
      {children}
      {blocked && (() => {
        const card = cards.find((c) => c.id === blocked.cardId)
        return card ? (
          <DistributionBlockedDialog
            emailName={card.emailName}
            code={blocked.code}
            canOverride={profile?.role === 'admin'}
            onClose={() => setBlocked(null)}
            onOverride={overrideBlocked}
          />
        ) : null
      })()}
    </KanbanContext.Provider>
  )
}

export function useKanban(): KanbanContextValue {
  const ctx = useContext(KanbanContext)
  if (!ctx) throw new Error('useKanban must be used inside KanbanProvider')
  return ctx
}
