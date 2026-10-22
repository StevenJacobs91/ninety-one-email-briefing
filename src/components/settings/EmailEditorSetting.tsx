import { useSettings } from '../../contexts/SettingsContext'
import { EDITOR_PRESETS, editorLabel, openCommand, resolveEmailEditor, type EditorId } from '../../lib/emailEditor'

/** Settings → General: the application the board's "Open in editor" button is set up for. */
export function EmailEditorSetting() {
  const { settings, updateSettings } = useSettings()
  const editor = resolveEmailEditor(settings.emailEditor)
  const label = editorLabel(editor)

  const choose = (app: EditorId) => {
    const preset = EDITOR_PRESETS.find((p) => p.id === app)!
    updateSettings({ emailEditor: { app, appName: preset.appName } })
  }

  return (
    <fieldset aria-label="Email editor" className="m-0 border-0 p-0">
      <legend className="sr-only">Email editor</legend>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Email editor</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-xl">
        The application you open a submitted email's HTML in. On a Campaign Board card, the button downloads the HTML file, then shows how to open it in this application, because a browser cannot launch desktop software itself.
      </p>

      <div className="space-y-2 mb-4" role="radiogroup" aria-label="Application">
        {EDITOR_PRESETS.map((p) => (
          <label key={p.id} className="flex items-center gap-3 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
            <input type="radio" name="email-editor" value={p.id} checked={editor.app === p.id} onChange={() => choose(p.id)} className="w-4 h-4 accent-brand-primary" aria-label={p.label} />
            {p.label}
          </label>
        ))}
      </div>

      <label htmlFor="email-editor-name" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Application name on your Mac</label>
      <input
        id="email-editor-name"
        value={editor.appName}
        onChange={(e) => updateSettings({ emailEditor: { app: editor.app, appName: e.target.value } })}
        placeholder="e.g. BBEdit"
        className="w-full max-w-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      />
      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
        {editor.app === 'other' && editor.appName.trim() === ''
          ? 'Type the name of the application exactly as it appears in your Applications folder.'
          : 'Exactly as it appears in your Applications folder, including the version if it has one.'}
      </p>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>The card's button will read <span className="font-medium text-gray-700 dark:text-gray-200">Open in {label}</span>. The Terminal command it offers looks like:</p>
        <code className="mt-1 block break-all rounded bg-gray-100 px-2 py-1.5 font-mono text-[11px] text-gray-800 dark:bg-gray-800 dark:text-gray-100">{openCommand(editor, 'Your Email Name.html')}</code>
      </div>
    </fieldset>
  )
}
