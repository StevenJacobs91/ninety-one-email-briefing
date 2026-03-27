import { useRef, useEffect, useCallback } from 'react'
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
}: RichTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  // Track whether we are the source of the last update to avoid cursor reset
  const isInternalChange = useRef(false)

  // Sync external value into contenteditable only on mount or external change
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    // Only update if content differs to avoid cursor jump
    if (el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, [value])

  const handleInput = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    isInternalChange.current = true
    onChange(el.innerHTML)
  }, [onChange])

  const handleBold = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return

    // Check if selection is already in a bold span
    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    if (!selectedText) return

    // Use execCommand for simplicity, then replace <b>/<strong> with our custom span
    document.execCommand('bold', false)

    // Now walk the editor and replace <b> / <strong> tags with our custom span
    const el = editorRef.current
    if (!el) return

    // Replace <b> tags with our custom span
    el.querySelectorAll('b, strong').forEach((node) => {
      const span = document.createElement('span')
      span.style.fontFamily = 'Ninety One Visuelt Medium, arial, helvetica, sans-serif'
      span.style.fontWeight = 'normal'
      span.style.color = 'inherit'
      span.innerHTML = node.innerHTML
      node.replaceWith(span)
    })

    isInternalChange.current = true
    onChange(el.innerHTML)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      handleBold()
    }
  }, [handleBold])

  // Compute text-only character count
  const textLength = editorRef.current?.textContent?.length ?? value.replace(/<[^>]*>/g, '').length

  const minHeight = `${rows * 1.625}rem`

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-1 px-2 py-1 border border-b-0 border-gray-300 dark:border-gray-600 rounded-t-md bg-gray-50 dark:bg-gray-800">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault() // prevent blur before bold
            handleBold()
          }}
          className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Bold (Ctrl+B) — wraps text in Ninety One Visuelt Medium span"
        >
          B
        </button>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
          Bold wraps text in brand font span
        </span>
      </div>

      {/* Contenteditable editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={`w-full rounded-b-md border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848] overflow-y-auto ${
          error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
        } [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400 dark:[&:empty]:before:text-gray-500 [&:empty]:before:pointer-events-none`}
        style={{ minHeight }}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
      />

      <div className="flex justify-between mt-1">
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error.message}</p>}
        {maxLength != null && (
          <p className={`text-xs ml-auto ${
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
