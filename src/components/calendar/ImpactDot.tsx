import { cn } from '@/lib/utils'
import type { ImpactLevel } from '@/types/calendar'

interface Props {
  impact: ImpactLevel
  className?: string
}

export function ImpactDot({ impact, className }: Props) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full shrink-0', className)}
      style={{
        backgroundColor:
          impact === 'High' ? 'var(--short)' :
          impact === 'Medium' ? 'var(--warn)' :
          'var(--fg-4)',
      }}
      title={impact}
    />
  )
}
