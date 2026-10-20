import { setRegion, type EmailBuild } from './build'

export const GREETING_MODULE = 'Greeting'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// The Greeting module ships two alternative paragraphs. The greeting chosen in
// Settings → Greetings goes into the first and the alternative is removed, so
// only one greeting is sent. Both regions are tied to the brief ("greeting"),
// which keeps them out of "unsaved work" checks and out of saved templates.
export function applyGreeting(build: EmailBuild, text: string | null): EmailBuild {
  if (text === null) return build
  let b = build
  for (const m of build.modules.filter((x) => x.moduleName === GREETING_MODULE)) {
    b = setRegion(b, m.instanceId, 'root.0', { value: escapeHtml(text), removed: false }, 'greeting')
    b = setRegion(b, m.instanceId, 'root.1', { removed: true }, 'greeting')
  }
  return b
}
