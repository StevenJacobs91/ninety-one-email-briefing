import { useState } from 'react'
import type { ParseDoc } from '../../lib/moduleEngine/regions'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuditLog } from '../../hooks/useAuditLog'
import { fetchBriefById } from '../../lib/supabaseQueries'
import { downloadHtml } from '../../lib/downloadHtml'
import { buildEmailName } from '../../lib/emailName'
import { submissionFiles, textToBase64 } from '../../lib/submissionDraft'
import { isChecklistFlowReady, isTestEmailFlowReady, triggerChecklistSend, triggerTestEmail } from '../../lib/powerAutomateService'
import { mergePowerAutomate } from '../../lib/settingsDefaults'
import {
  buildChecklist, canSeeChecklist, checklistFileName, checklistHtml, checklistRecipients, checklistSettings, checklistSubject,
} from '../../lib/preSendChecklist'
import type { CardEmail } from './useCardEmail'

const browserParse: ParseDoc = (html) => new DOMParser().parseFromString(html, 'text/html')

type Status = { kind: 'idle' } | { kind: 'sending'; what: 'proof' | 'checklist' } | { kind: 'done'; message: string } | { kind: 'error'; message: string }

const PRIMARY = 'w-full flex items-center justify-center bg-brand-primary text-white text-xs font-medium px-3 py-2.5 rounded-lg hover:bg-[#0d3232] transition-colors disabled:opacity-60'
const SECONDARY = 'w-full flex items-center justify-center border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'

/**
 * The pre-send checklist in a card's drawer: Send me a Proof sends the email itself, as Send Test Email does, to whoever is
 * signed in; Send Checklist emails the checklist, with the email's HTML attached, to the recipients chosen in Settings; and
 * Download Checklist saves it as a file to copy into an email. It is made from the card's saved brief and the email the
 * drawer already built from it. Only the roles chosen in Settings see it.
 */
export function CardChecklist({ briefId, email }: { briefId: string; email: CardEmail }) {
  const { profile, user } = useAuth()
  const { settings } = useSettings()
  const { log: audit } = useAuditLog()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  if (!canSeeChecklist(settings, profile)) return null

  const recipients = checklistRecipients(settings)

  // The saved brief, read again so the checklist matches what is on the card now, with the email built from it.
  async function loadBrief() {
    if (email.status !== 'ready') throw new Error(email.status === 'loading' || email.status === 'loading-library' ? 'The email is still loading. Try again in a moment.' : 'This card has no email to check.')
    const brief = await fetchBriefById(briefId)
    if (!brief) throw new Error('The brief for this card could not be found.')
    return { brief, emailHtml: email.html }
  }

  async function build() {
    const { brief, emailHtml } = await loadBrief()
    return { brief, emailHtml, model: buildChecklist({ brief, emailHtml, settings, parse: browserParse }) }
  }

  const nameOf = (brief: Awaited<ReturnType<typeof loadBrief>>['brief']) =>
    buildEmailName(brief.campaign.campaignName, brief.audience?.region ?? [], brief.audience?.channel ?? [], brief.campaign.emailDescription)

  // The same send as Send Test Email on the Review page, but to the person who clicked, so a proof is one click away.
  async function sendProof() {
    const to = user?.email
    if (!to) { setStatus({ kind: 'error', message: 'Your account has no email address to send the proof to.' }); return }
    const pa = mergePowerAutomate(settings.powerAutomate)
    if (!isTestEmailFlowReady(pa)) { setStatus({ kind: 'error', message: 'The Test Email flow is not set up. Switch on Power Automate and add the Test Email flow in Settings → Power Automate.' }); return }
    try {
      setStatus({ kind: 'sending', what: 'proof' })
      const { brief, emailHtml } = await loadBrief()
      const emailName = nameOf(brief)
      const result = await triggerTestEmail(pa, { recipient: to, subject: brief.campaign.subjectLine || `[TEST] ${emailName}`, html: emailHtml, emailName })
      if (!result.ok) { setStatus({ kind: 'error', message: result.error }); return }
      audit({ action: 'Sent proof email', category: 'brief', entityType: 'brief', entityId: brief.meta.briefId, details: { emailName, recipient: to } })
      setStatus({ kind: 'done', message: `Proof sent to ${to}.` })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'The proof could not be sent.' })
    }
  }

  async function download() {
    try {
      const built = await build()
      downloadHtml(checklistHtml(built.model), checklistFileName(built.model))
      setStatus({ kind: 'done', message: 'Checklist downloaded.' })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'The checklist could not be made.' })
    }
  }

  async function send() {
    const pa = mergePowerAutomate(settings.powerAutomate)
    if (recipients.length === 0) { setStatus({ kind: 'error', message: 'There are no recipients for the checklist. Add them in Settings → Pre-send Checklist.' }); return }
    if (!isChecklistFlowReady(pa)) { setStatus({ kind: 'error', message: 'The checklist flow is not set up. Switch on Power Automate and add the Pre-send Checklist flow in Settings → Power Automate.' }); return }
    try {
      setStatus({ kind: 'sending', what: 'checklist' })
      const { brief, emailHtml, model } = await build()
      const emailName = nameOf(brief)
      const names = submissionFiles(brief.campaign.campaignName, new Date().toISOString().slice(0, 10))
      const result = await triggerChecklistSend(pa, {
        briefId: brief.meta.briefId,
        emailName,
        recipients,
        subject: checklistSubject(checklistSettings(settings), emailName),
        bodyHtml: checklistHtml(model),
        html: emailHtml,
        attachments: [{ name: names.email, type: 'text/html', base64: textToBase64(emailHtml) }],
        requesterName: profile?.displayName,
        requesterEmail: user?.email ?? undefined,
      })
      if (!result.ok) { setStatus({ kind: 'error', message: result.error }); return }
      audit({ action: 'Sent pre-send checklist', category: 'brief', entityType: 'brief', entityId: brief.meta.briefId, details: { emailName, recipients } })
      setStatus({ kind: 'done', message: `Sent to ${recipients.join(', ')}.` })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'The checklist could not be sent.' })
    }
  }

  return (
    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Pre-send checklist</p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={sendProof} disabled={status.kind === 'sending'} className={SECONDARY}>
          {status.kind === 'sending' && status.what === 'proof' ? 'Sending…' : 'Send me a Proof'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={send} disabled={status.kind === 'sending'} className={PRIMARY}>
            {status.kind === 'sending' && status.what === 'checklist' ? 'Sending…' : 'Send Checklist'}
          </button>
          <button type="button" onClick={download} className={SECONDARY}>Download Checklist</button>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
        {recipients.length > 0
          ? `Sends to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}, with the email's HTML attached.`
          : 'No recipients yet. Add them in Settings → Pre-send Checklist.'}
      </p>
      {status.kind === 'error' && <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-2 break-words">{status.message}</p>}
      {status.kind === 'done' && <p aria-live="polite" className="text-xs text-green-700 dark:text-green-400 mt-2 break-words">{status.message}</p>}
    </div>
  )
}
