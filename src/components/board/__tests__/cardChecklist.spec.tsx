// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const EMAIL = `<table><tbody>
<tr><td><h3>Global ETFs added to your toolkit</h3><p>Where clients can hold them, how they are traded and more.</p><a href="https://x.com/etfs">5-minute read</a></td></tr>
<tr><td><p>Kind regards,</p><p>David Stronach</p></td></tr>
<tr><td><p class="disclaimer-copy">All information and opinions provided are of a general nature.</p></td></tr>
</tbody></table>`

const brief = {
  meta: { briefId: 'b1' },
  campaign: { emailDescription: 'October edition', emailType: 'newsletter', campaignName: 'Advisor Impact', theme: 'agulhas-gold', subjectLine: 'Subject here', previewText: 'Preview here', senderType: 'general', fromName: 'David', fromAddress: 'd@ninetyone.com', utmCampaign: 'advisor-impact' },
  audience: { clientGroup: ['Africa'], region: ['South Africa'], channel: ['Advisor'], distributionLists: [] },
  content: { headline: 'Advisor Impact', subHeadline: '', greetingId: 'g1' },
  deadlines: { sendDate: '2026-10-28' },
}

const state = vi.hoisted(() => ({
  role: 'producer', customRoleId: null as string | null, settings: {} as Record<string, unknown>,
  trigger: vi.fn(), download: vi.fn(), audit: vi.fn(), fetchBrief: vi.fn(),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { displayName: 'Sam', role: state.role, customRoleId: state.customRoleId }, user: { id: 'u1', email: 's@ninetyone.com' } }),
}))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings }) }))
vi.mock('../../../hooks/useAuditLog', () => ({ useAuditLog: () => ({ log: state.audit }) }))
vi.mock('../../../lib/supabaseQueries', () => ({ fetchBriefById: state.fetchBrief }))
vi.mock('../../../lib/downloadHtml', () => ({ downloadHtml: state.download }))
vi.mock('../../../lib/powerAutomateService', async () => ({
  ...(await vi.importActual<typeof import('../../../lib/powerAutomateService')>('../../../lib/powerAutomateService')),
  triggerChecklistSend: state.trigger,
}))

import { mergePowerAutomate } from '../../../lib/settingsDefaults'
import { CardChecklist } from '../CardChecklist'
import type { CardEmail } from '../useCardEmail'

const ready: CardEmail = { status: 'ready', html: EMAIL }
const flowOn = mergePowerAutomate({ enabled: true, checklistFlow: { webhookUrl: 'https://flow.test/x', enabled: true } })

const show = (email: CardEmail = ready) => render(<CardChecklist briefId="b1" email={email} />)

beforeEach(() => {
  state.role = 'producer'
  state.customRoleId = null
  state.settings = { greetings: [], brandThemes: [], powerAutomate: flowOn, preSendChecklist: { recipients: ['a@ninetyone.com', 'b@ninetyone.com'] } }
  state.trigger.mockReset().mockResolvedValue({ ok: true, status: 200 })
  state.download.mockReset()
  state.audit.mockReset()
  state.fetchBrief.mockReset().mockResolvedValue(brief)
})
afterEach(cleanup)

describe('the pre-send checklist buttons in a card\'s drawer', () => {
  it('are two buttons, Send Checklist first as the main one and Download Checklist second', () => {
    show()
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Send Checklist', 'Download Checklist'])
    expect(buttons[0].className).toContain('bg-brand-primary')
    expect(buttons[1].className).not.toContain('bg-brand-primary')
    expect(screen.getByText(/2 recipients/)).toBeTruthy()
  })

  it('are shown only to the roles chosen in Settings', () => {
    state.role = 'requester'
    const { unmount } = show()
    expect(screen.queryByRole('button', { name: 'Send Checklist' })).toBeNull()
    unmount()
    state.settings = { ...state.settings, preSendChecklist: { recipients: ['a@ninetyone.com'], visibleTo: ['requester'] } }
    show()
    expect(screen.getByRole('button', { name: 'Send Checklist' })).toBeTruthy()
  })

  it('are hidden for everyone when the checklist is switched off', () => {
    state.settings = { ...state.settings, preSendChecklist: { enabled: false } }
    show()
    expect(screen.queryByRole('button', { name: 'Download Checklist' })).toBeNull()
  })

  it('Download Checklist saves the checklist filled in from the card\'s saved brief and email', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Download Checklist' }))
    await waitFor(() => expect(state.download).toHaveBeenCalledTimes(1))
    expect(state.fetchBrief).toHaveBeenCalledWith('b1')
    const [html, fileName] = state.download.mock.calls[0] as [string, string]
    expect(html).toContain('EMAIL PRE-SEND APPROVAL CHECKLIST')
    expect(html).toContain('Subject here')
    expect(html).toContain('Global ETFs added to your toolkit')
    expect(fileName).toMatch(/^pre-send-checklist-.*\.html$/)
  })

  it('Send Checklist sends it to the recipients with the email attached, and says who it went to', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Send Checklist' }))
    await waitFor(() => expect(state.trigger).toHaveBeenCalledTimes(1))
    const args = state.trigger.mock.calls[0][1] as { recipients: string[]; subject: string; bodyHtml: string; html: string; attachments: { name: string; type: string; base64: string }[]; briefId: string; requesterEmail: string }
    expect(args.html).toContain('Global ETFs added to your toolkit')
    expect(args.recipients).toEqual(['a@ninetyone.com', 'b@ninetyone.com'])
    expect(args.subject).toMatch(/^Pre-send checklist: \d{4} SA Advisor Advisor Impact - October edition$/)
    expect(args.bodyHtml).toContain('EMAIL PRE-SEND APPROVAL CHECKLIST')
    expect(args.attachments).toHaveLength(1)
    expect(args.attachments[0].type).toBe('text/html')
    expect(args.attachments[0].name).toMatch(/\.html$/)
    expect(atob(args.attachments[0].base64)).toContain('Global ETFs added to your toolkit')
    expect(args.briefId).toBe('b1')
    expect(args.requesterEmail).toBe('s@ninetyone.com')
    expect((await screen.findByText(/Sent to a@ninetyone.com, b@ninetyone.com/)).textContent).toBeTruthy()
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'Sent pre-send checklist' }))
  })

  it('Send Checklist says what is missing, and sends nothing, when there are no recipients or no flow', async () => {
    state.settings = { ...state.settings, preSendChecklist: { recipients: [] } }
    const { unmount } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Send Checklist' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/recipients/i)
    unmount()
    state.settings = { ...state.settings, preSendChecklist: { recipients: ['a@ninetyone.com'] }, powerAutomate: mergePowerAutomate({}) }
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Send Checklist' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/flow/i)
    expect(state.trigger).not.toHaveBeenCalled()
  })

  it('Send Checklist shows the flow\'s error when it refuses', async () => {
    state.trigger.mockResolvedValue({ ok: false, error: 'Flow returned 400: schema mismatch' })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Send Checklist' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Flow returned 400: schema mismatch')
  })

  it('say so, and send nothing, while the card\'s email is still loading', async () => {
    show({ status: 'loading' })
    fireEvent.click(screen.getByRole('button', { name: 'Send Checklist' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/still loading/i)
    expect(state.trigger).not.toHaveBeenCalled()
  })

  it('say so, and send nothing, when the card\'s brief cannot be found', async () => {
    state.fetchBrief.mockResolvedValue(null)
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Send Checklist' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be found/i)
    expect(state.trigger).not.toHaveBeenCalled()
  })
})
