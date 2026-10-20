// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SubjectLineTester } from '../components/SubjectLineTester'
import { FEATURE_FLAGS } from '../featureFlags'
import type { SuggestionProvider } from '../adapters/SuggestionProvider'

afterEach(cleanup)

const button = () => screen.queryByRole('button', { name: 'Suggest rewrites' })

describe('feature flag', () => {
  it('is off by default', () => {
    expect(FEATURE_FLAGS.suggestions).toBe(false)
  })

  it('shows nothing and calls no provider while off', () => {
    const provider: SuggestionProvider = { suggest: vi.fn(async () => ['anything']) }
    render(<SubjectLineTester initial={{ subject: 'FREE MONEY!!! Act now' }} suggestionProvider={provider} />)
    expect(button()).toBeNull()
    expect(screen.queryByText('Suggested rewrites')).toBeNull()
    expect(provider.suggest).not.toHaveBeenCalled()
  })
})

describe('suggestions on', () => {
  it('offers rewrites that are re-scored and better than the original', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SubjectLineTester initial={{ subject: 'FREE MONEY!!! Act now' }} enableSuggestions />)
    await user.click(button()!)
    const panel = await screen.findByRole('region', { name: 'Suggested rewrites' })
    await waitFor(() => expect(panel.querySelectorAll('li').length).toBeGreaterThan(0))
    for (const li of Array.from(panel.querySelectorAll('li'))) {
      const score = Number(li.textContent?.match(/(\d+)% ·/)?.[1])
      expect(score).toBeGreaterThan(60)
    }
  })

  it('"Use this" puts the suggestion into the subject line', async () => {
    const user = userEvent.setup({ delay: null })
    const provider: SuggestionProvider = { suggest: async () => ['Your 50% off gift is waiting'] }
    render(<SubjectLineTester initial={{ subject: 'FREE MONEY!!! Act now' }} enableSuggestions suggestionProvider={provider} />)
    await user.click(button()!)
    await user.click(await screen.findByRole('button', { name: 'Use this' }))
    expect((screen.getByLabelText('Subject line') as HTMLInputElement).value).toBe('Your 50% off gift is waiting')
  })

  it('sends the provider merge tags as tags, never sample values', async () => {
    const user = userEvent.setup({ delay: null })
    const suggest = vi.fn(async () => [] as string[])
    render(
      <SubjectLineTester
        initial={{ subject: 'FREE gift for {{Recipient.FirstName}}!!!', senderName: 'Acme Capital', preheader: 'A note' }}
        enableSuggestions
        suggestionProvider={{ suggest }}
      />,
    )
    await user.click(button()!)
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(1))
    const sent = JSON.stringify(suggest.mock.calls[0])
    expect(sent).toContain('{{Recipient.FirstName}}')
    expect(sent).not.toContain('Alexandra')
    expect(sent).not.toContain('Acme Capital')
    expect(sent).not.toContain('A note')
  })

  it('says so when there is no better rewrite', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SubjectLineTester initial={{ subject: 'Your 50% off gift is waiting' }} enableSuggestions suggestionProvider={{ suggest: async () => ['Plan your Q4 review!'] }} />)
    await user.click(button()!)
    expect(await screen.findByText('No better rewrite found.')).toBeTruthy()
  })

  it('reports a failing provider and can be retried', async () => {
    const user = userEvent.setup({ delay: null })
    const suggest = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(['Your 50% off gift is waiting'])
    render(<SubjectLineTester initial={{ subject: 'FREE MONEY!!! Act now' }} enableSuggestions suggestionProvider={{ suggest }} />)
    await user.click(button()!)
    expect((await screen.findByRole('alert')).textContent).toBe('Could not get suggestions. Try again.')
    await act(async () => { await user.click(button()!) })
    expect(await screen.findByText('Your 50% off gift is waiting')).toBeTruthy()
  })

  it('needs a subject line first', () => {
    render(<SubjectLineTester enableSuggestions />)
    expect((button() as HTMLButtonElement).disabled).toBe(true)
  })
})
