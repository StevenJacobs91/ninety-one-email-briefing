import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import type { BriefPayload, HtmlEdit } from '../../types/brief.types'
import { isShown } from '../../lib/uiVisibility'
import { useCatalogue } from '../builder2/useCatalogue'
import type { ThemeCatalogue } from '../../lib/moduleEngine/catalogue'
import { generateEmailHtml, downloadEmailHtml, copyEmailHtmlToClipboard } from '../../lib/emailGenerator'
import { generateBriefHtml } from '../../lib/generateBriefHtml'
import { generateTextEmail } from '../../lib/generateTextEmail'
import { buildEmailName } from '../../lib/emailName'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { useKanban } from '../../contexts/KanbanContext'
import { useAuditLog } from '../../hooks/useAuditLog'
import { saveBrief } from '../../lib/supabaseQueries'
import { collectAttachments } from '../../lib/attachmentStore'
import { DRAFT_RECIPIENT, boardLinks, boardNotes, buildEml, submissionBriefId, submissionFiles, slug, textToBase64, type DraftAttachment } from '../../lib/submissionDraft'
import { submitBriefToPardot } from '../../lib/pardotApi'
import type { PardotSubmitResult } from '../../lib/pardotApi'
import {
  triggerTestEmail, isTestEmailFlowReady,
  triggerBriefSubmission, isBriefSubmissionFlowReady,
} from '../../lib/powerAutomateService'

type ViewportMode = 'desktop' | 'mobile'
type ViewMode = 'preview' | 'source' | 'text'

interface StepHtmlReviewProps {
  onComplete?: () => void
  /** Brand Review gate: disables both submit buttons and shows the reason. */
  blocked?: boolean
  blockReason?: string | null
}

// Briefs built in the library builder need that theme's catalogue before the
// email can be rendered; older briefs render straight away.
export function StepHtmlReview(props: StepHtmlReviewProps) {
  const { getValues } = useFormContext<BriefFormData>()
  const values = getValues()
  const needsCatalogue = !!values.content.build
  const cat = useCatalogue(values.campaign.theme)

  if (needsCatalogue && cat.status === 'loading') return <p className="text-sm text-gray-500">Loading the module library…</p>
  if (needsCatalogue && cat.status === 'error') {
    return (
      <div role="alert" className="border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
        {cat.message}{' '}
        <button type="button" onClick={cat.retry} className="underline font-medium">Retry</button>
      </div>
    )
  }
  return <StepHtmlReviewInner {...props} catalogue={cat.status === 'ready' ? cat.catalogue : undefined} />
}

