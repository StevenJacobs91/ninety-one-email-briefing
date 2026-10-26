// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The real code editor is CodeMirror, loaded on demand; a textarea stands in for it here.
vi.mock('../LazyCodeEditor', async () => {
  const React = await import('react')
  return {
    LazyCodeEditor: ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) =>
      React.createElement('textarea', { 'aria-label': label, value, onChange: (e: { target: { value: string } }) => onChange(e.target.value) }),
  }
})

import { RichTextarea } from '../RichTextarea'

afterEach(cleanup)

const HTML = 'Launching on <span style="color: #cf6f13;">22 October</span>.'

function Harness({ onChange = () => {} }: { onChange?: (html: string) => void }) {
  const [value, setValue] = useState(HTML)
  return <RichTextarea label="Text" value={value} onChange={(v) => { setValue(v); onChange(v) }} />
}

describe('RichTextarea code view', () => {
  it('has a Code button that is off by default, with the formatting tools and the visual editor showing', () => {
    render(<Harness />)
    const code = screen.getByRole('button', { name: /Code/ })
    expect(code.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('textbox', { name: 'Text' }).textContent).toBe('Launching on 22 October.')
    expect(screen.getByRole('button', { name: /Bold/ })).toBeTruthy()
    expect(screen.queryByLabelText('Text code')).toBeNull()
  })

  it('the Link and Code buttons are icons with no visible words, and keep their names for assistive technology and hover', () => {
    render(<Harness />)
    const link = screen.getByRole('button', { name: 'Insert link (Ctrl+K)' })
    const code = screen.getByRole('button', { name: 'Code view' })
    for (const button of [link, code]) {
      expect(button.textContent).toBe('')
      expect(button.querySelector('svg')).toBeTruthy()
      expect(button.getAttribute('title')).toBeTruthy()
    }
  })

  it('Code shows the HTML behind the text in the code editor, in place of the visual editor', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /Code/ }))
    expect((screen.getByLabelText('Text code') as HTMLTextAreaElement).value).toBe(HTML)
    expect(screen.queryByRole('textbox', { name: 'Text' })).toBeNull()
    expect(screen.getByRole('button', { name: /Code/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it('an edit in the code is reported as the new HTML, and the visual editor shows it when you go back', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Code/ }))
    const edited = 'Launching on <b>soon</b>.'
    fireEvent.change(screen.getByLabelText('Text code'), { target: { value: edited } })
    expect(onChange).toHaveBeenLastCalledWith(edited)
    fireEvent.click(screen.getByRole('button', { name: /Code/ }))
    const visual = screen.getByRole('textbox', { name: 'Text' })
    expect(visual.innerHTML).toBe(edited)
    expect(screen.getByRole('button', { name: /Bold/ })).toBeTruthy()
  })
})
