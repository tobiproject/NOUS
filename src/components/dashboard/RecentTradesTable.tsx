'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { OutcomeBadge } from '@/components/journal/OutcomeBadge'
import { getPnlStyle, getDirectionColor } from '@/lib/trade-display'
import type { Trade } from '@/hooks/useTrades'

interface Props {
  trades: Trade[]
  onTradeClick: (trade: Trade) => void
  emptyMessage?: string
}

export function RecentTradesTable({ trades, onTradeClick, emptyMessage }: Props) {
  const header = (
    <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-raw)' }}>
      <div>
        <div className="eyebrow mb-0.5">Recent trades</div>
        <div className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
          {trades.length > 0 ? `${trades.length} Trades` : 'Noch keine Trades'}
        </div>
      </div>
    </div>
  )

  const empty = (
    <p className="text-sm px-5 py-6" style={{ color: 'var(--fg-3)' }}>
      {emptyMessage ?? 'No trades yet. Start logging to build your edge.'}
    </p>
  )

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
      {header}

      {trades.length === 0 ? empty : (
        <>
          {/* ── Desktop table (≥768px) ─────────────────────────────── */}
          <div className="hidden md:block">
            <div
              className="grid px-5 py-2 text-[10.5px] font-semibold tracking-widest uppercase"
              style={{
                gridTemplateColumns: '90px 1fr 80px 110px 70px 70px',
                gap: '16px',
                color: 'var(--fg-3)',
                borderBottom: '1px solid var(--border-raw)',
              }}
            >
              <div>Datum</div>
              <div>Asset · Setup</div>
              <div>Richtung</div>
              <div style={{ textAlign: 'right' }}>P&L</div>
              <div style={{ textAlign: 'right' }}>R:R</div>
              <div>Status</div>
            </div>

            {trades.map(trade => {
              const pnl = trade.result_currency
              const dirColor = getDirectionColor(trade.direction)
              const dirLabel = trade.direction === 'long' ? '↗ LONG' : '↘ SHORT'

              return (
                <div
                  key={trade.id}
                  onClick={() => onTradeClick(trade)}
                  className="grid px-5 items-center cursor-pointer"
                  style={{
                    gridTemplateColumns: '90px 1fr 80px 110px 70px 70px',
                    gap: '16px',
                    padding: '11px 20px',
                    borderBottom: '1px solid var(--border-raw)',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="num text-xs" style={{ color: 'var(--fg-3)' }}>
                    {format(parseISO(trade.traded_at), 'dd.MM.yy', { locale: de })}
                    <div style={{ color: 'var(--fg-4)', fontSize: '10px', marginTop: '1px' }}>
                      {format(parseISO(trade.traded_at), 'HH:mm', { locale: de })}
                    </div>
                  </div>
                  <div>
                    <span className="ticker text-[13px]" style={{ color: 'var(--fg-1)' }}>{trade.asset}</span>
                    {trade.setup_type && (
                      <span className="text-xs ml-2" style={{ color: 'var(--fg-3)' }}>{trade.setup_type}</span>
                    )}
                  </div>
                  <div className="num text-[11px] font-semibold" style={{ color: dirColor }}>{dirLabel}</div>
                  <div className="num text-sm font-semibold text-right" style={getPnlStyle(pnl)}>
                    {pnl !== null ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} €` : '—'}
                  </div>
                  <div className="num text-xs text-right" style={{ color: 'var(--fg-3)' }}>
                    {trade.rr_ratio !== null ? `${trade.rr_ratio}R` : '—'}
                  </div>
                  <div><OutcomeBadge outcome={trade.outcome} /></div>
                </div>
              )
            })}
          </div>

          {/* ── Mobile cards (<768px) ──────────────────────────────── */}
          <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-raw)' }}>
            {trades.map(trade => {
              const pnl = trade.result_currency
              const dirColor = getDirectionColor(trade.direction)
              const dirLabel = trade.direction === 'long' ? 'LONG' : 'SHORT'

              return (
                <div
                  key={trade.id}
                  onClick={() => onTradeClick(trade)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:opacity-70"
                  style={{ borderBottom: '1px solid var(--border-raw)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="ticker text-[14px] font-semibold truncate" style={{ color: 'var(--fg-1)' }}>
                        {trade.asset}
                      </span>
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: dirColor }}>
                        {dirLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="num text-[11px]" style={{ color: 'var(--fg-3)' }}>
                        {format(parseISO(trade.traded_at), 'dd.MM.yy', { locale: de })}
                      </span>
                      {trade.setup_type && (
                        <span className="text-[11px] truncate" style={{ color: 'var(--fg-4)' }}>
                          · {trade.setup_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="num text-sm font-semibold" style={getPnlStyle(pnl)}>
                      {pnl !== null ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} €` : '—'}
                    </span>
                    <OutcomeBadge outcome={trade.outcome} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
