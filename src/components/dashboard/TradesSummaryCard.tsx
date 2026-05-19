'use client'

import Link from 'next/link'
import type { Trade } from '@/hooks/useTrades'

interface Props {
  trades: Trade[]
}

export function TradesSummaryCard({ trades }: Props) {
  const wins   = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const longs  = trades.filter(t => t.direction === 'long').length
  const shorts = trades.filter(t => t.direction === 'short').length
  const total  = trades.length
  const decided = wins + losses

  // SVG donut: r=42, circumference = 2π×42 ≈ 263.9
  const circ   = 263.9
  const winArc  = decided > 0 ? (wins / decided) * circ : 0
  const lossArc = circ - winArc

  const card: React.CSSProperties = {
    background: '#111118',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  }

  const legend: { label: string; count: number; color: string }[] = [
    { label: 'Win',   count: wins,   color: '#089981' },
    { label: 'Loss',  count: losses, color: '#F23645' },
    { label: 'Long',  count: longs,  color: '#2962ff' },
    { label: 'Short', count: shorts, color: '#00C4FF' },
  ]

  return (
    <div className="rounded-2xl p-5" style={card}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold" style={{ color: '#fff' }}>Trades</div>
        <Link href="/journal" className="dash-action-btn text-xs" style={{ color: '#00C4FF', padding: 0 }}>
          Details →
        </Link>
      </div>

      <div className="text-xs mb-1" style={{ color: '#555' }}>Trades gesamt</div>
      <div className="num text-2xl font-bold mb-3" style={{ color: '#fff' }}>
        {total}
        {total > 0 && <span style={{ color: '#089981', fontSize: 14, marginLeft: 6 }}>↑</span>}
      </div>

      <div className="flex gap-4 items-center">
        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1">
          {legend.map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2 text-xs" style={{ color: '#888' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              {label}
              <span className="ml-auto font-bold" style={{ color: '#fff' }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Donut */}
        <svg viewBox="0 0 110 110" width="110" height="110" style={{ flexShrink: 0 }}>
          <circle cx="55" cy="55" r="42" fill="none" stroke="#1a1a2e" strokeWidth="14" />
          {decided > 0 ? (
            <>
              <circle cx="55" cy="55" r="42" fill="none" stroke="#089981" strokeWidth="14"
                strokeDasharray={`${winArc} ${lossArc}`} strokeDashoffset="0"
                transform="rotate(-90 55 55)" />
              <circle cx="55" cy="55" r="42" fill="none" stroke="#F23645" strokeWidth="14"
                strokeDasharray={`${lossArc} ${winArc}`} strokeDashoffset={-winArc}
                transform="rotate(-90 55 55)" />
            </>
          ) : (
            <circle cx="55" cy="55" r="42" fill="none" stroke="#2a2a3e" strokeWidth="14" />
          )}
          <text x="55" y="51" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">{total}</text>
          <text x="55" y="63" textAnchor="middle" fontSize="8" fill="#555">Trades</text>
        </svg>
      </div>
    </div>
  )
}
