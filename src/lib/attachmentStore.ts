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

/** Fetches a saved file's contents from storage. */
export type DownloadFile = (path: string) => Promise<Blob>

/**
 * The files to attach, as base64. A saved attachment (it has a storage `path`) is fetched from storage, so it
 * survives a page reload; one that was only chosen this session comes from memory. Anything that cannot be
 * found is reported by name instead of being dropped silently.
 */
export async function collectAttachments(
  listed: { name: string; size: number; type: string; path?: string }[],
  download?: DownloadFile,
): Promise<{ found: DraftAttachment[]; missing: string[] }> {
  const found: DraftAttachment[] = []
  const missing: string[] = []
  for (const a of listed) {
    try {
      if (a.path && download) {
        const blob = await download(a.path)
        found.push({ name: a.name, type: a.type || blob.type || 'application/octet-stream', base64: await fileToBase64(blob) })
        continue
      }
    } catch {
      missing.push(a.name)
      continue
    }
    const file = files.get(key(a.name, a.size))
    if (!file) { missing.push(a.name); continue }
    found.push({ name: a.name, type: a.type || file.type || 'application/octet-stream', base64: await fileToBase64(file) })
  }
  return { found, missing }
}
