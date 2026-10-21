// Rules for the files attached to a brief. Pure, so the form, the storage service and the tests agree.

export const MAX_ATTACHMENTS = 10
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_BUCKET = 'brief-attachments'

// Images, PDFs and office documents. Executables, scripts and SVG (which can carry script) are not allowed.
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'rtf',
])

/** A name safe to use in a storage path that still reads as the original file name. */
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/-+\./g, '.')
    .replace(/^[.\-]+|-+$/g, '')
  if (!cleaned) return 'file'
  if (cleaned.length <= 100) return cleaned
  const dot = cleaned.lastIndexOf('.')
  const ext = dot > 0 && cleaned.length - dot <= 9 ? cleaned.slice(dot) : ''
  return cleaned.slice(0, 100 - ext.length) + ext
}

/** team / brief / unique-prefixed name: the team folder is what the storage policies check. */
export function attachmentPath(teamId: string, briefId: string, fileName: string, uid: string): string {
  return `${teamId}/${briefId}/${uid}-${safeFileName(fileName)}`
}

/** Why a file cannot be attached, or null when it can. */
export function validateUpload(file: { name: string; size: number; type: string }): string | null {
  if (file.size === 0) return `${file.name} is empty.`
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than the 10 MB limit.`
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  if (!ALLOWED_EXTENSIONS.has(ext)) return `${file.name}: this file type is not allowed. Use images, PDFs or documents.`
  return null
}
