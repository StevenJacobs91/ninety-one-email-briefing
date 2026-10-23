import { RichTextarea } from '../ui/RichTextarea'
import { AssetLibraryPicker } from './AssetLibraryPicker'
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
    const profile = /\/profile_/i.test(field.value)
    return (
      <AssetLibraryPicker
        category={profile ? 'profile' : 'graphics'}
        label={field.label}
        url={saved?.value ?? ''}
        alt={saved?.alt ?? ''}
        onChange={(patch) => onChange({
          ...(patch.url !== undefined ? { value: patch.url } : {}),
          ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
        })}
      />
    )
  }

  const hasLink = field.href !== undefined
  const multiline = field.value.includes('\n') || (saved?.value ?? '').includes('\n')
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={LABEL}>{field.kind === 'button' ? 'Button label' : field.label}</label>
      {multiline ? (
        // The design breaks this text over two lines; each line of the box is a line of the email.
        <textarea id={id} rows={2} className={`${INPUT} resize-y`} value={saved?.value ?? ''} placeholder={field.value} onChange={(e) => onChange({ value: e.target.value })} />
      ) : (
        <input id={id} className={INPUT} value={saved?.value ?? ''} placeholder={field.value} onChange={(e) => onChange({ value: e.target.value })} />
      )}
      {hasLink && (
        <>
          <label htmlFor={`${id}-href`} className={LABEL}>{field.kind === 'button' ? 'Button URL' : 'Link URL'}</label>
          <input id={`${id}-href`} className={INPUT} value={saved?.href ?? ''} placeholder={field.href} onChange={(e) => onChange({ href: e.target.value })} />
        </>
      )}
    </div>
  )
}
