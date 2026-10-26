// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/supabaseQueries', () => ({ saveBrief: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../lib/exportBrief', () => ({ downloadBriefJson: vi.fn(), copyBriefToClipboard: vi.fn().mockResolvedValue(undefined) }))

import { useBriefForm } from '../useBriefForm'

const DEFAULTS = { fromName: 'Ninety One', fromAddress: 'ipadvisor@ninetyone.com', replyToEmail: 'ipadvisor@ninetyone.com', theme: 'leatherback-coral' }

describe('useBriefForm: start a new brief', () => {
  it('replaces everything entered with a blank brief that keeps the sender defaults', () => {
    const { result } = renderHook(() => useBriefForm(DEFAULTS))
    act(() => {
      result.current.form.setValue('campaign.campaignName', 'Women and Investing')
      result.current.form.setValue('campaign.subjectLine', 'Subject | Women and Investing')
      result.current.form.setValue('campaign.fromName', 'Someone Else')
    })
    expect(result.current.form.getValues('campaign.campaignName')).toBe('Women and Investing')
    act(() => result.current.startNewBrief())
    const v = result.current.form.getValues()
    expect(v.campaign.campaignName).toBe('')
    expect(v.campaign.subjectLine).toBe('')
    expect(v.campaign.fromName).toBe('Ninety One')
    expect(v.campaign.fromAddress).toBe('ipadvisor@ninetyone.com')
  })

  it('gives the new brief its own id and a draft status, so it never collides with the one just submitted', () => {
    const { result } = renderHook(() => useBriefForm(DEFAULTS))
    const first = result.current.form.getValues('meta.briefId')
    act(() => result.current.form.setValue('meta.status', 'submitted'))
    act(() => result.current.startNewBrief())
    const meta = result.current.form.getValues('meta')
    expect(meta.briefId).not.toBe(first)
    expect(meta.briefId).toMatch(/^[0-9a-f-]{36}$/)
    expect(meta.status).toBe('draft')
  })

  it('goes back to the first step and forgets that the last brief was submitted', async () => {
    const { result } = renderHook(() => useBriefForm(DEFAULTS))
    act(() => result.current.goToStep(1))
    act(() => result.current.setSubmitStatus('success'))
    expect(result.current.currentStep).toBe(1)
    act(() => result.current.startNewBrief())
    expect(result.current.currentStep).toBe(0)
    expect(result.current.submitStatus).toBe('idle')
  })

  it('does not leave the old brief\'s attachments, sections or edits behind', () => {
    const { result } = renderHook(() => useBriefForm(DEFAULTS))
    act(() => {
      result.current.form.setValue('assets.attachments', [{ name: 'a.pdf', size: 1, type: 'application/pdf', path: 'p' }])
      result.current.form.setValue('deadlines.notes', 'Please hurry')
    })
    act(() => result.current.startNewBrief())
    expect(result.current.form.getValues('assets.attachments')).toEqual([])
    expect(result.current.form.getValues('deadlines.notes') ?? '').not.toContain('hurry')
  })
})
