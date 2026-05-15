'use client'

import { Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TopStrategy } from '@/hooks/useDashboardMetrics'

interface Props {
  strategy: TopStrategy | null
  periodLabel?: string
  minCountLabel?: number
}

export function TopStrategyCard({ strategy, periodLabel, minCountLabel = 5 }: Props) {
  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          Beste Strategie
          {periodLabel && (
            <span className="text-xs font-normal text-muted-foreground">({periodLabel})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!strategy ? (
          <p className="text-sm text-muted-foreground">
            Mindestens {minCountLabel} Trades mit derselben Strategie nötig.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold truncate">{strategy.name}</p>
              <p className="text-xs text-muted-foreground">{strategy.tradeCount} Trades</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Profit-Faktor</p>
                <p className="text-xl font-bold tabular-nums text-emerald-400">
                  {strategy.profitFactor >= 999 ? '∞' : strategy.profitFactor.toFixed(2)}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Winrate</p>
                <p className="text-xl font-bold tabular-nums">{strategy.winRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-md bg-muted/40 p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-0.5">Gesamt-P&L</p>
                <p className={cn(
                  'text-xl font-bold tabular-nums',
                  strategy.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {strategy.totalPnl >= 0 ? '+' : ''}{strategy.totalPnl.toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
