import { useId, useMemo, useState, type FormEvent } from 'react'
import type { LexiconTerm } from '../engine/types'
import { addSpamTerm, removeSpamTerm, SPAM_PACKS } from '../spamWordList'

interface Props {
  value: readonly LexiconTerm[]
  onChange: (next: LexiconTerm[]) => void
  /** True once the list differs from the shipped starting list, which enables "Restore defaults". */
  customised: boolean
  onRestoreDefaults: () => void
}

const INPUT =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

/** Maintains the words and phrases the Subject Line Tester flags. */
export function SpamWordListEditor({ value, onChange, customised, onRestoreDefaults }: Props) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [pack, setPack] = useState<string>(SPAM_PACKS[0].id)
  const [error, setError] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? value.filter((t) => t.term.toLowerCase().includes(q)) : value
  }, [value, query])

  const add = (e?: FormEvent) => {
    e?.preventDefault()
    const result = addSpamTerm(value, draft, pack)
    if (result.error) return setError(result.error)
    setError('')
    setDraft('')
    onChange(result.list)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor={`${id}-new`} className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">New word or phrase</label>
          <input
            id={`${id}-new`}
            type="text"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError('') }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            placeholder="e.g. guaranteed returns"
            className={`${INPUT} w-full`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-pack`} className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Pack</label>
          <select id={`${id}-pack`} value={pack} onChange={(e) => setPack(e.target.value)} className={INPUT}>
            {SPAM_PACKS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
          Add
        </button>
      </form>
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <input
          type="search"
          aria-label="Search the word list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the list"
          className={`${INPUT} w-full max-w-xs`}
        />
        <p className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
          {value.length} {value.length === 1 ? 'word' : 'words'}
          {customised && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => { if (window.confirm('Replace your word list with the starting list? Your changes will be lost.')) onRestoreDefaults() }}
                className="text-brand-primary underline-offset-2 hover:underline dark:text-brand-accent"
              >
                Restore defaults
              </button>
            </>
          )}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{value.length === 0 ? 'The list is empty, so no words are flagged.' : 'No words match your search.'}</p>
      ) : (
        SPAM_PACKS.map((p) => {
          const inPack = visible.filter((t) => t.pack === p.id)
          if (inPack.length === 0) return null
          return (
            <section key={p.id}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{p.label} ({inPack.length})</h4>
              <ul className="flex flex-wrap gap-2">
                {inPack.map((t) => (
                  <li key={`${p.id}:${t.term}`} className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 py-1 pl-3 pr-1.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    {t.term}
                    <button
                      type="button"
                      onClick={() => onChange(removeSpamTerm(value, t.term, t.pack))}
                      aria-label={`Remove "${t.term}" from ${p.label}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:hover:bg-gray-700"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
