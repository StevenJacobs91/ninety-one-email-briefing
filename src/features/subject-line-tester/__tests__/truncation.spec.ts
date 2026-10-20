import { describe, expect, it } from 'vitest'
import { describeTruncation, isTruncated, visiblePart } from '../components/InboxPreview/truncation'

describe('truncation', () => {
  it('shows short text whole', () => {
    expect(isTruncated('Short subject', 40)).toBe(false)
    expect(visiblePart('Short subject', 40)).toBe('Short subject')
  })

  it('cuts at the character limit and trims the end', () => {
    const subject = 'Register to join | Navigating a rapidly changing market'
    expect(isTruncated(subject, 40)).toBe(true)
    expect(isTruncated(subject, 60)).toBe(false)
    expect(visiblePart(subject, 40)).toBe(subject.slice(0, 40).trimEnd())
  })

  it('counts an emoji or flag as one character', () => {
    expect(isTruncated('Sale 🇿🇦🇿🇦🇿🇦', 8)).toBe(false)
    expect(isTruncated('Sale 🇿🇦🇿🇦🇿🇦', 7)).toBe(true)
  })

  it('describes what each device shows, for screen readers', () => {
    const text = describeTruncation('Register to join | Navigating a rapidly changing market', 60, 40)
    expect(text).toContain('Desktop preview shows the whole subject line.')
    expect(text).toMatch(/Mobile preview cuts off after "Register to join \| Navigating a rapidly/)
  })

  it('says so when nothing is cut off, or there is no subject', () => {
    expect(describeTruncation('Short one', 60, 40)).toBe('Desktop and mobile previews show the whole subject line.')
    expect(describeTruncation('', 60, 40)).toBe('There is no subject line to preview yet.')
  })

  it('reports when both devices cut it off', () => {
    const text = describeTruncation('x'.repeat(70), 60, 40)
    expect(text).toMatch(/Desktop preview cuts off after/)
    expect(text).toMatch(/Mobile preview cuts off after/)
  })
})
