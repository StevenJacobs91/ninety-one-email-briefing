import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BriefPayload } from '../../types/brief.types'

// A small stand-in for the briefs table: select/eq/in/update/insert behave as the real client does for these calls.
type Row = { id: string; team_id: string; brief_id: string; data: unknown; status?: string; campaign_name?: string }
const db = vi.hoisted(() => ({ rows: [] as Row[], failOn: '' as '' | 'select' | 'update' | 'insert', inserted: [] as Row[], updatedIds: [] as string[][] }))

vi.mock('../supabase', () => ({
  supabase: {
    from: (_table: string) => {
      const filters: [string, unknown][] = []
      let inIds: string[] | null = null
      let patch: Record<string, unknown> | null = null
      let op: 'select' | 'update' = 'select'
      const run = async () => {
        if (op === 'select') {
          if (db.failOn === 'select') return { data: null, error: { message: 'select failed' } }
          return { data: db.rows.filter((r) => filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v)).map((r) => ({ id: r.id })), error: null }
        }
        if (db.failOn === 'update') return { error: { message: 'update failed' } }
        const targets = db.rows.filter((r) => (inIds ? inIds.includes(r.id) : filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v)))
        db.updatedIds.push(targets.map((r) => r.id))
        for (const r of targets) Object.assign(r, patch)
        return { error: null }
      }
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q },
        in: (_k: string, ids: string[]) => { inIds = ids; return q },
        update: (p: Record<string, unknown>) => { op = 'update'; patch = p; return q },
        insert: async (row: Omit<Row, 'id'>) => {
          if (db.failOn === 'insert') return { error: { message: 'insert failed' } }
          const r = { id: `new-${db.inserted.length}`, ...row }
          db.inserted.push(r); db.rows.push(r)
          return { error: null }
        },
        // Like the real client: maybeSingle() is an error when more than one row matches.
        maybeSingle: async () => {
          const { data, error } = (await run()) as { data: { id: string }[] | null; error: { message: string } | null }
          if (error) return { data: null, error }
          if ((data ?? []).length > 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }
          return { data: (data ?? [])[0] ?? null, error: null }
        },
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => run().then(resolve, reject),
      }
      return q
    },
  },
}))

import { saveBrief } from '../supabaseQueries'

const brief = (id: string, name = 'Advisor Impact'): BriefPayload => ({
  meta: { briefId: id, status: 'submitted' },
  campaign: { campaignName: name, emailType: 'operational', theme: 'agulhas-gold' },
} as unknown as BriefPayload)

beforeEach(() => { db.rows = []; db.failOn = ''; db.inserted = []; db.updatedIds = [] })

describe('saveBrief', () => {
  it('adds the brief the first time it is saved', async () => {
    await saveBrief('t1', 'u1', brief('b1'))
    expect(db.inserted).toHaveLength(1)
    expect(db.inserted[0]).toMatchObject({ team_id: 't1', brief_id: 'b1' })
  })

  it('updates the saved brief instead of adding another copy', async () => {
    db.rows = [{ id: 'r1', team_id: 't1', brief_id: 'b1', data: {} }]
    await saveBrief('t1', 'u1', brief('b1', 'Renamed'))
    expect(db.inserted).toHaveLength(0)
    expect(db.rows[0]).toMatchObject({ campaign_name: 'Renamed' })
  })

  it('copes with a brief that has been saved more than once: every copy is brought up to date, nothing fails', async () => {
    db.rows = [
      { id: 'r1', team_id: 't1', brief_id: 'b1', data: {} },
      { id: 'r2', team_id: 't1', brief_id: 'b1', data: {} },
      { id: 'r3', team_id: 't1', brief_id: 'b1', data: {} },
    ]
    await expect(saveBrief('t1', 'u1', brief('b1', 'Latest'))).resolves.toBeUndefined()
    expect(db.inserted).toHaveLength(0)
    expect(db.updatedIds).toEqual([['r1', 'r2', 'r3']])
    expect(db.rows.every((r) => r.campaign_name === 'Latest')).toBe(true)
  })

  it('leaves another team\'s brief, and another brief, alone', async () => {
    db.rows = [
      { id: 'other-team', team_id: 't2', brief_id: 'b1', data: {} },
      { id: 'other-brief', team_id: 't1', brief_id: 'b2', data: {} },
    ]
    await saveBrief('t1', 'u1', brief('b1'))
    expect(db.inserted).toHaveLength(1)
    expect(db.rows.find((r) => r.id === 'other-team')?.campaign_name).toBeUndefined()
    expect(db.rows.find((r) => r.id === 'other-brief')?.campaign_name).toBeUndefined()
  })

  it('reports a failure to look up, update or add, with the database\'s own message', async () => {
    db.failOn = 'select'
    await expect(saveBrief('t1', 'u1', brief('b1'))).rejects.toThrow('Failed to save brief: select failed')
    db.failOn = 'insert'
    await expect(saveBrief('t1', 'u1', brief('b1'))).rejects.toThrow('Failed to save brief: insert failed')
    db.failOn = ''
    db.rows = [{ id: 'r1', team_id: 't1', brief_id: 'b1', data: {} }]
    db.failOn = 'update'
    await expect(saveBrief('t1', 'u1', brief('b1'))).rejects.toThrow('Failed to save brief: update failed')
  })
})
