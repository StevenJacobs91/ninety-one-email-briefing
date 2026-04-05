interface SubSectionProps {
  title: string
  children: React.ReactNode
}

export function SubSection({ title, children }: SubSectionProps) {
  return (
    <div className="mb-8">
      <h3 className="text-xs font-ni-heading text-brand-primary dark:text-brand-accent uppercase tracking-[0.18em] border-b border-brand-border-warm dark:border-gray-700 pb-2 mb-5">
        {title}
      </h3>
      <div className="space-y-5">{children}</div>
    </div>
  )
}
