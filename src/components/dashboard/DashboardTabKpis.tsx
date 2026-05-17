'use client'

import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: React.ReactNode
  sub?: string
}

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="eyebrow mb-2">{label}</div>
      <div className="metric truncate" style={{ color: 'var(--fg-1)' }}>
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
      />
      <KpiCard
        label="Trades"
        value={<span style={{ color: 'var(--fg-1)' }}>{tradeCount}</span>}
      />
      <KpiCard label="Win Rate" value={winRateValue} />
      <KpiCard label="Ø Risk/Reward" value={rrValue} />
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
        />
      )}
    </div>
  )
}
