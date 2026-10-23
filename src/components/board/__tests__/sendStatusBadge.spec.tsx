// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SendStatusBadge, STATUS_COLOURS } from '../SendStatusBadge'

afterEach(cleanup)

const NOW = new Date('2026-10-22T10:00:00')

describe('SendStatusBadge', () => {
  it('says Overdue in Protea Red when the send date has passed', () => {
    render(<SendStatusBadge sendDate="2026-10-01" column="briefed" now={NOW} />)
    const badge = screen.getByText('Overdue')
    expect(badge.style.backgroundColor).toBe('rgb(216, 57, 73)')
  })

  it('says Due soon in Warm Yellowwood within a week of the send date', () => {
    render(<SendStatusBadge sendDate="2026-10-25" column="briefed" now={NOW} />)
    expect(screen.getByText('Due soon').style.backgroundColor).toBe('rgb(252, 170, 40)')
  })

  it('says On track in Ocean Teal when the send date is further away, rather than showing a bare dot', () => {
    render(<SendStatusBadge sendDate="2026-12-01" column="briefed" now={NOW} />)
    const badge = screen.getByText('On track')
    expect(badge.style.backgroundColor).toBe('rgb(0, 157, 128)')
    expect(badge.title).toMatch(/more than a week/i)
  })

  it('treats a campaign with no send date, or one already distributed, as On track', () => {
    render(<><SendStatusBadge sendDate="" now={NOW} /><SendStatusBadge sendDate="2026-10-01" column="distributed" now={NOW} /></>)
    expect(screen.getAllByText('On track').length).toBe(2)
  })

  it('exports the three colours so dots and dates elsewhere can match', () => {
    expect(STATUS_COLOURS).toEqual({ overdue: '#d83949', 'due-soon': '#fcaa28', ok: '#009d80' })
  })
})
