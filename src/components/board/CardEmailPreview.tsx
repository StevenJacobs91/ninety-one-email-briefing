import { useEffect, useMemo, useState } from 'react'
import type { BriefPayload } from '../../types/brief.types'
import type { ThemeCatalogue } from '../../lib/moduleEngine/catalogue'
import { useSettings } from '../../contexts/SettingsContext'
import { fetchBriefById } from '../../lib/supabaseQueries'
import { generateEmailHtml } from '../../lib/emailGenerator'
import { useCatalogue } from '../builder2/useCatalogue'
import { ModulePreview } from '../builder2/ModulePreview'

function Notice({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
      <p>{text}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="mt-2 text-brand-primary dark:text-brand-accent underline">{action.label}</button>
      )}
    </div>
  )
}

/**
 * The email behind a board card, built from its saved brief when the card is opened: nothing is stored or loaded
 * for the other cards. It uses the same generator as the Email HTML link, so it is the email as it would be built now.
 */
export function CardEmailPreview({ briefId, emailName }: { briefId: string; emailName: string }) {
  const [brief, setBrief] = useState<BriefPayload | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setBrief(undefined)
    setError('')
    fetchBriefById(briefId)
      .then((b) => { if (!cancelled) setBrief(b) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the email') })
    return () => { cancelled = true }
  }, [briefId])

  if (error) return <Notice text={error} />
  if (brief === undefined) return <Notice text="Loading the email…" />
  if (brief === null) return <Notice text="There is no saved email for this card. Cards added by hand, or briefs that were not saved, have nothing to show." />
  return brief.content.build
    ? <WithLibrary brief={brief} title={emailName} />
    : <Rendered brief={brief} title={emailName} />
}

// Only an email built from the module library needs that theme's library, so older briefs never fetch one.
function WithLibrary({ brief, title }: { brief: BriefPayload; title: string }) {
  const cat = useCatalogue(brief.campaign.theme)
  if (cat.status === 'loading') return <Notice text="Loading the module library…" />
  if (cat.status === 'error') return <Notice text={cat.message} action={{ label: 'Retry', onClick: cat.retry }} />
  return <Rendered brief={brief} catalogue={cat.catalogue} title={title} />
}

function Rendered({ brief, catalogue, title }: { brief: BriefPayload; catalogue?: ThemeCatalogue; title: string }) {
  const { settings } = useSettings()
  const built = useMemo(() => {
    try {
      return { html: generateEmailHtml(brief, settings, { catalogue }) }
    } catch {
      return { html: '' }
    }
  }, [brief, settings, catalogue])

  if (!built.html) return <Notice text="This email could not be built from its saved brief." />
  return <ModulePreview html={built.html} title={title} />
}
