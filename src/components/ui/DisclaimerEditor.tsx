import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

const SIZES = [9, 10, 11, 12, 14, 16]
const SAFE_URL = /^(https?:\/\/|mailto:|\/|#|\{\{)/i

const BUTTON = 'w-8 h-8 flex items-center justify-center rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

/**
 * A small rich-text editor for legal wording: bold, italic, underline, links and text size. The browser
 * applies the formatting to the selection; the result is cleaned again before it goes into an email.
 */
export function DisclaimerEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const internal = useRef(false)
  const saved = useRef<Range | null>(null)
  const [linking, setLinking] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (internal.current) { internal.current = false; return }
    if (el.innerHTML !== value) el.innerHTML = value
  }, [value])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    internal.current = true
    onChange(el.innerHTML)
  }, [onChange])

  const remember = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange()
  }
  const restore = () => {
    const sel = window.getSelection()
    if (!sel || !saved.current) return
    sel.removeAllRanges()
    sel.addRange(saved.current)
  }

  const run = (command: string, arg?: string) => {
    ref.current?.focus()
    restore()
    document.execCommand(command, false, arg)
    emit()
  }

  const setSize = (px: number) => {
    ref.current?.focus()
    restore()
    document.execCommand('fontSize', false, '7')
    // The browser marks the text with <font size="7">; make it a real pixel size.
    for (const font of Array.from(ref.current?.querySelectorAll('font[size="7"]') ?? [])) {
      const span = document.createElement('span')
      span.style.fontSize = `${px}px`
      span.innerHTML = font.innerHTML
      font.replaceWith(span)
    }
    emit()
  }

  const applyLink = () => {
    const address = url.trim()
    if (!SAFE_URL.test(address)) return
    run('createLink', address)
    setLinking(false)
    setUrl('')
  }

  const keepSelection = (e: React.MouseEvent) => { remember(); e.preventDefault() }

  return (
    <div className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-brand-primary/30">
      <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-gray-200 dark:border-gray-700">
        <button type="button" aria-label="Bold" title="Bold" onMouseDown={keepSelection} onClick={() => run('bold')} className={`${BUTTON} font-bold`}>B</button>
        <button type="button" aria-label="Italic" title="Italic" onMouseDown={keepSelection} onClick={() => run('italic')} className={`${BUTTON} italic`}>I</button>
        <button type="button" aria-label="Underline" title="Underline" onMouseDown={keepSelection} onClick={() => run('underline')} className={`${BUTTON} underline`}>U</button>
        <button type="button" aria-label="Link" title="Link" onMouseDown={keepSelection} onClick={() => setLinking((v) => !v)} className={BUTTON}>🔗</button>
        <select
          aria-label="Text size"
          value=""
          onMouseDown={remember}
          onChange={(e) => { if (e.target.value) setSize(Number(e.target.value)) }}
          className="ml-1 h-8 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 px-1"
        >
          <option value="">Size</option>
          {SIZES.map((px) => <option key={px} value={px}>{px} px</option>)}
        </select>
        <button type="button" aria-label="Clear formatting" title="Clear formatting" onMouseDown={keepSelection} onClick={() => run('removeFormat')} className={`${BUTTON} text-xs`}>Tx</button>
      </div>
      {linking && (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700">
          <input
            aria-label="Link address"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 dark:text-gray-100 px-2 py-1 text-xs"
          />
          <button type="button" onClick={applyLink} className="text-xs px-2 py-1 bg-brand-primary text-white rounded">Apply link</button>
          <button type="button" onClick={() => run('unlink')} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700">Remove link</button>
        </div>
      )}
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Disclaimer text"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={remember}
        className="min-h-[8rem] max-h-80 overflow-y-auto px-3 py-2 text-sm leading-relaxed text-gray-800 dark:text-gray-100 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />
    </div>
  )
}
