interface SenderFields {
  senderType?: 'general' | 'specific' | 'assigned'
  specificUser?: string
  fromName: string
  fromAddress: string
}

const ASSIGNED = "Assigned user (the prospect's own Pardot user)"

/** The label and value rows that say who an email is sent as. A brief from before sender types existed is a general user send. */
export function senderRows(c: SenderFields): [string, string][] {
  if (c.senderType === 'specific') return [['Sender', 'Specific user'], ['Pardot User ID', c.specificUser ?? '']]
  if (c.senderType === 'assigned') return [['Sender', ASSIGNED]]
  return [['From Name', c.fromName], ['From Address', c.fromAddress]]
}

/** The same, on one line. */
export function senderLine(c: SenderFields): string {
  if (c.senderType === 'specific') return `Specific user (Pardot user ${c.specificUser ?? ''})`.replace(' )', ')')
  if (c.senderType === 'assigned') return ASSIGNED
  return `${c.fromName} <${c.fromAddress}>`
}
