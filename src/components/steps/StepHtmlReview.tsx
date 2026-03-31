import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import type { BriefPayload, HtmlEdit } from '../../types/brief.types'
import { generateEmailHtml, downloadEmailHtml, copyEmailHtmlToClipboard } from '../../lib/emailGenerator'
import { generateBriefHtml } from '../../lib/generateBriefHtml'
import { generateTextEmail } from '../../lib/generateTextEmail'
import { buildEmailName } from '../../lib/emailName'
import { useSettings } from '../../contexts/SettingsContext'

type ViewportMode = 'desktop' | 'mobile'
type ViewMode = 'preview' | 'source' | 'text'

interface StepHtmlReviewProps {
  onComplete?: () => void
}

export function StepHtmlReview({ onComplete }: StepHtmlReviewProps) {
  const { getValues, setValue } = useFormContext<BriefFormData>()
  const { settings } = useSettings()
  const data = getValues() as BriefPayload

  const html = useMemo(() => generateEmailHtml(data), [data])
  const textEmail = useMemo(() => generateTextEmail(data), [data])
  const emailName = useMemo(
    () => buildEmailName(data.campaign.campaignName, data.audience.region, data.audience.channel),
    [data.campaign.campaignName, data.audience.region, data.audience.channel]
  )
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testRecipient, setTestRecipient] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
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

  const handleSendTestEmail = async () => {
    const recipient = testRecipient.trim()
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      setTestError('Enter a valid email address.')
      return
    }
    setTestError('')
    setTestStatus('sending')
    const webhookUrl = settings.n8nWebhookUrl?.trim()

    try {
      if (webhookUrl) {
        const payload = {
          isTest: true,
          testRecipient: recipient,
          brief: data,
          html,
          subject: data.campaign.subjectLine || `[TEST] ${emailName}`,
          emailName,
          sentAt: new Date().toISOString(),
        }
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error(`Webhook returned ${response.status}`)
        setTestStatus('sent')
        setTimeout(() => setTestStatus('idle'), 4000)
      } else {
        // Fallback: open mailto with the recipient pre-filled
        const subject = encodeURIComponent(`[TEST] ${data.campaign.subjectLine || emailName}`)
        const body = encodeURIComponent(
          `This is a test send of the following email brief.\n\n` +
          `Campaign: ${data.campaign.campaignName}\n` +
          `Subject: ${data.campaign.subjectLine}\n\n` +
          `Note: No n8n webhook is configured. Copy the HTML from the platform and paste it into your ESP to send a proper test.`
        )
        window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`
        setTestStatus('sent')
        setTimeout(() => setTestStatus('idle'), 4000)
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Send failed — check your n8n webhook configuration.')
      setTestStatus('error')
      setTimeout(() => { setTestStatus('idle'); setTestError('') }, 4000)
    }
  }

  const handleSubmitBriefAndTemplate = async () => {
    setSubmitStatus('sending')
    const webhookUrl = settings.n8nWebhookUrl?.trim()

    try {
      if (webhookUrl) {
        // POST directly to n8n webhook
        const payload = {
          brief: data,
          html,
          briefHtml: generateBriefHtml(data),
          textEmail: generateTextEmail(data),
          emailName,
          submittedAt: new Date().toISOString(),
        }
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error(`Webhook returned ${response.status}`)
      } else {
        // Fallback: download both files + open mailto
        const slugName = data.campaign.campaignName.replace(/\s+/g, '-').toLowerCase()
        const dateStr = new Date().toISOString().slice(0, 10)

        const briefHtmlContent = generateBriefHtml(data)
        const briefBlob = new Blob([briefHtmlContent], { type: 'text/html' })
        const briefLink = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(briefBlob),
          download: `brief-${slugName}-${dateStr}.html`,
        })
        briefLink.click()
        URL.revokeObjectURL(briefLink.href)

        const htmlBlob = new Blob([html], { type: 'text/html' })
        const htmlLink = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(htmlBlob),
          download: `email-${slugName}-${dateStr}.html`,
        })
        htmlLink.click()
        URL.revokeObjectURL(htmlLink.href)

        const subject = encodeURIComponent(`Email Brief - ${emailName}`)
        const body = encodeURIComponent(
          `Hi Steven,\n\n` +
          `Please find the email brief JSON and HTML template attached (downloaded to your computer).\n\n` +
          `Campaign: ${data.campaign.campaignName}\n` +
          `Email Type: ${data.campaign.emailType}\n` +
          `Theme: ${data.campaign.theme}\n` +
          `Subject Line: ${data.campaign.subjectLine}\n` +
          `Send Date: ${data.deadlines.sendDate}\n` +
          `Urgency: ${data.deadlines.urgency}\n\n` +
          `Please attach the two downloaded files to this email before sending.`
        )
        window.location.href = `mailto:steven.jacobs@ninetyone.com?subject=${subject}&body=${body}`
      }

      setSubmitStatus('sent')
      onComplete?.()
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } catch {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">HTML Email Preview</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Review the generated email template below. Download, copy, or submit the HTML when ready.
      </p>

      {/* Controls row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* View mode toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          {(['preview', 'source', 'text'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === mode ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {mode === 'preview' ? 'Preview' : mode === 'source' ? 'HTML Source' : 'Plain Text'}
            </button>
          ))}
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
                ? 'bg-brand-primary text-white border-brand-primary'
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
              className={`${viewport === 'desktop' ? 'w-[640px]' : 'w-[375px]'} min-h-[700px] border border-gray-200 dark:border-gray-700 bg-white shadow-sm transition-all duration-300`}
              style={{ height: 'calc(100vh - 300px)', maxWidth: '100%' }}
              sandbox="allow-same-origin"
              onLoad={(e) => {
                const iframe = e.currentTarget
                try {
                  const body = iframe.contentDocument?.body
                  if (body) {
                    const h = body.scrollHeight
                    if (h > 100) iframe.style.height = `${h + 32}px`
                  }
                } catch { /* cross-origin guard */ }
              }}
            />
          </div>
        </div>
      ) : viewMode === 'source' ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center gap-2">
            <span className="text-xs text-gray-400">HTML Source</span>
            <span className="text-xs text-gray-500 ml-auto">{html.length.toLocaleString()} chars</span>
          </div>
          <pre className="bg-gray-900 text-green-400 text-xs p-4 overflow-auto max-h-[600px] leading-relaxed">
            <code>{html}</code>
          </pre>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-800 px-3 py-2 border-b border-gray-700 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">Plain Text Version</span>
            <span className="text-xs text-gray-500">{textEmail.length.toLocaleString()} chars</span>
          </div>
          <pre className="bg-gray-900 text-gray-300 text-xs p-4 overflow-auto max-h-[600px] leading-relaxed whitespace-pre-wrap font-mono">
            {textEmail}
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

      {/* Utility actions — secondary */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Save or copy the HTML template:</p>
      <div className="flex gap-3 flex-wrap mb-4">
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 min-w-[130px] border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Download HTML
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 min-w-[130px] border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy HTML'}
        </button>
      </div>

      {/* Send Test Email */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Send Test Email</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {settings.n8nWebhookUrl?.trim()
            ? 'Sends the rendered HTML to the specified address via your n8n workflow.'
            : 'No n8n webhook configured — will open your email client with a pre-filled message.'}
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testRecipient}
            onChange={(e) => { setTestRecipient(e.target.value); setTestError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSendTestEmail()}
            placeholder="recipient@example.com"
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={testStatus === 'sending' || !testRecipient.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors disabled:opacity-40 shrink-0"
          >
            {testStatus === 'sending' ? 'Sending…' : testStatus === 'sent' ? 'Sent!' : 'Send Test'}
          </button>
        </div>
        {testError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{testError}</p>
        )}
        {testStatus === 'sent' && !testError && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            {settings.n8nWebhookUrl?.trim()
              ? `Test email dispatched to ${testRecipient} via n8n.`
              : 'Email client opened — attach the HTML file before sending.'}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-800 mb-4" />

      {/* Primary submission action */}
      <button
        type="button"
        onClick={handleSubmitBriefAndTemplate}
        disabled={submitStatus === 'sending'}
        className="w-full bg-brand-secondary text-white py-3 px-4 rounded-md text-sm font-semibold hover:bg-brand-secondary-hover transition-colors disabled:opacity-50"
      >
        {submitStatus === 'sending'
          ? 'Opening email client…'
          : submitStatus === 'sent'
            ? 'Files downloaded — attach to email before sending'
            : submitStatus === 'error'
              ? 'Error — try again'
              : 'Submit Brief & Template'}
      </button>
      {submitStatus !== 'sent' && submitStatus !== 'error' && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          {settings.n8nWebhookUrl?.trim()
            ? 'Sends brief JSON and HTML directly to your n8n workflow'
            : 'Downloads both files and opens your email client with a pre-filled message'}
        </p>
      )}
    </div>
  )
}
