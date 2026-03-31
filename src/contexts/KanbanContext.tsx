import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { KanbanCard, KanbanColumn } from '../types/kanban.types'
import type { BriefFormData } from '../lib/schema'

const STORAGE_KEY = 'ni-kanban-cards'

interface KanbanContextValue {
  cards: KanbanCard[]
  addCard: (brief: BriefFormData) => void
  moveCard: (id: string, column: KanbanColumn) => void
  updateCardNotes: (id: string, notes: string) => void
  removeCard: (id: string) => void
  getColumnCards: (column: KanbanColumn) => KanbanCard[]
}

const KanbanContext = createContext<KanbanContextValue | null>(null)

function loadCards(): KanbanCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as KanbanCard[]
  } catch {
    return []
  }
}

function saveCards(cards: KanbanCard[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  } catch {
    // Storage may be unavailable
  }
}

export function KanbanProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<KanbanCard[]>(loadCards)

  useEffect(() => {
    saveCards(cards)
  }, [cards])

  const addCard = useCallback((brief: BriefFormData) => {
    const briefId = brief.meta?.briefId ?? uuidv4()
    setCards((prev) => {
      // Avoid duplicates
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
      return [newCard, ...prev]
    })
  }, [])

  const moveCard = useCallback((id: string, column: KanbanColumn) => {
    const now = new Date().toISOString()
    setCards((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, column, columnHistory: [...c.columnHistory, { column, at: now }] }
          : c
      )
    )
  }, [])

  const updateCardNotes = useCallback((id: string, notes: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)))
  }, [])

  const removeCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const getColumnCards = useCallback(
    (column: KanbanColumn) => cards.filter((c) => c.column === column),
    [cards]
  )

  return (
    <KanbanContext.Provider value={{ cards, addCard, moveCard, updateCardNotes, removeCard, getColumnCards }}>
      {children}
    </KanbanContext.Provider>
  )
}

export function useKanban(): KanbanContextValue {
  const ctx = useContext(KanbanContext)
  if (!ctx) throw new Error('useKanban must be used inside KanbanProvider')
  return ctx
}
