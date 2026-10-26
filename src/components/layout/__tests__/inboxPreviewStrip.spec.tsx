// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { InboxPreviewStrip } from '../InboxPreviewStrip'
import type { BriefFormData } from '../../../lib/schema'

afterEach(cleanup)

const blank = { campaign: { fromName: 'Ninety One', subjectLine: '', previewText: '' } } as unknown as BriefFormData

function Harness() {
  const form = useForm<BriefFormData>({ defaultValues: blank })
  return (
    <FormProvider {...form}>
      <input aria-label="Subject line field" {...form.register('campaign.subjectLine')} />
      <input aria-label="Preview text field" {...form.register('campaign.previewText')} />
      <InboxPreviewStrip />
    </FormProvider>
  )
}

describe('InboxPreviewStrip', () => {
  it('is a labelled region that says what to type while the subject line is empty', () => {
    render(<Harness />)
    expect(screen.getByRole('region', { name: 'Inbox preview' })).toBeTruthy()
    expect(screen.getByText(/Add a subject line/i)).toBeTruthy()
  })

  it('follows the subject line, sender and preview text as they are typed', async () => {
    render(<Harness />)
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Subject line field'), { target: { value: 'Taking Stock: Q3 outlook' } })
      fireEvent.change(screen.getByLabelText('Preview text field'), { target: { value: 'Five minutes on infrastructure' } })
    })
    const region = screen.getByRole('region', { name: 'Inbox preview' })
    expect(region.textContent).toContain('Taking Stock: Q3 outlook')
    expect(region.textContent).toContain('Five minutes on infrastructure')
    expect(region.textContent).toContain('Ninety One')
    expect(screen.queryByText(/Add a subject line/i)).toBeNull()
  })
})
