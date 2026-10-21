import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fitFontSize } from '../../lib/fitText'

interface Props {
  text: string
  /** Largest and smallest font size, in pixels */
  max: number
  min: number
  className?: string
}

/**
 * One line of text that shrinks, down to `min`, until it fits the width it is given. Below `min` it is cut with an
 * ellipsis, with the full text as a tooltip. It re-fits when the text or the width changes, and once web fonts load.
 */
export function FitText({ text, max, min, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLSpanElement>(null)
  const [px, setPx] = useState(max)

  const fit = useCallback(() => {
    const b = box.current
    const l = line.current
    if (!b || !l) return
    // The line is measured at its natural width, so it must not be allowed to shrink to the box while we measure.
    l.style.maxWidth = 'none'
    const next = fitFontSize(max, min, (size) => {
      l.style.fontSize = `${size}px`
      return l.scrollWidth <= b.clientWidth
    })
    l.style.fontSize = `${next}px`
    l.style.maxWidth = ''
    setPx(next)
  }, [max, min])

  useLayoutEffect(() => { fit() }, [fit, text])

  useEffect(() => {
    const b = box.current
    if (!b) return
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null
    ro?.observe(b)
    // The display font loads after first paint and changes the text's width.
    void document.fonts?.ready.then(fit)
    return () => ro?.disconnect()
  }, [fit])

  return (
    <div ref={box} data-fit="box" className="w-full min-w-0">
      <span
        ref={line}
        data-fit="text"
        title={text}
        style={{ fontSize: `${px}px` }}
        className={`block max-w-full overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
      >
        {text}
      </span>
    </div>
  )
}
