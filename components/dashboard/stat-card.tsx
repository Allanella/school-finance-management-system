import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  supporting,
  icon: Icon,
}: {
  label: string
  value: string
  supporting: string
  icon: LucideIcon
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{supporting}</p>
    </article>
  )
}
