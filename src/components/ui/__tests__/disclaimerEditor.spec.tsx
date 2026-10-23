// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DisclaimerEditor } from '../DisclaimerEditor'

const exec = vi.fn()
beforeEach(() => {
  exec.mockReset()
  exec.mockReturnValue(true)
  ;(document as unknown as { execCommand: typeof exec }).execCommand = exec
})
afterEach(cleanup)

const editor = () => screen.getByRole('textbox', { name: 'Disclaimer text' })

describe('DisclaimerEditor', () => {
  it('shows the disclaimer with its formatting', () => {
    render(<DisclaimerEditor value="<p>Plain <strong>bold</strong></p>" onChange={() => {}} />)
    expect(editor().querySelector('strong')?.textContent).toBe('bold')
  })

  it('offers bold, italic, underline, a link and a text size', () => {
    render(<DisclaimerEditor value="" onChange={() => {}} />)
    for (const name of ['Bold', 'Italic', 'Underline', 'Link']) expect(screen.getByRole('button', { name })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Text size' })).toBeTruthy()
  })

  it('the format buttons act on the selection', () => {
    render(<DisclaimerEditor value="Words" onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    fireEvent.click(screen.getByRole('button', { name: 'Italic' }))
    fireEvent.click(screen.getByRole('button', { name: 'Underline' }))
    expect(exec.mock.calls.map((c) => c[0])).toEqual(['bold', 'italic', 'underline'])
  })

  it('typing reports the new HTML', () => {
    const onChange = vi.fn()
    render(<DisclaimerEditor value="" onChange={onChange} />)
    editor().innerHTML = 'New <i>words</i>'
    fireEvent.input(editor())
    expect(onChange).toHaveBeenLastCalledWith('New <i>words</i>')
  })

  it('a chosen size becomes a pixel size on the selected text', () => {
    const onChange = vi.fn()
    render(<DisclaimerEditor value="" onChange={onChange} />)
    exec.mockImplementation((cmd: string) => {
      if (cmd === 'fontSize') editor().innerHTML = '<font size="7">Small print</font>'
      return true
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Text size' }), { target: { value: '12' } })
    expect(editor().innerHTML).toBe('<span style="font-size: 12px;">Small print</span>')
    expect(onChange).toHaveBeenLastCalledWith('<span style="font-size: 12px;">Small print</span>')
  })

  it('a link is added from the address typed in', () => {
    render(<DisclaimerEditor value="Words" onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Link' }))
    fireEvent.change(screen.getByLabelText('Link address'), { target: { value: 'https://ninetyone.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply link' }))
    expect(exec).toHaveBeenCalledWith('createLink', false, 'https://ninetyone.com')
  })

  it('refuses a link address that could run code', () => {
    render(<DisclaimerEditor value="Words" onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Link' }))
    fireEvent.change(screen.getByLabelText('Link address'), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply link' }))
    expect(exec).not.toHaveBeenCalledWith('createLink', expect.anything(), expect.anything())
  })
})
