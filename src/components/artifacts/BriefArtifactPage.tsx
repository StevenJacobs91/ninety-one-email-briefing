import { useEffect, useMemo, useState } from 'react'
import type { BriefPayload } from '../../types/brief.types'
import { useSettings } from '../../contexts/SettingsContext'
import { fetchBriefById } from '../../lib/supabaseQueries'
import { generateEmailHtml } from '../../lib/emailGenerator'
import { generateBriefHtml } from '../../lib/generateBriefHtml'
import { buildEmailName } from '../../lib/emailName'
import { submissionFiles } from '../../lib/submissionDraft'
import { selfHostFonts } from '../../lib/previewFonts'
import { useCatalogue } from '../builder2/useCatalogue'

export type ArtifactView = 'html' | 'summary'

// The page behind a board card's "Email HTML" and "Brief Summary" links: the
// saved brief, regenerated, so nothing needs to be stored as a file.
export function BriefArtifactPage({ briefId, view }: { briefId: string; view: ArtifactView }) {
  const [brief, setBrief] = useState<BriefPayload | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchBriefById(briefId)
      .then((b) => { if (!cancelled) setBrief(b) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the brief') })
    return () => { cancelled = true }
  }, [briefId])

  if (error) return <Notice text={error} />
  if (brief === undefined) return <Notice text="Loading…" />
  if (brief === null) return <Notice text="This brief could not be found. It may have been removed, or belongs to another team." />
  return <ArtifactBody brief={brief} view={view} />
}

function ArtifactBody({ brief, view }: { brief: BriefPayload; view: ArtifactView }) {
  const { settings } = useSettings()
  const needsCatalogue = view === 'html' && !!brief.content.build
  const cat = useCatalogue(brief.campaign.theme)
  const catalogue = cat.status === 'ready' ? cat.catalogue : undefined
  const name = buildEmailName(brief.campaign.campaignName, brief.audience.region, brief.audience.channel, brief.campaign.emailDescription)

  const html = useMemo(() => {
    if (needsCatalogue && !catalogue) return ''
    return view === 'html' ? generateEmailHtml(brief, settings, { catalogue }) : generateBriefHtml(brief)
  }, [brief, settings, catalogue, needsCatalogue, view])

  if (needsCatalogue && cat.status === 'error') return <Notice text={cat.message} />
  if (!html) return <Notice text="Preparing…" />

  const filename = submissionFiles(brief.campaign.campaignName, new Date().toISOString().slice(0, 10))[view === 'html' ? 'email' : 'summary']
  const download = () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([html], { type: 'text/html' })), download: filename })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex items-center justify-between gap-4 px-4 py-2 bg-brand-primary text-white text-sm">
        <span className="truncate">{view === 'html' ? 'Email HTML' : 'Brief Summary'} · {name}</span>
        <button type="button" onClick={download} className="shrink-0 border border-white/40 px-3 py-1 text-xs hover:bg-white/10">Download</button>
      </div>
      <iframe title={view === 'html' ? 'Email HTML' : 'Brief Summary'} srcDoc={selfHostFonts(html, window.location.origin)} className="flex-1 w-full border-0 bg-white" />
    </div>
  )
}

function Notice({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <p className="text-sm text-gray-600 text-center max-w-md">{text}</p>
    </div>
  )
}
