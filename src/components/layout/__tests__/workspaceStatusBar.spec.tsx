// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { BriefAttentionProvider } from '../../brief/BriefAttention'
import { WorkspaceProblems, WorkspaceStatusBar, formatSavedAt } from '../WorkspaceStatusBar'
import type { BriefFormData } from '../../../lib/schema'
import { briefProblems } from '../../../lib/briefProblems'
import type { FormProblem } from '../../../lib/formErrors'

// A new brief as the form starts it: every group is present and every field empty.
const FRESH = {
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'campaign', campaignName: '', theme: 'leatherback-coral', subjectLine: '', previewText: '', fromName: 'Ninety One', fromAddress: '', replyToEmail: '' },
  audience: { clientGroup: [], region: [], channel: [], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '', sections: [], modules: [], moduleNotes: {}, cta: { label: '', url: '', openInNewTab: true }, legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefFormData

function Host({ children, attempted = true, problems = [] }: { children: ReactNode; attempted?: boolean; problems?: FormProblem[] }) {
  const form = useForm<BriefFormData>({ defaultValues: FRESH })
  return (
    <FormProvider {...form}>
      <BriefAttentionProvider attempted={attempted} problems={problems}>{children}</BriefAttentionProvider>
    </FormProvider>
  )
}

const base = { saveStatus: 'idle' as const, savedAt: null, score: null, minimumScore: 80, onContinue: () => {}, onJump: () => {} }

afterEach(cleanup)

describe('formatSavedAt', () => {
  it('shows a clock time for a saved draft and nothing before one is saved', () => {
    expect(formatSavedAt(null)).toBe('')
    expect(formatSavedAt(new Date(2026, 9, 26, 14, 5).getTime())).toMatch(/14[:.]05/)
  })
})

describe('WorkspaceStatusBar', () => {
  it('says when the draft was saved, and that it is saving while a save is under way', () => {
    const { rerender } = render(<Host><WorkspaceStatusBar {...base} savedAt={new Date(2026, 9, 26, 14, 5).getTime()} saveStatus="saved" /></Host>)
    expect(screen.getByText(/Draft saved/i)).toBeTruthy()
    rerender(<Host><WorkspaceStatusBar {...base} saveStatus="saving" /></Host>)
    expect(screen.getByText(/Saving/i)).toBeTruthy()
  })

  it('shows the Brand Review score against the minimum, and nothing before there is one', () => {
    const { rerender } = render(<Host><WorkspaceStatusBar {...base} score={92} /></Host>)
    expect(screen.getByText(/Brand review/i).textContent).toMatch(/92/)
    rerender(<Host><WorkspaceStatusBar {...base} score={null} /></Host>)
    expect(screen.queryByText(/Brand review/i)).toBeNull()
  })

  it('names the sections that need attention and jumps to the first problem', () => {
    const issues = briefProblems(FRESH)
    expect(issues.length).toBeGreaterThan(0)
    const onJump = vi.fn()
    render(<Host problems={issues}><WorkspaceStatusBar {...base} onJump={onJump} /></Host>)
    const button = screen.getByRole('button', { name: /need attention|needs attention/i })
    fireEvent.click(button)
    expect(onJump).toHaveBeenCalledWith(issues[0].path)
  })

  it('Continue is always a live button and runs the check when pressed', () => {
    const onContinue = vi.fn()
    render(<Host><WorkspaceStatusBar {...base} onContinue={onContinue} /></Host>)
    const button = screen.getByRole('button', { name: /Continue to review/i })
    expect((button as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(button)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('lists what stopped Continue as an alert, each item a button to its field', () => {
    const onJump = vi.fn()
    const problems: FormProblem[] = [{ field: 'Subject line', message: 'Required', path: 'campaign.subjectLine' }]
    render(<WorkspaceProblems problems={problems} onJump={onJump} />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/Required/)
    fireEvent.click(screen.getByRole('button', { name: 'Subject line' }))
    expect(onJump).toHaveBeenCalledWith('campaign.subjectLine')
  })

  it('draws nothing when nothing stopped Continue', () => {
    render(<WorkspaceProblems problems={[]} onJump={() => {}} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('is one compact row with no box of its own, for the nav', () => {
    const { container } = render(<Host><WorkspaceStatusBar {...base} score={92} /></Host>)
    const row = container.firstElementChild as HTMLElement
    expect(row.className).not.toMatch(/border/)
    expect(row.className).toContain('shrink-0')
  })
})
