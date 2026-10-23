import { useEffect, useRef, useState } from 'react'
import type { CardEmail } from './useCardEmail'

interface Props {
  email: CardEmail
  onDark?: boolean
}

/** Copies the card's email HTML to the clipboard, ready to paste into Pardot, Dreamweaver or any editor. */
export function CopyHtml({ email, onDark = false }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const ready = email.status === 'ready'

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    if (email.status !== 'ready') return
    try {
      await navigator.clipboard.writeText(email.html)
      setState('copied')
    } catch {
      setState('failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2500)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        disabled={!ready}
        title={ready ? 'Copy the email HTML to the clipboard' : 'The email is not ready yet'}
        className={`text-xs hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed ${onDark ? 'text-white/80 hover:text-white' : 'text-brand-primary dark:text-brand-accent'}`}
      >
        {state === 'copied' ? 'Copied' : 'Copy HTML'}
      </button>
      {state === 'failed' && (
        <p role="alert" className="absolute right-0 top-full z-20 mt-2 w-60 rounded-md border border-red-200 bg-white p-3 text-xs text-red-700 shadow-lg dark:border-red-900 dark:bg-gray-900 dark:text-red-300">
          The browser could not copy it. Use Open in editor to download the file instead.
        </p>
      )}
    </div>
  )
}
