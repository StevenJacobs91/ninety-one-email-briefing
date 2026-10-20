import { fileToBase64, type DraftAttachment } from './submissionDraft'

// The form keeps only each attachment's name, size and type (files cannot live
// in a saved draft). The File objects are held here for this browser session so
// they can be attached when the brief is submitted.
const files = new Map<string, File>()
const key = (name: string, size: number) => `${name}\u0000${size}`

export function rememberFiles(list: File[]): void {
  for (const f of list) files.set(key(f.name, f.size), f)
}

export function forgetFile(name: string, size: number): void {
  files.delete(key(name, size))
}

export function clearAttachmentStore(): void {
  files.clear()
}

export async function collectAttachments(
  listed: { name: string; size: number; type: string }[],
): Promise<{ found: DraftAttachment[]; missing: string[] }> {
  const found: DraftAttachment[] = []
  const missing: string[] = []
  for (const a of listed) {
    const file = files.get(key(a.name, a.size))
    if (!file) { missing.push(a.name); continue }
    found.push({ name: a.name, type: a.type || file.type || 'application/octet-stream', base64: await fileToBase64(file) })
  }
  return { found, missing }
}
