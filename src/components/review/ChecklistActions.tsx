import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import type { BriefPayload } from '../../types/brief.types'
import type { ParseDoc } from '../../lib/moduleEngine/regions'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuditLog } from '../../hooks/useAuditLog'
import { useCatalogue } from '../builder2/useCatalogue'
import { generateEmailHtml } from '../../lib/emailGenerator'
import { downloadHtml } from '../../lib/downloadHtml'
import { buildEmailName } from '../../lib/emailName'
import { submissionFiles, textToBase64 } from '../../lib/submissionDraft'
import { isChecklistFlowReady, triggerChecklistSend } from '../../lib/powerAutomateService'
import { mergePowerAutomate } from '../../lib/settingsDefaults'
import {
  buildChecklist, canSeeChecklist, checklistFileName, checklistHtml, checklistRecipients, checklistSettings, checklistSubject,
} from '../../lib/preSendChecklist'

const browserParse: ParseDoc = (html) => new DOMParser().parseFromString(html, 'text/html')

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; message: string } | { kind: 'error'; message: string }

const PRIMARY = 'w-full min-h-[44px] flex items-center justify-center bg-brand-primary text-white px-5 py-3 text-xs font-ni-heading tracking-[0.15em] uppercase hover:bg-brand-primary-hover transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2'
const SECONDARY = 'w-full min-h-[44px] flex items-center justify-center border border-brand-border-warm dark:border-gray-600 text-brand-primary dark:text-brand-accent px-5 py-3 text-xs font-ni-heading tracking-[0.15em] uppercase hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2'

/**
 * The pre-send checklist on the Review page: Send Checklist emails it, with the email's HTML attached, to the recipients
 * chosen in Settings, and Download Checklist saves it as a file to copy into an email. Only the roles chosen in Settings see them.
 */
export function ChecklistActions() {
  const { getValues } = useFormContext<BriefFormData>()
  const { profile, user } = useAuth()
  const { settings } = useSettings()
  const { log: audit } = useAuditLog()
  const cat = useCatalogue(getValues('campaign.theme'))
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  if (!canSeeChecklist(settings, profile)) return null

  const recipients = checklistRecipients(settings)

  // The email as it will be sent, built from the brief as it is now. A build from the module library needs its library first.
  const build = () => {
    const data = getValues() as unknown as BriefPayload
    if (data.content?.build && cat.status !== 'ready') return null
    const emailHtml = generateEmailHtml(data, settings, { catalogue: cat.status === 'ready' ? cat.catalogue : undefined })
    const model = buildChecklist({ brief: data, emailHtml, settings, parse: browserParse })
    return { data, emailHtml, model }
  }
  const notReady = { kind: 'error', message: 'The email is still loading. Try again in a moment.' } as const

  function download() {
    try {
      const built = build()
      if (!built) { setStatus(notReady); return }
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
      const built = build()
      if (!built) { setStatus(notReady); return }
      setStatus({ kind: 'sending' })
      const { data, emailHtml, model } = built
      const emailName = buildEmailName(data.campaign.campaignName, data.audience?.region ?? [], data.audience?.channel ?? [], data.campaign.emailDescription)
      const names = submissionFiles(data.campaign.campaignName, new Date().toISOString().slice(0, 10))
      const result = await triggerChecklistSend(pa, {
        briefId: data.meta.briefId,
        emailName,
        recipients,
        subject: checklistSubject(checklistSettings(settings), emailName),
        bodyHtml: checklistHtml(model),
        attachments: [{ name: names.email, type: 'text/html', base64: textToBase64(emailHtml) }],
        requesterName: profile?.displayName,
        requesterEmail: user?.email ?? undefined,
      })
      if (!result.ok) { setStatus({ kind: 'error', message: result.error }); return }
      audit({ action: 'Sent pre-send checklist', category: 'brief', entityType: 'brief', entityId: data.meta.briefId, details: { emailName, recipients } })
      setStatus({ kind: 'done', message: `Sent to ${recipients.join(', ')}.` })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'The checklist could not be sent.' })
    }
  }

  return (
    <div className="bg-brand-bg-panel dark:bg-brand-bg-panel-dark border border-brand-border-warm dark:border-gray-700 p-5">
      <p className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent mb-3">Pre-send checklist</p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={send} disabled={status.kind === 'sending'} className={PRIMARY}>
          {status.kind === 'sending' ? 'Sending…' : 'Send Checklist'}
        </button>
        <button type="button" onClick={download} className={SECONDARY}>Download Checklist</button>
      </div>
      <p className="text-[11px] text-brand-text-muted dark:text-gray-400 mt-3">
        {recipients.length > 0
          ? `Sends to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}, with the email's HTML attached.`
          : 'No recipients yet. Add them in Settings → Pre-send Checklist.'}
      </p>
      {status.kind === 'error' && <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-2 break-words">{status.message}</p>}
      {status.kind === 'done' && <p aria-live="polite" className="text-xs text-green-700 dark:text-green-400 mt-2 break-words">{status.message}</p>}
    </div>
  )
}
