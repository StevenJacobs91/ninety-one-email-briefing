import { useRef, useEffect, useCallback, useState } from 'react'
import type { FieldError } from 'react-hook-form'

interface RichTextareaProps {
  label: string
  value: string
  onChange: (html: string) => void
  maxLength?: number
  placeholder?: string
  required?: boolean
  error?: FieldError
  rows?: number
  /** Accent colour from the selected brand theme — used in bold/link HTML output */
  accentColour?: string
}

export function RichTextarea({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  required,
  error,
  rows = 6,
  accentColour = '#fbaa96',
}: RichTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalChange = useRef(false)
  const savedRange = useRef<Range | null>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })

  // Sync external value → contenteditable (only when value changes externally)
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    if (el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, [value])

  const emit = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    isInternalChange.current = true
    onChange(el.innerHTML)
  }, [onChange])

  const handleInput = useCallback(() => emit(), [emit])

  // Detect which formats are active at the cursor for toolbar state
  const updateActiveFormats = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const el = editorRef.current
    if (!el) return
    let node: Node | null = sel.anchorNode
    let bold = false, italic = false, underline = false
    while (node && node !== el) {
      if (node instanceof HTMLElement) {
        const tag = node.tagName.toLowerCase()
        if (tag === 'em' || node.style.fontStyle === 'italic') italic = true
        if (tag === 'u' || node.style.textDecoration?.includes('underline')) underline = true
        // Detect our custom bold span
        if (node.style.fontFamily?.includes('Ninety One Visuelt Medium')) bold = true
      }
      node = node.parentNode
    }
    setActiveFormats({ bold, italic, underline })
  }, [])

  // Save current selection (called before opening link dialog)
  const saveSelection = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
      return true
    }
    return false
  }, [])

  const restoreSelection = useCallback(() => {
    if (!savedRange.current) return
    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    sel.addRange(savedRange.current)
  }, [])

  // ─── Format handlers ────────────────────────────────────────────
  const applyBold = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const text = range.toString()
    if (!text) return

    const span = document.createElement('span')
    span.style.fontFamily = 'Ninety One Visuelt Medium, arial, helvetica, sans-serif'
    span.style.fontWeight = 'normal'
    span.style.color = accentColour
    span.textContent = text
    range.deleteContents()
    range.insertNode(span)

    // Place cursor after inserted node
    const after = document.createRange()
    after.setStartAfter(span)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)
    emit()
  }, [accentColour, emit])

  const applyItalic = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const text = range.toString()
    if (!text) return

    const em = document.createElement('em')
    em.textContent = text
    range.deleteContents()
    range.insertNode(em)

    const after = document.createRange()
    after.setStartAfter(em)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)
    emit()
  }, [emit])

  const applyUnderline = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const text = range.toString()
    if (!text) return

    const u = document.createElement('u')
    u.textContent = text
    range.deleteContents()
    range.insertNode(u)

    const after = document.createRange()
    after.setStartAfter(u)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)
    emit()
  }, [emit])

  const applyLink = useCallback((url: string) => {
    if (!url.trim()) return
    restoreSelection()

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const text = range.toString()
    if (!text) return

    const a = document.createElement('a')
    a.href = url.trim()
    a.style.fontFamily = 'Ninety One Visuelt Medium, arial, helvetica, sans-serif'
    a.style.fontWeight = 'normal'
    a.style.textDecoration = 'underline'
    a.style.color = accentColour
    a.textContent = text
    range.deleteContents()
    range.insertNode(a)

    const after = document.createRange()
    after.setStartAfter(a)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)

    emit()
    setShowLinkDialog(false)
    setLinkUrl('')
    savedRange.current = null
  }, [accentColour, emit, restoreSelection])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); applyBold(); break
        case 'i': e.preventDefault(); applyItalic(); break
        case 'u': e.preventDefault(); applyUnderline(); break
        case 'k':
          e.preventDefault()
          if (saveSelection()) setShowLinkDialog(true)
          break
      }
    }
  }, [applyBold, applyItalic, applyUnderline, saveSelection])

  const textLength = editorRef.current?.textContent?.length ?? value.replace(/<[^>]*>/g, '').length
  const minHeight = `${rows * 1.625}rem`

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border border-b-0 border-gray-300 dark:border-gray-600 rounded-t-md bg-gray-50 dark:bg-gray-800/80">
        {/* Bold */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyBold() }}
          className={`w-8 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors ${
            activeFormats.bold
              ? 'bg-[#134848] text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Bold (Ctrl+B) — wraps selected text in brand span"
        >
          B
        </button>
        {/* Italic */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyItalic() }}
          className={`w-8 h-7 flex items-center justify-center rounded text-sm italic transition-colors ${
            activeFormats.italic
              ? 'bg-[#134848] text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        {/* Underline */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyUnderline() }}
          className={`w-8 h-7 flex items-center justify-center rounded text-sm underline transition-colors ${
            activeFormats.underline
              ? 'bg-[#134848] text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        {/* Divider */}
        <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" aria-hidden="true" />

        {/* Link */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            if (saveSelection()) setShowLinkDialog(true)
          }}
          className="flex items-center gap-1.5 px-2 h-7 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Insert link (Ctrl+K)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          Link
        </button>

        {/* Accent colour swatch */}
        <div className="ml-auto flex items-center gap-1.5 pr-1">
          <span
            className="w-3 h-3 rounded-sm border border-gray-300 dark:border-gray-600 shrink-0"
            style={{ backgroundColor: accentColour }}
            title={`Brand accent colour: ${accentColour}`}
          />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{accentColour}</span>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        data-placeholder={placeholder}
        className={`w-full rounded-b-md border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848] overflow-y-auto leading-relaxed ${
          error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
        } [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400 dark:[&:empty]:before:text-gray-500 [&:empty]:before:pointer-events-none`}
        style={{ minHeight }}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
      />

      {/* Link dialog */}
      {showLinkDialog && (
        <div className="mt-1.5 p-3 border border-[#134848]/30 rounded-md bg-[#134848]/5 dark:bg-[#134848]/10">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Insert link — selected text will become:
            <code className="ml-1 text-[10px] bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
              {`<a href="..." style="color: ${accentColour}; text-decoration: underline;">`}
            </code>
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); applyLink(linkUrl) }
                if (e.key === 'Escape') { setShowLinkDialog(false); setLinkUrl('') }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => applyLink(linkUrl)}
              className="px-3 py-1.5 bg-[#134848] text-white text-xs font-medium rounded-md hover:bg-[#0d3232] transition-colors"
            >
              Insert
            </button>
            <button
              type="button"
              onClick={() => { setShowLinkDialog(false); setLinkUrl('') }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Character count & error */}
      <div className="flex justify-between mt-1">
        {error
          ? <p className="text-xs text-red-600 dark:text-red-400">{error.message}</p>
          : <span />
        }
        {maxLength != null && (
          <p className={`text-xs ${
            textLength > maxLength
              ? 'text-red-600 dark:text-red-400'
              : textLength > maxLength * 0.8
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400'
          }`}>
            {textLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
