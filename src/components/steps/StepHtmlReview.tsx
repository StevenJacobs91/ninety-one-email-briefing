import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import type { BriefPayload, HtmlEdit } from '../../types/brief.types'
import { generateEmailHtml, downloadEmailHtml, copyEmailHtmlToClipboard } from '../../lib/emailGenerator'
import { buildEmailName } from '../../lib/emailName'

type ViewportMode = 'desktop' | 'mobile'

export function StepHtmlReview() {
  const { getValues, setValue } = useFormContext<BriefFormData>()
  const data = getValues() as BriefPayload

  const html = useMemo(() => generateEmailHtml(data), [data])
  const emailName = useMemo(
    () => buildEmailName(data.campaign.campaignName, data.audience.region, data.audience.channel),
    [data.campaign.campaignName, data.audience.region, data.audience.channel]
  )
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview')
  const [viewport, setViewport] = useState<ViewportMode>('desktop')
  const [editMode, setEditMode] = useState(false)
  const [htmlEdits, setHtmlEdits] = useState<HtmlEdit[]>(data.htmlEdits ?? [])
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Enable contenteditable on text elements in the iframe
  const enableEditing = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument
    const editableSelectors = 'td, p, h1, h2, h3, h4, span, a, li'
    const elements = doc.querySelectorAll(editableSelectors)
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement
      if (htmlEl.textContent?.trim()) {
        htmlEl.setAttribute('contenteditable', 'true')
        htmlEl.style.outline = 'none'
        htmlEl.style.cursor = 'text'
        htmlEl.addEventListener('focus', () => {
          htmlEl.style.outline = '2px solid #134848'
          htmlEl.style.outlineOffset = '1px'
          htmlEl.style.borderRadius = '2px'
        })
        htmlEl.addEventListener('blur', () => {
          htmlEl.style.outline = 'none'
        })
      }
    })
  }, [])

  const disableEditing = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument
    const elements = doc.querySelectorAll('[contenteditable]')
    elements.forEach((el) => {
      el.removeAttribute('contenteditable')
      ;(el as HTMLElement).style.cursor = ''
      ;(el as HTMLElement).style.outline = 'none'
    })
  }, [])

  // Collect edits from the iframe
  const collectEdits = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return
    const doc = iframe.contentDocument

    // Build a fresh HTML to compare against
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html

    const editableSelectors = 'td, p, h1, h2, h3, h4, span, a, li'
    const currentElements = Array.from(doc.querySelectorAll(editableSelectors))
    const originalElements = Array.from(tempDiv.querySelectorAll(editableSelectors))

    const edits: HtmlEdit[] = []
    currentElements.forEach((el, i) => {
      const original = originalElements[i]
      if (!original) return
      const originalText = original.textContent?.trim() ?? ''
      const newText = el.textContent?.trim() ?? ''
      if (originalText && newText && originalText !== newText) {
        edits.push({
          selector: `${el.tagName.toLowerCase()}:nth(${i})`,
          originalText,
          newText,
        })
      }
    })

    setHtmlEdits(edits)
    setValue('htmlEdits', edits, { shouldValidate: true })
  }, [html, setValue])

  // Toggle edit mode
  useEffect(() => {
    if (editMode && viewMode === 'preview') {
      // Small delay to let iframe load
      const timer = setTimeout(enableEditing, 300)
      return () => clearTimeout(timer)
    } else {
      disableEditing()
    }
  }, [editMode, viewMode, enableEditing, disableEditing])

  const handleDownload = () => {
    downloadEmailHtml(html, data.campaign.campaignName)
  }

  const handleCopy = async () => {
    try {
      await copyEmailHtmlToClipboard(html)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  const handleSubmitBriefAndTemplate = async () => {
    setSubmitStatus('sending')
    try {
      const briefJson = JSON.stringify(data, null, 2)
      const subject = encodeURIComponent(`Email Brief - ${emailName}`)
      const body = encodeURIComponent(
        `Hi Steven,\n\nPlease find the email brief and HTML template attached below.\n\n` +
        `Campaign: ${data.campaign.campaignName}\n` +
        `Email Type: ${data.campaign.emailType}\n` +
        `Theme: ${data.campaign.theme}\n` +
        `Subject Line: ${data.campaign.subjectLine}\n` +
        `Send Date: ${data.deadlines.sendDate}\n` +
        `Urgency: ${data.deadlines.urgency}\n\n` +
        `--- BRIEF JSON ---\n${briefJson}\n\n` +
        `--- HTML TEMPLATE ---\n${html}`
      )

      window.location.href = `mailto:steven.jacobs@ninetyone.com?subject=${subject}&body=${body}`
      setSubmitStatus('sent')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    } catch {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">HTML Email Preview</h2>
      <p className="text-sm text-gray-500 mb-4">
        Review the generated email template below. Download, copy, or submit the HTML when ready.
      </p>

      {/* Controls row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* View mode toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'preview' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setViewMode('source')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'source' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            HTML Source
          </button>
        </div>

        {/* Viewport toggle — only in preview mode */}
        {viewMode === 'preview' && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewport === 'desktop' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewport === 'mobile' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Mobile
            </button>
          </div>
        )}

        {/* Edit mode toggle — only in preview mode */}
        {viewMode === 'preview' && (
          <button
            type="button"
            onClick={() => {
              if (editMode) collectEdits()
              setEditMode(!editMode)
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              editMode
                ? 'bg-[#134848] text-white border-[#134848]'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            {editMode ? 'Save Edits' : 'Edit Content'}
          </button>
        )}

        {/* Edit count badge */}
        {htmlEdits.length > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {htmlEdits.length} edit{htmlEdits.length !== 1 ? 's' : ''} pending
          </span>
        )}
      </div>

      {/* Preview / Source */}
      {viewMode === 'preview' ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6 bg-white dark:bg-gray-900">
          <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400 ml-2">
              Email Preview — {viewport === 'desktop' ? '640px' : '375px'}
              {editMode && ' — Editing enabled'}
            </span>
          </div>
          <div className="flex justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <iframe
              ref={iframeRef}
              srcDoc={html}
              title="Email preview"
              className={`${viewport === 'desktop' ? 'w-[640px]' : 'w-[375px]'} border border-gray-200 dark:border-gray-700 bg-white shadow-sm transition-all duration-300`}
              style={{ height: '800px', maxWidth: '100%' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center gap-2">
            <span className="text-xs text-gray-400">HTML Source</span>
            <span className="text-xs text-gray-500 ml-auto">{html.length.toLocaleString()} chars</span>
          </div>
          <pre className="bg-gray-900 text-green-400 text-xs p-4 overflow-auto max-h-[600px] leading-relaxed">
            <code>{html}</code>
          </pre>
        </div>
      )}

      {/* Inline edits summary */}
      {htmlEdits.length > 0 && (
        <div className="mb-6 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">
            Content Edits ({htmlEdits.length})
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-500 mb-3">
            These edits will be included in the submitted brief for the email producer to apply.
          </p>
          <div className="space-y-2">
            {htmlEdits.map((edit, i) => (
              <div key={i} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border border-amber-100 dark:border-amber-900">
                <p className="text-red-500 line-through">{edit.originalText.slice(0, 100)}{edit.originalText.length > 100 ? '...' : ''}</p>
                <p className="text-green-600 dark:text-green-400 mt-0.5">{edit.newText.slice(0, 100)}{edit.newText.length > 100 ? '...' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 min-w-[140px] bg-[#134848] text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-[#0d3232] transition-colors"
        >
          Download HTML
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 min-w-[140px] border border-[#134848] text-[#134848] py-2.5 px-4 rounded-md text-sm font-medium hover:bg-[#134848]/5 transition-colors"
        >
          {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy HTML'}
        </button>
        <button
          type="button"
          onClick={handleSubmitBriefAndTemplate}
          disabled={submitStatus === 'sending'}
          className="flex-1 min-w-[200px] bg-[#0a3323] text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-[#071f15] transition-colors disabled:opacity-50"
        >
          {submitStatus === 'sending'
            ? 'Opening email...'
            : submitStatus === 'sent'
              ? 'Email client opened!'
              : submitStatus === 'error'
                ? 'Error — try again'
                : 'Submit Brief & Template'}
        </button>
      </div>
    </div>
  )
}
