import { ModulePreview } from '../builder2/ModulePreview'
import type { CardEmail } from './useCardEmail'

function Notice({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
      <p>{text}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="mt-2 text-brand-primary dark:text-brand-accent underline">{action.label}</button>
      )}
    </div>
  )
}

/** Shows the card's email, or says plainly why there is nothing to show. */
export function CardEmailPreview({ email, title }: { email: CardEmail; title: string }) {
  switch (email.status) {
    case 'loading': return <Notice text="Loading the email…" />
    case 'loading-library': return <Notice text="Loading the module library…" />
    case 'missing': return <Notice text="There is no saved email for this card. Cards added by hand, or briefs that were not saved, have nothing to show." />
    case 'error': return <Notice text={email.message} />
    case 'library-error': return <Notice text={email.message} action={{ label: 'Retry', onClick: email.retry }} />
    case 'unbuildable': return <Notice text="This email could not be built from its saved brief." />
    case 'ready': return <ModulePreview html={email.html} title={title} />
  }
}
