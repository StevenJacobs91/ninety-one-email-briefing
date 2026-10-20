import { charCount, truncateGraphemes } from '../../engine/text'

/** True when a client that shows about `limit` characters would cut the subject off. */
export function isTruncated(subject: string, limit: number): boolean {
  return charCount(subject) > limit
}

/** The part of the subject a client with a `limit`-character window would show. */
export function visiblePart(subject: string, limit: number): string {
  return isTruncated(subject, limit) ? truncateGraphemes(subject, limit).trimEnd() : subject
}

/** A text alternative for the preview, saying what each device cuts off. */
export function describeTruncation(subject: string, desktopLimit: number, mobileLimit: number): string {
  if (subject.trim() === '') return 'There is no subject line to preview yet.'
  const desktopCut = isTruncated(subject, desktopLimit)
  const mobileCut = isTruncated(subject, mobileLimit)
  if (!desktopCut && !mobileCut) return 'Desktop and mobile previews show the whole subject line.'
  const desktop = desktopCut ? `Desktop preview cuts off after "${visiblePart(subject, desktopLimit)}".` : 'Desktop preview shows the whole subject line.'
  const mobile = mobileCut ? `Mobile preview cuts off after "${visiblePart(subject, mobileLimit)}".` : 'Mobile preview shows the whole subject line.'
  return `${desktop} ${mobile}`
}
