import { supabase } from './supabase'
import { ATTACHMENT_BUCKET, attachmentPath } from './attachmentRules'
import type { AttachmentLink } from './submissionDraft'
import type { DownloadFile } from './attachmentStore'
import type { AssetAttachment } from '../types/brief.types'

// Files attached to a brief live in a private bucket, in a folder per team, so only that team can read them.
const bucket = () => supabase.storage.from(ATTACHMENT_BUCKET)

/** Uploads one file for a brief and returns the reference that is saved with the brief. */
export async function uploadAttachment(teamId: string, briefId: string, file: File): Promise<AssetAttachment> {
  const path = attachmentPath(teamId, briefId, file.name, crypto.randomUUID().slice(0, 8))
  const { error } = await bucket().upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (error) throw new Error(error.message)
  return { name: file.name, size: file.size, type: file.type, path }
}

/** Deletes a stored file. Returns false instead of throwing: a leftover file is not worth blocking the form. */
export async function removeStoredAttachment(path: string): Promise<boolean> {
  const { error } = await bucket().remove([path])
  return !error
}

export const downloadStoredAttachment: DownloadFile = async (path) => {
  const { data, error } = await bucket().download(path)
  if (error || !data) throw new Error(error?.message ?? 'Download failed')
  return data
}

/** Seven days: long enough for a flow to pick the files up when the notification is read. */
export const LINK_LIFETIME_SECONDS = 7 * 24 * 60 * 60

/** Time-limited download addresses for the saved files, in the same order. A file that cannot be signed is left out. */
export async function signedAttachmentLinks(
  list: readonly AssetAttachment[], expiresIn: number = LINK_LIFETIME_SECONDS,
): Promise<AttachmentLink[]> {
  const saved = list.filter((a): a is AssetAttachment & { path: string } => !!a.path)
  if (saved.length === 0) return []
  const { data, error } = await bucket().createSignedUrls(saved.map((a) => a.path), expiresIn)
  if (error || !data) return []
  const byPath = new Map(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]))
  return saved.flatMap((a) => {
    const url = byPath.get(a.path)
    return url ? [{ name: a.name, type: a.type, size: a.size, url }] : []
  })
}

/** Opens a stored file for the viewer: a short-lived address that downloads it under its own name. */
export async function openStoredAttachment(path: string, name: string): Promise<void> {
  const { data, error } = await bucket().createSignedUrl(path, 300, { download: name })
  if (error || !data) throw new Error(error?.message ?? 'Could not open the file')
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}
