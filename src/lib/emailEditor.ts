// Which application the team opens a submitted email's HTML in. A browser cannot launch a desktop application
// with a file, so this decides the button's wording and the Terminal command offered after the download.

export type EditorId = 'dreamweaver' | 'vscode' | 'other'

export interface EmailEditorSettings {
  app: EditorId
  /** The application's name on the Mac, as `open -a` knows it (the version can be part of it) */
  appName: string
}

export const EDITOR_PRESETS: { id: EditorId; label: string; appName: string }[] = [
  { id: 'dreamweaver', label: 'Adobe Dreamweaver', appName: 'Adobe Dreamweaver 2025' },
  { id: 'vscode', label: 'VS Code', appName: 'Visual Studio Code' },
  { id: 'other', label: 'Another application', appName: '' },
]

export function resolveEmailEditor(saved: Partial<EmailEditorSettings> | undefined): EmailEditorSettings {
  const preset = EDITOR_PRESETS.find((p) => p.id === saved?.app) ?? EDITOR_PRESETS[0]
  const name = saved?.appName?.trim()
  return { app: preset.id, appName: name ? name : preset.appName }
}

/** The short name used on the button: "Dreamweaver", "VS Code", or the name that was typed. */
export function editorLabel(editor: EmailEditorSettings): string {
  if (editor.app === 'dreamweaver') return 'Dreamweaver'
  if (editor.app === 'vscode') return 'VS Code'
  return editor.appName.trim() || 'editor'
}

/** Wraps text in single quotes for a POSIX shell, so it is read as one word whatever it contains. */
export function shellQuote(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`
}

/** The Terminal command that opens a file in the Downloads folder in the chosen application. */
export function openCommand(editor: EmailEditorSettings, fileName: string): string {
  return `open -a ${shellQuote(editor.appName)} ~/Downloads/${shellQuote(fileName)}`
}
