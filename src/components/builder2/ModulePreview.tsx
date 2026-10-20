import { useEffect, useRef, useState } from 'react'

const EMAIL_WIDTH = 640

interface Props {
  html: string
  title: string
}

// One module rendered as a complete mini-email so the library's own head
// styles apply. It is laid out at the real 640px width and scaled down to fit.
export function ModulePreview({ html, title }: Props) {
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(80)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / EMAIL_WIDTH))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const measure = () => {
    const doc = frame.current?.contentDocument
    if (doc) setHeight(Math.max(doc.documentElement.scrollHeight, 24))
  }

  return (
    <div ref={box} className="w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
      <div className="mx-auto overflow-hidden" style={{ width: EMAIL_WIDTH * scale, height: height * scale }}>
      <iframe
        ref={frame}
        title={`Preview: ${title}`}
        srcDoc={html}
        onLoad={measure}
        scrolling="no"
        className="block border-0 pointer-events-none"
        style={{ width: EMAIL_WIDTH, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      />
      </div>
    </div>
  )
}
