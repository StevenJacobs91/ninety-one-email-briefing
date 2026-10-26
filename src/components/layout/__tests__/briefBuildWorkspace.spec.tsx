// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { BriefAttentionProvider, useBriefAttention } from '../../brief/BriefAttention'
import { BriefBuildWorkspace } from '../BriefBuildWorkspace'
import { WorkspaceStatusBar } from '../WorkspaceStatusBar'
import { useInspectorSlot } from '../../builder2/InspectorSlot'
import type { BriefFormData } from '../../../lib/schema'

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

// Every required field filled in, so every pill is green.
const COMPLETE = {
  ...FRESH,
  campaign: { ...FRESH.campaign, emailType: 'newsletter', campaignName: 'Taking Stock', subjectLine: 'Hello', previewText: 'Preview', fromAddress: 'a@ninetyone.com' },
  audience: { ...FRESH.audience, clientGroup: ['Advisor'], region: ['ZA'], channel: ['INTERMEDIARY'] },
  deadlines: { ...FRESH.deadlines, sendDate: '2026-11-01' },
} as unknown as BriefFormData

function OpenState() {
  const attention = useBriefAttention()
  return <p data-testid="deadlines-open">{String(attention?.isOpen('deadlines'))}</p>
}

// Stands in for the email builder: a selected module's inspector is drawn into the workspace's own column.
function Canvas() {
  const [selected, setSelected] = useState(false)
  const slot = useInspectorSlot()
  return (
    <div>
      <p>The email</p>
      <button type="button" onClick={() => setSelected((s) => !s)}>Select a module</button>
      {selected && slot && createPortal(<p>Inspector content</p>, slot)}
    </div>
  )
}

function Harness({ withStatus = false, complete = false, onForm }: { withStatus?: boolean; complete?: boolean; onForm?: (f: ReturnType<typeof useForm<BriefFormData>>) => void }) {
  const form = useForm<BriefFormData>({ defaultValues: complete ? COMPLETE : FRESH })
  onForm?.(form)
  return (
    <FormProvider {...form}>
      <BriefAttentionProvider attempted={false} problems={[]}>
        <OpenState />
        <BriefBuildWorkspace
          brief={<input aria-label="Campaign name" />}
          canvas={<Canvas />}
          statusBar={withStatus ? <WorkspaceStatusBar saveStatus="idle" savedAt={null} score={null} minimumScore={80} onContinue={() => {}} onJump={() => {}} /> : <p>Status strip</p>}
        />
      </BriefAttentionProvider>
    </FormProvider>
  )
}

describe('BriefBuildWorkspace', () => {
  it('has a landmark for the brief, the email and the inspector, with the status strip above them', () => {
    render(<Harness />)
    expect(screen.getByRole('complementary', { name: 'Brief' })).toBeTruthy()
    expect(screen.getByRole('main', { name: 'Email builder' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Module inspector' })).toBeTruthy()
    expect(screen.getByText('Status strip')).toBeTruthy()
  })

  it('offers no choice of view', () => {
    render(<Harness withStatus />)
    expect(screen.queryByRole('button', { name: 'Workspace' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Brief first' })).toBeNull()
    expect(screen.getByRole('button', { name: /Continue to review/i })).toBeTruthy()
  })

  it('starts open at every width, with the sections showing how far along they are', () => {
    render(<Harness complete />)
    expect(screen.queryByRole('button', { name: 'Expand the brief panel' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Collapse the brief panel' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('cannot be collapsed while a section is incomplete, and says why', () => {
    render(<Harness />)
    const collapse = screen.getByRole('button', { name: 'Collapse the brief panel' }) as HTMLButtonElement
    expect(collapse.disabled).toBe(true)
    expect(collapse.title).toMatch(/complete every section/i)
    fireEvent.click(collapse)
    expect(screen.queryByRole('button', { name: 'Expand the brief panel' })).toBeNull()
  })

  it('collapses to a rail of green badges once every section is complete, keeping what was typed', () => {
    render(<Harness complete />)
    fireEvent.change(screen.getByLabelText('Campaign name', { selector: 'input' }), { target: { value: 'Autumn outlook' } })
    const collapse = screen.getByRole('button', { name: 'Collapse the brief panel' }) as HTMLButtonElement
    expect(collapse.disabled).toBe(false)
    fireEvent.click(collapse)
    expect(screen.getByRole('button', { name: 'Expand the brief panel' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: /Message envelope: 2 of 2/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Expand the brief panel' }))
    expect((screen.getByLabelText('Campaign name', { selector: 'input' }) as HTMLInputElement).value).toBe('Autumn outlook')
  })

  it('moves focus to the control that replaces the one used', () => {
    render(<Harness complete />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse the brief panel' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Expand the brief panel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand the brief panel' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Collapse the brief panel' }))
  })

  it('a badge on the rail opens the panel and that section', () => {
    render(<Harness complete />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse the brief panel' }))
    fireEvent.click(screen.getByRole('button', { name: /^Deadlines: \d+ of \d+/ }))
    expect(screen.getByTestId('deadlines-open').textContent).toBe('true')
    expect(screen.getByRole('button', { name: 'Collapse the brief panel' })).toBeTruthy()
  })

  it('opens again by itself if a section stops being complete, so nothing left undone is hidden', async () => {
    let form: ReturnType<typeof useForm<BriefFormData>> | undefined
    render(<Harness complete onForm={(f) => { form = f }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse the brief panel' }))
    expect(screen.getByRole('button', { name: 'Expand the brief panel' })).toBeTruthy()
    await act(async () => { form!.setValue('campaign.subjectLine', '') })
    expect(screen.queryByRole('button', { name: 'Expand the brief panel' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Collapse the brief panel' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows a module’s inspector in its own column', () => {
    render(<Harness />)
    const inspector = screen.getByRole('complementary', { name: 'Module inspector' })
    expect(inspector.textContent).not.toContain('Inspector content')
    fireEvent.click(screen.getByRole('button', { name: 'Select a module' }))
    expect(inspector.textContent).toContain('Inspector content')
  })
})
