import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Trade } from '@/hooks/useTrades'

const OUTCOME_MAP = {
  win:       { label: 'Win',  className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  loss:      { label: 'Loss', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  breakeven: { label: 'BE',   className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
}

export function OutcomeBadge({ outcome }: { outcome: Trade['outcome'] }) {
  if (!outcome) return <span className="text-muted-foreground text-xs">—</span>
  const { label, className } = OUTCOME_MAP[outcome]
  return (
    <Badge variant="outline" className={cn('text-xs px-1.5 py-0', className)}>
      {label}
    </Badge>
  )
}
