import { useEffect, useRef, useState } from 'react'
import { Annotation, Compartment, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder as placeholderExtension } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { html } from '@codemirror/lang-html'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from '@codemirror/search'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { oneDark } from '@codemirror/theme-one-dark'
import { beautifyHtml } from '../../lib/beautifyHtml'

interface Props {
  value: string
  onChange: (value: string) => void
  /** The accessible name of the editor */
  label: string
  id?: string
  placeholder?: string
  invalid?: boolean
  /** Turns the code into a full HTML document for the live preview beside the code in full screen. Without it there is no preview. */
  previewDoc?: (code: string) => string
}

// Changes made from outside (a new value from the parent) are not reported back as edits.
const external = Annotation.define<boolean>()

const isDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

const BASE_THEME = EditorView.theme({
  '&': { height: '100%', fontSize: '12px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', lineHeight: '1.6', overflow: 'auto' },
})

const TOOL = 'px-2 py-1 text-[11px] font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 aria-pressed:bg-brand-primary/10 aria-pressed:border-brand-primary'

/**
 * An HTML editor for module and header code: highlighting, line numbers, indentation guides, folding, tag
 * auto-closing, find and replace, and a Format button that re-indents the markup.
 */
export default function CodeEditor({ value, onChange, label, id, placeholder, invalid, previewDoc }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const latest = useRef(onChange)
  latest.current = onChange
  const compartments = useRef({ wrap: new Compartment(), theme: new Compartment(), attrs: new Compartment() })
  const [wrap, setWrap] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [position, setPosition] = useState({ line: 1, col: 1 })

  const attributes = (): Record<string, string> => ({ 'aria-label': label, 'aria-multiline': 'true', ...(id ? { id } : {}), ...(invalid ? { 'aria-invalid': 'true' } : {}) })

  useEffect(() => {
    if (!host.current) return
    const { wrap: wrapC, theme, attrs } = compartments.current
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          foldGutter(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          search({ top: true }),
          html({ autoCloseTags: true, matchClosingTags: true }),
          indentationMarkers({ highlightActiveBlock: true, hideFirstIndent: false }),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
          placeholderExtension(placeholder ?? ''),
          BASE_THEME,
          wrapC.of(EditorView.lineWrapping),
          theme.of(isDark() ? oneDark : []),
          attrs.of(EditorView.contentAttributes.of(attributes())),
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !u.transactions.some((t) => t.annotation(external))) latest.current(u.state.doc.toString())
            if (u.selectionSet || u.docChanged) {
              const head = u.state.selection.main.head
              const line = u.state.doc.lineAt(head)
              setPosition({ line: line.number, col: head - line.from + 1 })
            }
          }),
        ],
      }),
    })
    view.current = editor
    // Follow the app's light and dark mode.
    const watcher = new MutationObserver(() => editor.dispatch({ effects: theme.reconfigure(isDark() ? oneDark : []) }))
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => { watcher.disconnect(); editor.destroy(); view.current = null }
    // The editor is made once; later changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A value that changed outside the editor (Format, a reset, another module) replaces the text.
  useEffect(() => {
    const editor = view.current
    if (!editor || editor.state.doc.toString() === value) return
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value }, annotations: external.of(true) })
  }, [value])

  useEffect(() => {
    view.current?.dispatch({ effects: compartments.current.wrap.reconfigure(wrap ? EditorView.lineWrapping : []) })
  }, [wrap])

  useEffect(() => {
    view.current?.dispatch({ effects: compartments.current.attrs.reconfigure(EditorView.contentAttributes.of(attributes())) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalid, label, id])

  const format = () => {
    const editor = view.current
    if (!editor) return
    const source = editor.state.doc.toString()
    const formatted = beautifyHtml(source)
    if (formatted === source) return
    // One change, so a single undo puts the code back as it was.
    editor.dispatch({ changes: { from: 0, to: source.length, insert: formatted } })
    editor.focus()
  }

  const find = () => {
    const editor = view.current
    if (!editor) return
    openSearchPanel(editor)
    editor.focus()
  }

  return (
    <>
      {expanded && <div className="fixed inset-0 z-[55] bg-black/40" aria-hidden="true" onClick={() => setExpanded(false)} />}
      <div
        className={expanded ? 'fixed inset-4 z-[60] flex flex-col bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 shadow-2xl p-3 rounded-lg' : ''}
        onKeyDown={(e) => { if (e.key === 'Escape' && expanded && !e.defaultPrevented) setExpanded(false) }}
      >
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <button type="button" onClick={format} className={TOOL} title="Re-indent the code">Format code</button>
          <button type="button" onClick={find} className={TOOL} title="Find and replace (Ctrl or Cmd + F)">Find &amp; replace</button>
          <button type="button" onClick={() => setWrap((w) => !w)} aria-pressed={wrap} className={TOOL} title="Wrap long lines">Wrap lines</button>
          <button type="button" onClick={() => setExpanded((x) => !x)} aria-pressed={expanded} className={TOOL} title={expanded ? 'Back to the form (Esc)' : 'Make the editor bigger'}>{expanded ? 'Close full screen' : 'Full screen'}</button>
          {expanded && previewDoc && (
            <button type="button" onClick={() => setShowPreview((x) => !x)} aria-pressed={showPreview} className={TOOL} title="Show the code as it will look, beside the editor">{showPreview ? 'Hide preview' : 'Show preview'}</button>
          )}
          <span className="ml-auto text-[11px] tabular-nums text-gray-400 dark:text-gray-500" aria-live="off">Ln {position.line}, Col {position.col}</span>
        </div>
        {/* The code box keeps its place in the tree whether or not the preview is beside it, so the editor is never rebuilt. */}
        <div className={expanded ? 'flex flex-1 min-h-0 gap-3' : ''}>
          <div
            ref={host}
            className={`${expanded ? 'flex-1 min-w-0' : 'h-72'} overflow-hidden rounded-md border bg-white dark:bg-[#282c34] ${invalid ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {expanded && previewDoc && showPreview && (
            <div className="w-[45%] shrink-0 flex flex-col min-h-0">
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Preview</p>
              <iframe
                title="Code preview"
                sandbox=""
                srcDoc={previewDoc(value)}
                className="flex-1 min-h-0 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white"
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
