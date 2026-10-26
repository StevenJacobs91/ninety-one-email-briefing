import { memo, useDeferredValue } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { InboxPreview } from '../../features/subject-line-tester/components/InboxPreview/InboxPreview'
import type { BriefFormData } from '../../lib/schema'

/**
 * How the email will look in an inbox: sender, subject and preview text. It watches those three fields and nothing else,
 * and draws from deferred copies, so typing in the brief never waits on it and it never redraws the email.
 */
export const InboxPreviewStrip = memo(function InboxPreviewStrip() {
  const { control } = useFormContext<BriefFormData>()
  const [fromName, subjectLine, previewText] = useWatch({ control, name: ['campaign.fromName', 'campaign.subjectLine', 'campaign.previewText'] })
  const sender = useDeferredValue(fromName ?? '')
  const subject = useDeferredValue(subjectLine ?? '')
  const preheader = useDeferredValue(previewText ?? '')

  return (
    <section aria-label="Inbox preview" className="mb-6 border border-brand-border-warm dark:border-gray-700 p-4">
      <h3 className="mb-3 text-xs font-ni-heading uppercase tracking-[0.18em] text-brand-primary dark:text-brand-accent">Inbox preview</h3>
      {subject.trim() === '' ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Add a subject line in the brief to see how it will look in an inbox.</p>
      ) : (
        <InboxPreview subject={subject} senderName={sender} preheader={preheader} defaultView="both" />
      )}
    </section>
  )
})
