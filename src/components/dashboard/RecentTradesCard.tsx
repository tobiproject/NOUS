'use client'

import Link from 'next/link'
import type { Trade } from '@/hooks/useTrades'

interface Props {
  trades: Trade[]
  onTradeClick: (trade: Trade) => void
  emptyMessage?: string
}

const COLS = '2fr 1fr 1fr 1fr'

export function RecentTradesCard({ trades, onTradeClick, emptyMessage = 'Keine Trades' }: Props) {
  const recent = [...trades].reverse().slice(0, 6)

  const card: React.CSSProperties = {
    background: '#111118',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  }

  return (
    <div className="rounded-2xl p-5" style={card}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold" style={{ color: '#fff' }}>Recent Trades</div>
        <Link href="/journal" className="dash-action-btn text-xs" style={{ color: '#00C4FF', padding: 0 }}>
          Details →
        </Link>
      </div>

      {/* Header row */}
      <div className="grid items-center pb-2 mb-1"
        style={{ gridTemplateColumns: COLS, borderBottom: '1px solid #1e1e2e' }}>
        {['Asset', 'Richtung', 'P&L', 'Status'].map(h => (
          <span key={h} style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
        ))}
      </div>

      {recent.length === 0 ? (
        <div className="text-xs py-6 text-center" style={{ color: '#444' }}>{emptyMessage}</div>
      ) : (
        recent.map((t, i) => {
          const pnl    = t.result_currency ?? 0
          const isWin  = t.outcome === 'win'
          const isLoss = t.outcome === 'loss'
          const dir    = t.direction === 'long' ? '▲ Long' : t.direction === 'short' ? '▼ Short' : '—'
          const dirColor = t.direction === 'long' ? '#089981' : t.direction === 'short' ? '#F23645' : '#666'

          return (
            <button
              key={t.id}
              onClick={() => onTradeClick(t)}
              className="grid w-full text-left items-center py-2 transition-colors hover:bg-white/[0.03] rounded"
              style={{
                gridTemplateColumns: COLS,
                borderBottom: i < recent.length - 1 ? '1px solid #1a1a28' : 'none',
                gap: '0.5rem',
              }}
            >
              <span className="text-xs" style={{ color: '#ccc' }}>{t.asset}</span>
              <span className="text-xs" style={{ color: dirColor }}>{dir}</span>
              <span className="num text-xs font-semibold" style={{ color: pnl >= 0 ? '#089981' : '#F23645' }}>
                {pnl >= 0 ? '+' : ''}{pnl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
              <span className="num font-bold text-center rounded px-1.5 py-0.5" style={{
                fontSize: 10,
                background: isWin ? '#0b2e24' : isLoss ? '#2e0b0b' : '#1e1e2e',
                color:      isWin ? '#089981' : isLoss ? '#F23645' : '#666',
                display: 'inline-block',
              }}>
                {isWin ? 'WIN' : isLoss ? 'LOSS' : '—'}
              </span>
            </button>
          )
        })
      )}
    </div>
  )
}
