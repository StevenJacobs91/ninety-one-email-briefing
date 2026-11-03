// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BriefFormData } from '../../../lib/schema'
import { DraftsDrawer } from '../DraftsDrawer'

afterEach(cleanup)

const brief = (campaignName: string) => ({ campaign: { campaignName } }) as unknown as BriefFormData

function setup(campaignName: string, onSave = vi.fn()) {
  render(
    <DraftsDrawer isOpen onClose={vi.fn()} drafts={[]} currentData={brief(campaignName)} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} onRename={vi.fn()} />,
  )
  return { input: screen.getByRole('textbox') as HTMLInputElement, onSave }
}

describe('DraftsDrawer name field', () => {
  it('fills in the hinted name when Right is pressed on the empty field', () => {
    const { input } = setup('2027 Investment Views (South Africa)')
    expect(input.placeholder).toBe('2027 Investment Views (South Africa)')
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(input.value).toBe('2027 Investment Views (South Africa)')
  })

  it('saves the filled-in name', () => {
    const { input, onSave } = setup('2027 Investment Views')
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith(expect.anything(), '2027 Investment Views')
  })

  it('leaves a name that is being typed alone', () => {
    const { input } = setup('2027 Investment Views')
    fireEvent.change(input, { target: { value: 'My own name' } })
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(input.value).toBe('My own name')
  })

  it('has nothing to fill in when the brief has no name yet', () => {
    const { input } = setup('')
    expect(input.placeholder).toBe('Draft name…')
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(input.value).toBe('')
  })
})
