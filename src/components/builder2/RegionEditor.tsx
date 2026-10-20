import { RichTextarea } from '../ui/RichTextarea'
import type { FieldInfo } from '../../lib/moduleEngine/describe'
import type { RegionValue } from '../../lib/moduleEngine/regions'

interface Props {
  field: FieldInfo
  saved: RegionValue | undefined
  accentColour?: string
  onChange: (patch: RegionValue) => void
}

const INPUT = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary'
const LABEL = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1'

function plain(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function RegionEditor({ field, saved, accentColour, onChange }: Props) {
  const id = `region-${field.key}`

  if (field.kind === 'rich') {
    return (
      <RichTextarea
        label={field.label}
        value={saved?.value ?? ''}
        onChange={(html) => onChange({ value: html })}
        placeholder={plain(field.value).slice(0, 140)}
        rows={6}
        accentColour={accentColour}
      />
    )
  }

  if (field.kind === 'image') {
    return (
      <div className="space-y-2">
        <label htmlFor={id} className={LABEL}>{field.label} — URL</label>
        <input id={id} className={INPUT} value={saved?.value ?? ''} placeholder={field.value} onChange={(e) => onChange({ value: e.target.value })} />
        <label htmlFor={`${id}-alt`} className={LABEL}>Alt text</label>
        <input id={`${id}-alt`} className={INPUT} value={saved?.alt ?? ''} placeholder={field.alt} onChange={(e) => onChange({ alt: e.target.value })} />
      </div>
    )
  }

  const hasLink = field.href !== undefined
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={LABEL}>{field.kind === 'button' ? 'Button label' : field.label}</label>
      <input id={id} className={INPUT} value={saved?.value ?? ''} placeholder={field.value} onChange={(e) => onChange({ value: e.target.value })} />
      {hasLink && (
        <>
          <label htmlFor={`${id}-href`} className={LABEL}>{field.kind === 'button' ? 'Button URL' : 'Link URL'}</label>
          <input id={`${id}-href`} className={INPUT} value={saved?.href ?? ''} placeholder={field.href} onChange={(e) => onChange({ href: e.target.value })} />
        </>
      )}
    </div>
  )
}
