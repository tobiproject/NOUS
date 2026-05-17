'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { OutcomeBadge } from './OutcomeBadge'
import { getPnlStyle, getDirectionColor } from '@/lib/trade-display'
import type { Trade } from '@/hooks/useTrades'

interface Props {
  trades: Trade[]
  isLoading: boolean
  onCardClick: (trade: Trade) => void
}

export function MobileTradeCard({ trades, isLoading, onCardClick }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-2)' }} />
        ))}
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-14 text-center">
        <p className="text-muted-foreground text-sm">Keine Trades gefunden.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {trades.map(trade => {
        const pnl = trade.result_currency
        const dirColor = getDirectionColor(trade.direction)
        const dirIconBg = trade.direction === 'long' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'

        return (
          <div
            key={trade.id}
            onClick={() => onCardClick(trade)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer active:opacity-70"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)', minHeight: '44px' }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{ background: dirIconBg }}
            >
              {trade.direction === 'long'
                ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                : <TrendingDown className="h-4 w-4 text-red-400" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-[14px] truncate" style={{ color: 'var(--fg-1)' }}>
                  {trade.asset}
                </span>
                <OutcomeBadge outcome={trade.outcome} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--fg-3)' }}>
                  {format(parseISO(trade.traded_at), 'dd.MM.yy', { locale: de })}
                </span>
                {trade.setup_type && (
                  <span className="text-xs truncate" style={{ color: 'var(--fg-4)' }}>
                    · {trade.setup_type}
                  </span>
                )}
              </div>
            </div>

            <div className="tabular-nums text-sm font-semibold shrink-0" style={getPnlStyle(pnl)}>
              {pnl !== null ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} €` : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
