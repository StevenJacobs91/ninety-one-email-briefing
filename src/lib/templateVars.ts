/** The month an email goes out: the send date's when it is set and valid (YYYY-MM-DD), else the current month. */
export function monthName(sendDate: string | undefined, now: Date = new Date()): string {
  const m = (sendDate ?? '').match(/^(\d{4})-(\d{2})-\d{2}/)
  const index = m ? Number(m[2]) - 1 : now.getMonth()
  const valid = index >= 0 && index <= 11 ? index : now.getMonth()
  return new Date(2000, valid, 1).toLocaleString('en-GB', { month: 'long' })
}

/** Replaces {{month}} (any case, spaces allowed inside the braces) with the month name; other braces are left alone. */
export function fillMonth(text: string, month: string): string {
  return text.replace(/\{\{\s*month\s*\}\}/gi, month)
}
