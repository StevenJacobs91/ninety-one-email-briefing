// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { EditorView } from '@codemirror/view'
import CodeEditor from '../CodeEditor'

// jsdom does no layout; CodeMirror measures text with these, so give it empty answers.
beforeAll(() => {
  const rects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList
  const box = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect
  Range.prototype.getClientRects = rects
  Range.prototype.getBoundingClientRect = box
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

const MESSY = '<tr><td bgcolor="{{primary}}"><table width="100%"><tbody><tr><td><p>Hello</p></td></tr></tbody></table></td></tr>'

const editorView = () => {
  const dom = document.querySelector('.cm-editor') as HTMLElement
  return EditorView.findFromDOM(dom) as EditorView
}

function setup(over: Partial<React.ComponentProps<typeof CodeEditor>> = {}) {
  const onChange = vi.fn()
  render(<CodeEditor label="Module code" id="module-code" value={MESSY} onChange={onChange} {...over} />)
  return { onChange }
}

describe('CodeEditor', () => {
  it('shows the code with line numbers and indentation guides, named for assistive technology', () => {
    setup({ value: '<tr>\n  <td>\n    <p>Hi</p>\n  </td>\n</tr>' })
    const content = document.querySelector('.cm-content') as HTMLElement
    expect(content.getAttribute('aria-label')).toBe('Module code')
    expect(content.id).toBe('module-code')
    expect(content.textContent).toContain('<p>Hi</p>')
    expect(document.querySelector('.cm-lineNumbers')).toBeTruthy()
    expect(document.querySelector('.cm-indent-markers')).toBeTruthy()
  })

  it('Format code re-indents the markup and reports it as one edit', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Format code' }))
    const out = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string
    expect(out.split('\n').length).toBeGreaterThan(6)
    expect(out.split('\n')[1].startsWith('  <td ')).toBe(true)
    expect(out).toContain('{{primary}}')
  })

  it('Find & replace opens a panel with find and replace fields, and replacing changes the code', () => {
    const { onChange } = setup({ value: '<td>Hello</td>' })
    fireEvent.click(screen.getByRole('button', { name: 'Find & replace' }))
    const find = document.querySelector('.cm-search input[name="search"]') as HTMLInputElement
    const replace = document.querySelector('.cm-search input[name="replace"]') as HTMLInputElement
    expect(find).toBeTruthy()
    expect(replace).toBeTruthy()
    expect(document.querySelector('.cm-search button[name="replaceAll"]')).toBeTruthy()
    fireEvent.change(find, { target: { value: 'Hello' } })
    fireEvent.change(replace, { target: { value: 'Goodbye' } })
    fireEvent.click(document.querySelector('.cm-search button[name="replaceAll"]') as HTMLElement)
    expect(onChange).toHaveBeenLastCalledWith('<td>Goodbye</td>')
    expect(editorView().state.doc.toString()).toBe('<td>Goodbye</td>')
  })

  it('shows the cursor position, and a value changed from outside replaces the text without reporting an edit', () => {
    const onChange = vi.fn()
    const { rerender } = render(<CodeEditor label="Module code" value="<p>one</p>" onChange={onChange} />)
    expect(screen.getByText('Ln 1, Col 1')).toBeTruthy()
    rerender(<CodeEditor label="Module code" value="<p>two</p>" onChange={onChange} />)
    expect((document.querySelector('.cm-content') as HTMLElement).textContent).toContain('two')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('can wrap lines and go full screen, and Escape comes back', () => {
    setup()
    const wrap = screen.getByRole('button', { name: 'Wrap lines' })
    expect(wrap.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(wrap)
    expect(wrap.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    expect(screen.getByRole('button', { name: 'Close full screen' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close full screen' }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Full screen' })).toBeTruthy()
  })

  it('marks the editor invalid when the code has a problem', () => {
    setup({ invalid: true })
    expect((document.querySelector('.cm-content') as HTMLElement).getAttribute('aria-invalid')).toBe('true')
  })
})
