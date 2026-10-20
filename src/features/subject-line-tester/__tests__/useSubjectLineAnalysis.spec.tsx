// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSubjectLineAnalysis } from '../hooks/useSubjectLineAnalysis'
import { deps } from './helpers'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useSubjectLineAnalysis', () => {
  it('analyses the initial subject straight away', () => {
    const { result } = renderHook(() => useSubjectLineAnalysis({ subject: 'Your 50% off gift is waiting' }, deps))
    expect(result.current.result.score).toBe(100)
    expect(result.current.pending).toBe(false)
  })

  it('waits 250 ms after the last keystroke before re-analysing', () => {
    const { result, rerender } = renderHook(({ subject }) => useSubjectLineAnalysis({ subject }, deps), {
      initialProps: { subject: 'Your 50% off gift is waiting' },
    })
    rerender({ subject: 'FREE MONEY!!! Act now' })
    expect(result.current.result.score).toBe(100)
    expect(result.current.pending).toBe(true)
    act(() => { vi.advanceTimersByTime(249) })
    expect(result.current.result.score).toBe(100)
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.result.score).toBe(60)
    expect(result.current.pending).toBe(false)
  })

  it('restarts the wait while the user keeps typing', () => {
    const { result, rerender } = renderHook(({ subject }) => useSubjectLineAnalysis({ subject }, deps), { initialProps: { subject: '' } })
    rerender({ subject: 'Your 50% off' })
    act(() => { vi.advanceTimersByTime(200) })
    rerender({ subject: 'Your 50% off gift' })
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current.result.empty).toBe(true)
    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current.result.empty).toBe(false)
  })

  it('analyzeNow skips the wait', () => {
    const { result, rerender } = renderHook(({ subject }) => useSubjectLineAnalysis({ subject }, deps), { initialProps: { subject: '' } })
    rerender({ subject: 'FREE MONEY!!! Act now' })
    act(() => { result.current.analyzeNow() })
    expect(result.current.result.score).toBe(60)
  })

  it('does not call the network', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderHook(() => useSubjectLineAnalysis({ subject: 'Your 50% off gift is waiting' }, deps))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
