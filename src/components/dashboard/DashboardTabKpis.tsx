'use client'

import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: React.ReactNode
  sub?: string
  topColor?: string
}

function KpiCard({ label, value, sub, topColor }: KpiCardProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: `2px solid ${topColor ?? 'rgba(255,255,255,0.15)'}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="eyebrow mb-2">{label}</div>
      <div
        className="metric truncate"
        style={{ color: 'var(--fg-1)', fontSize: '28px' }}
      >
        {value}
      </div>
      {sub && (
        <div className="num mt-1 text-xs" style={{ color: 'var(--fg-3)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function pnlStyle(val: number): React.CSSProperties {
  if (val > 0) return { color: 'var(--long)' }
  if (val < 0) return { color: 'var(--short)' }
  return { color: 'var(--fg-3)' }
}

function formatPnl(val: number) {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)} €`
}

export interface TabKpiData {
  pnl: number
  pnlPct: number
  tradeCount: number
  winRate: number | null
  avgRR: number | null
  drawdownPct?: number
}

interface Props {
  data: TabKpiData
  tab: 'today' | 'week' | 'month'
}

export function DashboardTabKpis({ data, tab }: Props) {
  const { pnl, pnlPct, tradeCount, winRate, avgRR, drawdownPct } = data

  const pnlLabel =
    tab === 'today' ? 'Tages-P&L' : tab === 'week' ? 'Wochen-P&L' : 'Monats-P&L'

  const pnlValue =
    tradeCount === 0 ? (
      <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>
        Keine Trades
      </span>
    ) : (
      <span style={pnlStyle(pnl)}>{formatPnl(pnl)}</span>
    )

  const winRateValue =
    winRate === null ? (
      <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>
        —
      </span>
    ) : (
      `${winRate.toFixed(1)}%`
    )

  const rrValue =
    avgRR === null ? (
      <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>
        —
      </span>
    ) : (
      `1:${avgRR.toFixed(2)}`
    )

  const ddStyle: React.CSSProperties =
    (drawdownPct ?? 0) > 10
      ? { color: 'var(--short)' }
      : (drawdownPct ?? 0) > 5
      ? { color: 'var(--warn)' }
      : { color: 'var(--long)' }

  const pnlTopColor =
    tradeCount === 0
      ? 'rgba(255,255,255,0.18)'
      : pnl > 0
      ? '#089981'
      : pnl < 0
      ? '#F23645'
      : 'rgba(255,255,255,0.18)'

  const winRateTopColor =
    winRate === null
      ? 'rgba(255,255,255,0.18)'
      : winRate >= 50
      ? '#089981'
      : '#F23645'

  const drawdownTopColor =
    (drawdownPct ?? 0) > 10
      ? '#F23645'
      : (drawdownPct ?? 0) > 5
      ? '#FF9800'
      : '#089981'

  return (
    <div
      className={cn(
        'grid gap-3',
        tab === 'month'
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-4'
      )}
    >
      <KpiCard
        label={pnlLabel}
        value={pnlValue}
        sub={
          tradeCount > 0
            ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`
            : undefined
        }
        topColor={pnlTopColor}
      />
      <KpiCard
        label="Trades"
        value={<span style={{ color: 'var(--fg-1)' }}>{tradeCount}</span>}
        topColor="#2962FF"
      />
      <KpiCard label="Win Rate" value={winRateValue} topColor={winRateTopColor} />
      <KpiCard label="Ø Risk/Reward" value={rrValue} topColor="#2962FF" />
      {tab === 'month' && drawdownPct !== undefined && (
        <KpiCard
          label="Max. Drawdown"
          value={<span style={ddStyle}>{drawdownPct.toFixed(2)}%</span>}
          sub={
            drawdownPct > 10
              ? 'Kritisch'
              : drawdownPct > 5
              ? 'Erhöht'
              : undefined
          }
          topColor={drawdownTopColor}
        />
      )}
    </div>
  )
}
