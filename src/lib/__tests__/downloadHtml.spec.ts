// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadHtml } from '../downloadHtml'

afterEach(() => vi.restoreAllMocks())

describe('downloadHtml', () => {
  it('saves the HTML as a file with the given name', async () => {
    const created: Blob[] = []
    URL.createObjectURL = vi.fn((b: Blob) => { created.push(b); return 'blob:x' })
    URL.revokeObjectURL = vi.fn()
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this) })

    downloadHtml('<p>hi</p>', 'Advisor Impact.html')

    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('Advisor Impact.html')
    expect(clicked[0].href).toBe('blob:x')
    expect(created[0].type).toBe('text/html')
    const text = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsText(created[0]) })
    expect(text).toBe('<p>hi</p>')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
  })
})
