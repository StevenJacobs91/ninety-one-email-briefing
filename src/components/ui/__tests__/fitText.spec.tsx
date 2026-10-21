// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FitText } from '../FitText'

// jsdom has no layout, so give elements a width: each character is half the font size wide, inside a box of CONTAINER px.
let CONTAINER = 300
const size = (el: HTMLElement) => parseFloat(el.style.fontSize) || 0
const originals = {
  scrollWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth'),
  clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) { return this.dataset.fit === 'text' ? (this.textContent ?? '').length * size(this) * 0.5 : 0 },
  })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) { return this.dataset.fit === 'box' ? CONTAINER : 0 },
  })
})
afterEach(() => {
  cleanup()
  for (const [k, d] of Object.entries(originals)) if (d) Object.defineProperty(HTMLElement.prototype, k, d)
  CONTAINER = 300
})

const text = () => screen.getByText(/./, { selector: '[data-fit="text"]' }) as HTMLElement

describe('FitText', () => {
  it('keeps the largest size when the text fits', () => {
    render(<FitText text="Short" max={32} min={14} />)
    expect(text().style.fontSize).toBe('32px')
  })

  it('reduces the size until a long name fits the width', () => {
    const name = 'x'.repeat(40) // 40 chars * px * 0.5 <= 300  =>  px <= 15
    render(<FitText text={name} max={32} min={12} />)
    expect(text().style.fontSize).toBe('15px')
  })

  it('stops at the minimum and shortens with an ellipsis rather than overflowing', () => {
    render(<FitText text={'y'.repeat(200)} max={32} min={14} />)
    expect(text().style.fontSize).toBe('14px')
    expect(text().className).toMatch(/text-ellipsis|overflow-hidden/)
  })

  it('shows the full text to assistive technology and as a tooltip', () => {
    const name = 'z'.repeat(200)
    render(<FitText text={name} max={32} min={14} />)
    expect(text().title).toBe(name)
  })

  it('adjusts again when the text changes', () => {
    const { rerender } = render(<FitText text="a" max={32} min={12} />)
    expect(text().style.fontSize).toBe('32px')
    rerender(<FitText text={'a'.repeat(30)} max={32} min={12} />) // 30 chars * px * 0.5 <= 300  =>  px <= 20
    expect(text().style.fontSize).toBe('20px')
  })
})
