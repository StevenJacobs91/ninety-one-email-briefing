// @vitest-environment jsdom
import { useRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, describe, expect, it } from 'vitest'
import type { BriefFormData } from '../../../lib/schema'
import type { FormProblem } from '../../../lib/formErrors'
import { sectionOrderMap, resolveSectionOrder } from '../../../lib/briefLayout'
import { defaultRequiredMap, type RequiredMap } from '../../../lib/briefRequirements'
import type { BriefSectionId } from '../../../lib/briefSections'
import { BriefAttentionProvider } from '../BriefAttention'
import { BriefSection } from '../BriefSection'

afterEach(cleanup)

const FRESH = {
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'campaign', campaignName: '', theme: 'leatherback-coral', subjectLine: '', previewText: '', fromName: 'Ninety One', fromAddress: '', replyToEmail: '' },
  audience: { clientGroup: [], region: [], channel: [], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '', sections: [], modules: [], moduleNotes: {}, cta: { label: '', url: '', openInNewTab: true }, legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefFormData

const subjectProblem: FormProblem = { field: 'Subject line', message: 'Required', path: 'campaign.subjectLine' }

let jump: ((path: string) => void) | null = null

function Harness({ attempted = false, problems = [] as FormProblem[], order, required }: { attempted?: boolean; problems?: FormProblem[]; order?: Record<BriefSectionId, number>; required?: RequiredMap }) {
  const form = useForm<BriefFormData>({ defaultValues: FRESH })
  const ref = useRef<((path: string) => void) | null>(null)
  jump = (path) => ref.current?.(path)
  return (
    <FormProvider {...form}>
      <BriefAttentionProvider attempted={attempted} problems={problems} order={order} required={required} jumpRef={ref}>
        <div className="flex flex-col">
          <BriefSection id="envelope" title="Message Envelope">
            <input aria-label="Subject line" {...form.register('campaign.subjectLine')} />
            <input aria-label="Preview text" {...form.register('campaign.previewText')} />
          </BriefSection>
          <BriefSection id="deadlines" title="Deadlines">
            <input aria-label="Send date" {...form.register('deadlines.sendDate')} />
          </BriefSection>
          <BriefSection id="materials" title="Supporting Material"><p>Files</p></BriefSection>
        </div>
      </BriefAttentionProvider>
    </FormProvider>
  )
}

const header = (title: string) => screen.getByRole('heading', { name: new RegExp(`^${title}`) })

describe('Brief sections', () => {
  it('are all open one under the other, with no control to close them, each showing how far along it is', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: /Message Envelope|Deadlines|Supporting Material/ })).toBeNull()
    expect(screen.getByLabelText('Subject line').closest('[hidden]')).toBeNull()
    expect(screen.getByLabelText('Send date').closest('[hidden]')).toBeNull()
    expect(header('Message Envelope').textContent).toContain('0 of 2')
    expect(header('Deadlines').textContent).toContain('1 of 2') // the send date is missing; the approval date is optional
    expect(header('Supporting Material').textContent).toContain('Optional')
  })

  it('count a field done as soon as it is valid, and say when the section is complete', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Subject line'), { target: { value: 'Introducing our new online platform' } })
    expect(header('Message Envelope').textContent).toContain('1 of 2')
    fireEvent.change(screen.getByLabelText('Preview text'), { target: { value: 'Passive investment products' } })
    expect(header('Message Envelope').textContent).toContain('2 of 2')
    expect(header('Message Envelope').textContent).toContain('complete')
  })

  it('stay neutral until Continue has been pressed, then turn red where something is wrong', () => {
    const { rerender } = render(<Harness problems={[subjectProblem]} />)
    expect(header('Message Envelope').textContent).not.toContain('needs attention')
    rerender(<Harness attempted problems={[subjectProblem]} />)
    expect(header('Message Envelope').textContent).toContain('needs attention')
    expect(header('Message Envelope').querySelector('span.bg-red-100')).toBeTruthy()
    expect(header('Supporting Material').textContent).not.toContain('needs attention')
  })

  it('jump to a field: put the cursor in it', async () => {
    render(<Harness />)
    jump?.('deadlines.sendDate')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Send date')))
  })

  it('sit in the order the team has set', () => {
    const order = sectionOrderMap(resolveSectionOrder(['deadlines', 'envelope']))
    render(<Harness order={order} />)
    const position = (id: string) => (document.querySelector(`[data-brief-section="${id}"]`) as HTMLElement).style.order
    expect(position('deadlines')).toBe('1')
    expect(position('envelope')).toBe('2')
    expect(Number(position('materials'))).toBeGreaterThan(Number(position('envelope')))
  })

  it('count a field the team has made required, and call the section complete only once it is filled in', () => {
    const required = { ...defaultRequiredMap(), 'deadlines.notes': true }
    render(<Harness required={required} />)
    expect(header('Deadlines').textContent).toContain('1 of 3')
  })

  it('are plain headings outside the Brief panel, with nothing to open or close', () => {
    render(<BriefSection id="deadlines" title="Deadlines"><p>Content</p></BriefSection>)
    expect(screen.getByRole('heading', { name: 'Deadlines' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Deadlines/ })).toBeNull()
    expect(screen.getByText('Content')).toBeTruthy()
  })
})
