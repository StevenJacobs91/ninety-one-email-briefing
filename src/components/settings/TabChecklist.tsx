import { useEffect, useState, type ReactNode } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { checklistSettings, DEFAULT_CHECKLIST_SETTINGS, parseRecipients } from '../../lib/preSendChecklist'
import { isChecklistFlowReady } from '../../lib/powerAutomateService'
import { mergePowerAutomate } from '../../lib/settingsDefaults'
import type { PreSendChecklistSettings } from '../../types/settings.types'
import { Switch } from '../ui/Switch'

const FIELD = 'w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent'
const BASE_ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'producer', label: 'Producer' },
  { id: 'requester', label: 'Requester' },
]

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border border-brand-border-warm dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{description}</p>}
      {children}
    </section>
  )
}

/** Settings → Checklist: who sees the pre-send checklist buttons on the Review page, and who the checklist is emailed to. */
export function TabChecklist() {
  const { settings, updateSettings } = useSettings()
  const current = checklistSettings(settings)
  const roles = [...BASE_ROLES, ...(settings.customRoles ?? []).map((r) => ({ id: r.id, label: r.name }))]

  const [recipients, setRecipients] = useState(current.recipients.join('\n'))
  const [rejected, setRejected] = useState<string[]>([])
  const [subject, setSubject] = useState(current.subjectTemplate)
  useEffect(() => { setRecipients(current.recipients.join('\n')) }, [current.recipients.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSubject(current.subjectTemplate) }, [current.subjectTemplate])

  const save = (patch: Partial<PreSendChecklistSettings>) => updateSettings({ preSendChecklist: { ...current, ...patch } })

  const toggleRole = (id: string) =>
    save({ visibleTo: current.visibleTo.includes(id) ? current.visibleTo.filter((r) => r !== id) : [...current.visibleTo, id] })

  const commitRecipients = () => {
    const { valid, invalid } = parseRecipients(recipients)
    setRejected(invalid)
    setRecipients(valid.join('\n'))
    save({ recipients: valid })
  }

  const commitSubject = () => {
    const next = subject.trim() ? subject.trim() : DEFAULT_CHECKLIST_SETTINGS.subjectTemplate
    setSubject(next)
    save({ subjectTemplate: next })
  }

  const flowReady = isChecklistFlowReady(mergePowerAutomate(settings.powerAutomate))

  return (
    <div className="space-y-6">
      <Section title="Who sees the checklist" description="The Send Checklist and Download Checklist buttons on the Review and Submission step.">
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">Show the buttons</span>
          <Switch checked={current.enabled} onChange={(on) => save({ enabled: on })} label="Show the checklist buttons" />
        </div>
        <fieldset className={current.enabled ? '' : 'opacity-50'}>
          <legend className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Visible to</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={current.visibleTo.includes(role.id)} onChange={() => toggleRole(role.id)} className="accent-brand-primary" />
                {role.label}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">A custom role is chosen on its own: ticking Requester does not include a custom role based on it.</p>
        </fieldset>
      </Section>

      <Section title="Recipients" description="Send Checklist emails the checklist, with the email's HTML attached, to these addresses.">
        <label htmlFor="checklist-recipients" className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Recipients</label>
        <textarea
          id="checklist-recipients"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          onBlur={commitRecipients}
          rows={4}
          placeholder={'name@ninetyone.com\nanother@ninetyone.com'}
          className={`${FIELD} font-mono resize-y`}
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">One address on each line, or separated by commas. {current.recipients.length} saved.</p>
        {rejected.length > 0 && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">Not saved, because they are not email addresses: {rejected.join(', ')}</p>
        )}
        <label htmlFor="checklist-subject" className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block mt-4 mb-1">Email subject</label>
        <input id="checklist-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={commitSubject} className={FIELD} />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{'{{emailName}}'} becomes the email&rsquo;s name.</p>
      </Section>

      <Section title="Sending" description="The checklist is sent by a Power Automate flow.">
        <p className={`text-xs ${flowReady ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {flowReady
            ? 'The checklist flow is set up.'
            : 'The checklist flow is not set up yet. Switch Power Automate on and add the Pre-send Checklist flow’s web address in Setup → Power Automate.'}
        </p>
      </Section>
    </div>
  )
}
