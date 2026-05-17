'use client'

import { cn } from '@/lib/utils'

interface Props {
  label: string
  currentValue: string
  limitValue: string | null
  ratio: number | null
  unit?: string
}

export function RiskGauge({ label, currentValue, limitValue, ratio, unit = '%' }: Props) {
  const pct = ratio !== null ? Math.min(ratio * 100, 100) : 0
  const isBreached = ratio !== null && ratio >= 1
  const isWarning = ratio !== null && ratio >= 0.8 && ratio < 1

  const barColor = isBreached
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-400'
    : 'bg-emerald-500'

  const textColor = isBreached
    ? 'text-red-400'
    : isWarning
    ? 'text-amber-400'
    : 'text-emerald-400'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', limitValue ? textColor : 'text-foreground')}>
          {currentValue}{unit}
          {limitValue && <span className="text-muted-foreground font-normal"> / {limitValue}{unit}</span>}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        {limitValue ? (
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full rounded-full bg-muted-foreground/30 w-full" />
        )}
      </div>
      {!limitValue && (
        <p className="text-xs text-muted-foreground">Kein Limit konfiguriert</p>
      )}
    </div>
  )
}
