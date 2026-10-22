import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { downloadHtml } from '../../lib/downloadHtml'
import { editorLabel, openCommand, resolveEmailEditor } from '../../lib/emailEditor'
import type { CardEmail } from './useCardEmail'

interface Props {
  email: CardEmail
  /** The name the file is saved under, ending in .html */
  fileName: string
  onDark?: boolean
}

/**
 * Downloads the card's email as an .html file and shows how to open it in the application chosen in Settings.
 * A browser cannot launch a desktop application with a file, so the last step is a click in Finder or one
 * command in Terminal; the command is offered ready to copy.
 */
export function OpenInEditor({ email, fileName, onDark = false }: Props) {
  const { settings } = useSettings()
  const editor = resolveEmailEditor(settings.emailEditor)
  const label = editorLabel(editor)
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const command = openCommand(editor, fileName)
  const ready = email.status === 'ready'

  const open = () => {
    if (email.status !== 'ready') return
    downloadHtml(email.html, fileName)
    setCopied(false)
    setShown(true)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={open}
        disabled={!ready}
        title={ready ? undefined : 'The email is not ready yet'}
        className={`text-xs hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed ${onDark ? 'text-white/80 hover:text-white' : 'text-brand-primary dark:text-brand-accent'}`}
      >
        Open in {label}
      </button>
      {shown && (
        <div role="status" className="absolute right-0 top-full z-20 mt-2 w-80 max-w-[85vw] rounded-md border border-gray-200 bg-white p-4 text-left text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <p>
            Saved to your Downloads as <span className="font-medium">{fileName}</span>. To open it in {label}, right-click it in Finder and choose Open With, or run this in Terminal:
          </p>
          <code className="mt-2 block break-all rounded bg-gray-100 px-2 py-1.5 font-mono text-[11px] text-gray-800 dark:bg-gray-800 dark:text-gray-100">{command}</code>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button type="button" onClick={copy} className="font-medium text-brand-primary hover:underline dark:text-brand-accent">{copied ? 'Copied' : 'Copy command'}</button>
            <button type="button" onClick={() => setShown(false)} className="text-gray-500 hover:underline dark:text-gray-400">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  )
}