function StepHtmlReviewInner({ onComplete, blocked = false, blockReason = null, catalogue }: StepHtmlReviewProps & { catalogue?: ThemeCatalogue }) {
  const { getValues, setValue } = useFormContext<BriefFormData>()
  const { settings } = useSettings()
  const show = (key: Parameters<typeof isShown>[1]) => isShown(settings.formDefaults, key)
  const data = getValues() as BriefPayload

  const html = useMemo(() => generateEmailHtml(data, settings, { catalogue }), [data, settings, catalogue])
  const textEmail = useMemo(() => generateTextEmail(data), [data])
  const emailName = useMemo(
    () => buildEmailName(data.campaign.campaignName, data.audience.region, data.audience.channel, data.campaign.emailDescription),
    [data.campaign.campaignName, data.audience.region, data.audience.channel, data.campaign.emailDescription]
  )
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')
  const [submitNotes, setSubmitNotes] = useState<{ ok: boolean; text: string }[]>([])
  const { profile, user } = useAuth()
  const { addCard, cards } = useKanban()
  const { log: audit } = useAuditLog()
  const [pardotStatus, setPardotStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [pardotResult, setPardotResult] = useState<PardotSubmitResult | null>(null)
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

    try {
      if (isTestEmailFlowReady(settings.powerAutomate)) {
        const result = await triggerTestEmail(settings.powerAutomate, {
          recipient,
          subject: data.campaign.subjectLine || `[TEST] ${emailName}`,
          html,
          emailName,
        })
        // The flow's own refusal (status and body) reaches the user, not a bare "failed".
        if (!result.ok) throw new Error(result.error)
        setTestStatus('sent')
        setTimeout(() => setTestStatus('idle'), 4000)
      } else {
        // Fallback: open mailto with the recipient pre-filled
        const subject = encodeURIComponent(`[TEST] ${data.campaign.subjectLine || emailName}`)
        const body = encodeURIComponent(
          `This is a test send of the following email brief.\n\n` +
          `Campaign: ${data.campaign.campaignName}\n` +
          `Subject: ${data.campaign.subjectLine}\n\n` +
          `Note: No Power Automate test-email flow is configured. Copy the HTML from the platform and paste it into your ESP to send a proper test.`
        )
        window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`
        setTestStatus('sent')
        setTimeout(() => setTestStatus('idle'), 4000)
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Send failed — check the Test Email flow in Settings → Power Automate.')
      setTestStatus('error')
      setTimeout(() => { setTestStatus('idle'); setTestError('') }, 4000)
    }
  }

  const handleSubmitToPardot = async () => {
    setPardotStatus('sending')
    setPardotResult(null)
    try {
      const result = await submitBriefToPardot(settings.pardot, data, html, textEmail, emailName)
      if (result.success) {
        setPardotStatus('sent')
        setPardotResult(result)
        setTimeout(() => { setPardotStatus('idle'); setPardotResult(null) }, 8000)
      } else {
        setPardotStatus('error')
        setPardotResult(result)
        setTimeout(() => { setPardotStatus('idle'); setPardotResult(null) }, 6000)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPardotStatus('error')
      setPardotResult({ success: false, error: 'Unexpected error', details: message })
      setTimeout(() => { setPardotStatus('idle'); setPardotResult(null) }, 6000)
    }
  }

  // One click does two things at once: drafts the email to the producer with the
  // files attached, and puts the brief on the Campaign Board in Briefed.
  const handleSubmitBriefAndTemplate = async () => {
    setSubmitStatus('sending')
    setSubmitError('')
    setSubmitNotes([])

    const now = new Date()
    const briefId = submissionBriefId(data.meta.briefId, new Set(cards.map((c) => c.briefId)))
    const briefHtml = generateBriefHtml({ ...data, meta: { ...data.meta, briefId } })
    const names = submissionFiles(data.campaign.campaignName, now.toISOString().slice(0, 10))
    const links = boardLinks(window.location.origin, briefId)
    const createdByName = profile?.displayName || user?.email || 'Unknown'
    const submitted: BriefPayload = { ...data, meta: { ...data.meta, briefId, status: 'submitted', updatedAt: now.toISOString() } }

    const addToBoard = async (): Promise<string[]> => {
      const warnings: string[] = []
      if (profile?.teamId && user) {
        // The board links open the saved brief, so it has to be saved first.
        await saveBrief(profile.teamId, user.id, submitted)
      } else {
        warnings.push('The brief could not be saved, so the board links will not open.')
      }
      addCard(submitted as BriefFormData, {
        notes: boardNotes({ createdByName, createdByEmail: user?.email ?? '', links, at: now }),
      })
      audit({
        action: 'Submitted brief to board',
        category: 'brief',
        entityType: 'brief',
        entityId: briefId,
        details: { campaignName: data.campaign.campaignName, emailType: data.campaign.emailType },
      })
      return warnings
    }

    const createDraft = async (): Promise<string[]> => {
      const warnings: string[] = []
      const { found, missing } = await collectAttachments(data.assets.attachments ?? [])
      if (missing.length > 0) {
        warnings.push(`${missing.length} attachment${missing.length > 1 ? 's were' : ' was'} not attached because the page was reloaded after adding ${missing.length > 1 ? 'them' : 'it'}: ${missing.join(', ')}. Add ${missing.length > 1 ? 'them' : 'it'} again on the Campaign tab.`)
      }
      const attachments: DraftAttachment[] = [
        { name: names.email, type: 'text/html', base64: textToBase64(html) },
        { name: names.summary, type: 'text/html', base64: textToBase64(briefHtml) },
        ...found,
      ]

      if (isBriefSubmissionFlowReady(settings.powerAutomate)) {
        const result = await triggerBriefSubmission(settings.powerAutomate, submitted, {
          html,
          briefHtml,
          textEmail: generateTextEmail(data),
          emailName,
          submittedBy: createdByName,
          draftTo: DRAFT_RECIPIENT,
          draftSubject: emailName,
          attachments,
        })
        if (!result.ok) throw new Error(result.error)
        warnings.unshift(`Draft email to ${DRAFT_RECIPIENT} sent to your Power Automate flow with ${attachments.length} attachment${attachments.length > 1 ? 's' : ''}.`)
      } else {
        // No flow configured: an unsent draft (.eml) with everything attached.
        const body =
          `Hi Steven,\n\nA new email brief has been submitted: ${emailName}\n\n` +
          `Campaign: ${data.campaign.campaignName}\nEmail type: ${data.campaign.emailType}\n` +
          `Subject line: ${data.campaign.subjectLine}\nSend date: ${data.deadlines.sendDate}\n` +
          `Urgency: ${data.deadlines.urgency}\nSubmitted by: ${createdByName}\n\n` +
          `Email HTML: ${links.html}\nBrief summary: ${links.summary}\n`
        const eml = buildEml({ to: DRAFT_RECIPIENT, subject: emailName, body, attachments })
        const a = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(new Blob([eml], { type: 'message/rfc822' })),
          download: `draft-${slug(data.campaign.campaignName)}.eml`,
        })
        a.click()
        URL.revokeObjectURL(a.href)
        warnings.unshift(`No Power Automate flow is set up, so a draft email file was downloaded. Open it to review and send to ${DRAFT_RECIPIENT}.`)
      }
      return warnings
    }

    const [board, draft] = await Promise.allSettled([addToBoard(), createDraft()])
    const notes: { ok: boolean; text: string }[] = []
    if (board.status === 'fulfilled') {
      notes.push({ ok: true, text: 'Added to the Campaign Board in Briefed, with links to the email HTML and brief summary.' })
      board.value.forEach((w) => notes.push({ ok: false, text: w }))
    } else {
      notes.push({ ok: false, text: `The board card was not added: ${board.reason instanceof Error ? board.reason.message : String(board.reason)}` })
    }
    if (draft.status === 'fulfilled') {
      const [first, ...rest] = draft.value
      notes.push({ ok: true, text: first })
      rest.forEach((w) => notes.push({ ok: false, text: w }))
    } else {
      notes.push({ ok: false, text: `The draft email was not created: ${draft.reason instanceof Error ? draft.reason.message : String(draft.reason)}` })
    }
    setSubmitNotes(notes)

    if (board.status === 'fulfilled' && draft.status === 'fulfilled') {
      setSubmitStatus('sent')
      onComplete?.()
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } else {
      console.error('Brief submission incomplete:', board, draft)
      setSubmitError('Part of the submission did not complete. See below.')
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  return (
    <div>
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-1">HTML Email Preview</h2>
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
        {show('showCopyHtml') && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 min-w-[130px] border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy HTML'}
          </button>
        )}
      </div>

      {/* Send Test Email */}
      {show('showSendTestEmail') && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Send Test Email</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {isTestEmailFlowReady(settings.powerAutomate)
              ? 'Sends the rendered HTML to the specified address via your Power Automate flow.'
              : 'No Power Automate test-email flow configured — will open your email client with a pre-filled message.'}
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
              {isTestEmailFlowReady(settings.powerAutomate)
                ? `Test email dispatched to ${testRecipient} via Power Automate.`
                : 'Email client opened — attach the HTML file before sending.'}
            </p>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100 dark:border-gray-800 mb-4" />

      {/* Primary submission actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {blocked && blockReason && (
          <p role="alert" className="text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-2">
            <span className="font-bold">Submission blocked: </span>{blockReason}
          </p>
        )}

        {/* Submit to Pardot */}
        {show('showSubmitToPardot') && (
          <div>
            <button
              type="button"
              onClick={handleSubmitToPardot}
              disabled={blocked || pardotStatus === 'sending'}
              className="w-full bg-brand-primary text-white py-3 px-4 rounded-md text-sm font-semibold hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
            >
              {pardotStatus === 'sending'
                ? 'Sending to Pardot…'
                : pardotStatus === 'sent'
                  ? '✓ Sent to Pardot'
                  : pardotStatus === 'error'
                    ? 'Pardot Error — try again'
                    : 'Submit to Pardot'}
            </button>
            {pardotStatus === 'sent' && pardotResult?.emailId && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
                Draft created in Pardot — ID: {pardotResult.emailId}
              </p>
            )}
            {pardotStatus === 'sent' && !pardotResult?.emailId && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center">
                {pardotResult?.emailName ?? 'Draft'} created in Pardot
              </p>
            )}
            {pardotStatus === 'error' && pardotResult && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                {pardotResult.error}{pardotResult.details ? ` — ${pardotResult.details.slice(0, 80)}` : ''}
              </p>
            )}
            {pardotStatus === 'idle' && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                {settings.pardot?.useMockData
                  ? 'Mock mode — no real API call'
                  : settings.pardot?.apiProxyUrl?.trim()
                    ? 'Creates a draft in Pardot Account Engagement'
                    : 'Configure Pardot in Settings to enable'}
              </p>
            )}
          </div>
        )}

        {/* Submit Brief & Template */}
        <div>
          <button
            type="button"
            onClick={handleSubmitBriefAndTemplate}
            disabled={blocked || submitStatus === 'sending'}
            className="w-full bg-brand-secondary text-white py-3 px-4 rounded-md text-sm font-semibold hover:bg-brand-secondary-hover transition-colors disabled:opacity-50"
          >
            {submitStatus === 'sending'
              ? 'Submitting…'
              : submitStatus === 'sent'
                ? '✓ Brief submitted'
                : submitStatus === 'error'
                  ? 'Error — try again'
                  : 'Submit Brief & Template'}
          </button>
          {submitStatus === 'idle' && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
              Drafts an email to {DRAFT_RECIPIENT} with the email HTML, brief summary and attachments, and adds the brief to the Campaign Board.
            </p>
          )}
          {submitError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">{submitError}</p>
          )}
          {submitNotes.length > 0 && (
            <ul className="mt-2 space-y-1" aria-live="polite">
              {submitNotes.map((n, i) => (
                <li key={i} className={`text-xs ${n.ok ? 'text-green-600 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {n.ok ? '✓ ' : '! '}{n.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
