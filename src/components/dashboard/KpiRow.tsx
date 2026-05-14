'use client'

import { TrendingUp, TrendingDown, CalendarDays, CalendarRange, Target, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardMetrics } from '@/hooks/useDashboardMetrics'

interface KpiCardProps {
  label: string
  value: React.ReactNode
  sub?: string
  valueClass?: string
}

function KpiCard({ label, value, sub, valueClass }: KpiCardProps) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="eyebrow mb-2">{label}</div>
      <div className={cn('metric truncate', valueClass ?? '')} style={{ color: 'var(--fg-1)' }}>
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

function pnlColor(val: number) {
  if (val > 0) return 'text-long'
  if (val < 0) return 'text-short'
  return ''
}

function pnlStyle(val: number): React.CSSProperties {
  if (val > 0) return { color: 'var(--long)' }
  if (val < 0) return { color: 'var(--short)' }
  return { color: 'var(--fg-3)' }
}

function formatPnl(val: number) {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)} €`
}

interface Props {
  metrics: DashboardMetrics
}

export function KpiRow({ metrics }: Props) {
  const ddStyle: React.CSSProperties = metrics.drawdownPct > 10
    ? { color: 'var(--short)' }
    : metrics.drawdownPct > 5
    ? { color: 'var(--warn)' }
    : { color: 'var(--long)' }

  const todayValue = metrics.todayTradeCount === 0
    ? <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>Keine Trades heute</span>
    : (
      <span style={pnlStyle(metrics.todayPnl)}>
        {formatPnl(metrics.todayPnl)}
      </span>
    )

  const winrateValue = metrics.winRate === null
    ? <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>—</span>
    : `${metrics.winRate.toFixed(1)}%`

  const rrValue = metrics.avgRR === null
    ? <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>—</span>
    : `1:${metrics.avgRR.toFixed(2)}`

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard
        label="Tages-P&L"
        value={todayValue}
      />
      <KpiCard
        label="Wochen-P&L"
        value={<span style={pnlStyle(metrics.weekPnl)}>{formatPnl(metrics.weekPnl)}</span>}
      />
      <KpiCard
        label="Monats-P&L"
        value={<span style={pnlStyle(metrics.monthPnl)}>{formatPnl(metrics.monthPnl)}</span>}
      />
      <KpiCard
        label="Win Rate"
        value={winrateValue}
        sub={metrics.winRate !== null ? `${metrics.allTradeCount} Trades` : undefined}
      />
      <KpiCard
        label="Ø Risk/Reward"
        value={rrValue}
      />
      <KpiCard
        label="Drawdown"
        value={<span style={ddStyle}>{metrics.drawdownPct.toFixed(2)}%</span>}
        sub={metrics.drawdownPct > 10 ? 'Kritisch' : metrics.drawdownPct > 5 ? 'Erhöht' : undefined}
      />
    </div>
  )
}
