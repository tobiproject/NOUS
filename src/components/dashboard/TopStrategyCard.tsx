'use client'

import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TopStrategy } from '@/hooks/useDashboardMetrics'

interface Props {
  strategy: TopStrategy | null
  periodLabel?: string
  minCountLabel?: number
}

export function TopStrategyCard({ strategy, periodLabel, minCountLabel = 5 }: Props) {
  return (
    <div
      className="rounded-xl h-full flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
        >
          <Trophy className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
            Beste Strategie
          </div>
          {periodLabel && (
            <div className="eyebrow" style={{ color: 'var(--fg-4)', fontSize: '10px' }}>
              {periodLabel}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4">
        {!strategy ? (
          <p className="text-sm" style={{ color: 'var(--fg-4)' }}>
            Mindestens {minCountLabel} Trades mit derselben Strategie nötig.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-base font-bold truncate" style={{ color: 'var(--fg-1)' }}>
                {strategy.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>
                {strategy.tradeCount} Trades
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="eyebrow mb-1" style={{ fontSize: '10px' }}>Profit-Faktor</p>
                <p className="num text-xl font-bold" style={{ color: 'var(--long)' }}>
                  {strategy.profitFactor >= 999 ? '∞' : strategy.profitFactor.toFixed(2)}
                </p>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="eyebrow mb-1" style={{ fontSize: '10px' }}>Win Rate</p>
                <p className="num text-xl font-bold" style={{ color: 'var(--fg-1)' }}>
                  {strategy.winRate.toFixed(1)}%
                </p>
              </div>
              <div
                className="rounded-lg p-3 col-span-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="eyebrow mb-1" style={{ fontSize: '10px' }}>Gesamt-P&L</p>
                <p
                  className={cn('num text-xl font-bold')}
                  style={{ color: strategy.totalPnl >= 0 ? 'var(--long)' : 'var(--short)' }}
                >
                  {strategy.totalPnl >= 0 ? '+' : ''}{strategy.totalPnl.toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
