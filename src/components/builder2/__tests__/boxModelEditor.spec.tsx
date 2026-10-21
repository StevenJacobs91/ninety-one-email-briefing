// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BoxInfo } from '../../../lib/moduleEngine/describe'
import { BoxModelEditor } from '../BoxModelEditor'

afterEach(cleanup)

const sides = (t = '', r = '', b = '', l = '') => ({ top: t, right: r, bottom: b, left: l })
const container: BoxInfo = { key: 'container', label: 'Module container', allowMargin: false, read: { margin: sides(), padding: sides('0px', '40px', '30px', '40px'), class: 'stack-mobile-none darkmode' } }
const text: BoxInfo = { key: 'root.0', label: 'Text', allowMargin: true, read: { margin: sides('0px', '0', '0px', '0'), padding: sides(), class: '' } }

function setup(over: Partial<React.ComponentProps<typeof BoxModelEditor>> = {}) {
  const onStyle = vi.fn()
  const onClear = vi.fn()
  render(<BoxModelEditor boxes={[container, text]} styles={{}} onStyle={onStyle} onClear={onClear} {...over} />)
  return { onStyle, onClear }
}

describe('BoxModelEditor', () => {
  it('shows nothing when the module has no elements to adjust', () => {
    const { container: c } = render(<BoxModelEditor boxes={[]} styles={{}} onStyle={() => {}} onClear={() => {}} />)
    expect(c.textContent).toBe('')
  })

  it('shows the design\'s current padding and class as placeholders for the first element', () => {
    setup()
    expect((screen.getByLabelText('Padding left') as HTMLInputElement).placeholder).toBe('40px')
    expect((screen.getByLabelText('Padding top') as HTMLInputElement).placeholder).toBe('0px')
    expect((screen.getByLabelText('Class') as HTMLInputElement).placeholder).toBe('stack-mobile-none darkmode')
  })

  it('reports a padding edit for the selected element', () => {
    const { onStyle } = setup()
    fireEvent.change(screen.getByLabelText('Padding top'), { target: { value: '12' } })
    expect(onStyle).toHaveBeenCalledWith('container', { padding: { top: '12' } })
  })

  it('cannot take a margin on the module container', () => {
    setup()
    expect((screen.getByLabelText('Margin top') as HTMLInputElement).disabled).toBe(true)
  })

  it('switches to another element and offers its margin', async () => {
    const user = userEvent.setup()
    const { onStyle } = setup()
    await user.selectOptions(screen.getByLabelText('Element'), 'root.0')
    const top = screen.getByLabelText('Margin top') as HTMLInputElement
    expect(top.disabled).toBe(false)
    expect(top.placeholder).toBe('0px')
    fireEvent.change(top, { target: { value: '8' } })
    expect(onStyle).toHaveBeenCalledWith('root.0', { margin: { top: '8' } })
  })

  it('shows a saved override in place of the design value', () => {
    setup({ styles: { container: { padding: { left: '10px' }, class: 'custom' } } })
    expect((screen.getByLabelText('Padding left') as HTMLInputElement).value).toBe('10px')
    expect((screen.getByLabelText('Class') as HTMLInputElement).value).toBe('custom')
  })

  it('marks a value that is not a length as invalid', () => {
    setup({ styles: { container: { padding: { top: 'abc' } } } })
    expect(screen.getByLabelText('Padding top').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText('Padding left').getAttribute('aria-invalid')).toBeNull()
  })

  it('reports a class change', () => {
    const { onStyle } = setup()
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'darkmode lead' } })
    expect(onStyle).toHaveBeenCalledWith('container', { class: 'darkmode lead' })
  })

  it('can reset an element only when it has overrides', async () => {
    const user = userEvent.setup()
    const none = setup()
    expect((screen.getByRole('button', { name: 'Reset to design' }) as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    const { onClear } = setup({ styles: { container: { padding: { top: '1px' } } } })
    await user.click(screen.getByRole('button', { name: 'Reset to design' }))
    expect(onClear).toHaveBeenCalledWith('container')
    expect(none.onClear).not.toHaveBeenCalled()
  })
})
