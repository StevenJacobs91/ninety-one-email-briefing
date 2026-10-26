import { memo, useEffect, useMemo, useRef, useState } from 'react'

import { selfHostFonts } from '../../lib/previewFonts'

/** The two widths an email is checked at: the library's own media queries switch the layout at the narrow one. */
export const DESKTOP_WIDTH = 640
export const MOBILE_WIDTH = 375

interface Props {
  html: string
  title: string
  /** The width the email is laid out at before being scaled to fit */
  width?: number
}

// One module rendered as a complete mini-email so the library's own head
// styles apply. It is laid out at the real email width (640px, or 375px for the mobile check) and scaled down to fit.
export const ModulePreview = memo(function ModulePreview({ html, title, width = DESKTOP_WIDTH }: Props) {
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(80)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / width))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  // The library's own dark-mode rules follow the app's theme; the builder shows the light email.
  // The email's fonts are loaded from the app's own copies here, as the Pardot host blocks browsers (see previewFonts.ts).
  // Worked out once for each HTML, not on every redraw: it is a long string, and a changed srcDoc reloads the frame.
  const lightHtml = useMemo(
    () => selfHostFonts(html.replace(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/gi, '@media not all'), window.location.origin),
    [html],
  )

  const measure = () => {
    const doc = frame.current?.contentDocument
    if (doc) setHeight(Math.max(doc.documentElement.scrollHeight, 24))
  }

  // The email reflows at a new width, so its height is measured again once it has.
  useEffect(() => {
    const timer = window.setTimeout(measure, 60)
    return () => window.clearTimeout(timer)
  }, [width])

  return (
    <div ref={box} className="w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
      <div className="mx-auto overflow-hidden" style={{ width: width * scale, height: height * scale }}>
      <iframe
        ref={frame}
        title={`Preview: ${title}`}
        srcDoc={lightHtml}
        onLoad={measure}
        scrolling="no"
        className="block border-0 pointer-events-none"
        style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left', colorScheme: 'light' }}
      />
      </div>
    </div>
  )
})
