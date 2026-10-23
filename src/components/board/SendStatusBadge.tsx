import { sendStatus, type SendStatus } from '../../lib/boardFormat'

/** Ninety One's Protea Red, Warm Yellowwood and Ocean Teal for overdue, due soon and on track. */
export const STATUS_COLOURS: Record<SendStatus, string> = {
  overdue: '#d83949',
  'due-soon': '#fcaa28',
  ok: '#009d80',
}

// Text that reads on each fill: white on the red, Agulhas Indigo on the yellow and the teal.
const STATUS_TEXT: Record<SendStatus, string> = { overdue: '#ffffff', 'due-soon': '#221b3b', ok: '#221b3b' }

const LABEL: Record<SendStatus, string> = { overdue: 'Overdue', 'due-soon': 'Due soon', ok: 'On track' }
const HINT: Record<SendStatus, string> = {
  overdue: 'The send date has passed',
  'due-soon': 'The send date is within the next 7 days',
  ok: 'The send date is more than a week away, or the campaign is distributed',
}

interface Props {
  sendDate: string
  column?: string
  now?: Date
}

/** Where a campaign stands against its send date, as a badge in the brand colours. */
export function SendStatusBadge({ sendDate, column, now }: Props) {
  const status = sendStatus(sendDate, now ?? new Date(), column)
  return (
    <span
      title={HINT[status]}
      style={{ backgroundColor: STATUS_COLOURS[status], color: STATUS_TEXT[status] }}
      className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
    >
      {LABEL[status]}
    </span>
  )
}
