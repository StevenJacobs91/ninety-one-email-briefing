// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProgressBar } from '../ProgressBar'

afterEach(cleanup)

const slider = () => screen.getByRole('slider', { name: 'Progress' })

function withWidth(el: HTMLElement, width = 200) {
  el.getBoundingClientRect = () => ({ left: 10, width, right: 10 + width, top: 0, bottom: 0, height: 20, x: 10, y: 0, toJSON: () => ({}) })
}

describe('ProgressBar', () => {
  it('shows the percentage, with the bar filled that far', () => {
    render(<ProgressBar value={70} onChange={() => {}} />)
    expect(screen.getByText('70%')).toBeTruthy()
    expect(slider().getAttribute('aria-valuenow')).toBe('70')
  })

  it('a click sets progress to the nearest ten per cent', () => {
    const onChange = vi.fn()
    render(<ProgressBar value={0} onChange={onChange} />)
    withWidth(slider())
    fireEvent.click(slider(), { clientX: 10 + 148 }) // 74% of the way across
    expect(onChange).toHaveBeenLastCalledWith(70)
    fireEvent.click(slider(), { clientX: 10 + 200 })
    expect(onChange).toHaveBeenLastCalledWith(100)
    fireEvent.click(slider(), { clientX: 10 })
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('the arrow keys, Home and End move it in tens', () => {
    const onChange = vi.fn()
    render(<ProgressBar value={70} onChange={onChange} />)
    fireEvent.keyDown(slider(), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith(80)
    fireEvent.keyDown(slider(), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith(60)
    fireEvent.keyDown(slider(), { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith(0)
    fireEvent.keyDown(slider(), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith(100)
  })

  it('without a way to change it, it is just a bar', () => {
    render(<ProgressBar value={40} />)
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.getByText('40%')).toBeTruthy()
  })
})
