'use client'

import {
  TrendingUp, TrendingDown, Activity, Target, BarChart2, AlertTriangle,
} from 'lucide-react'

interface KpiCardProps {
  label: string
  value: React.ReactNode
  sub?: string
  accentColor?: string
  accentBg?: string
  icon?: React.ElementType
}

function KpiCard({ label, value, sub, accentColor, accentBg, icon: Icon }: KpiCardProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: `2px solid ${accentColor ?? 'rgba(255,255,255,0.15)'}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="metric truncate leading-none"
          style={{ color: 'var(--fg-1)', fontSize: '26px' }}
        >
          {value}
        </div>
        {Icon && (
          <div
            className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center"
            style={{
              background: accentBg ?? 'rgba(255,255,255,0.06)',
              color: accentColor ?? 'var(--fg-4)',
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="eyebrow">{label}</div>
      {sub && (
        <div className="num text-xs mt-0.5" style={{ color: 'var(--fg-4)' }}>
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

  const hasTrades = tradeCount > 0

  const pnlValue = !hasTrades ? (
    <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>
      Keine Trades
    </span>
  ) : (
    <span style={pnlStyle(pnl)}>{formatPnl(pnl)}</span>
  )

  const pnlAccent = !hasTrades
    ? 'rgba(255,255,255,0.15)'
    : pnl > 0 ? '#089981' : pnl < 0 ? '#F23645' : 'rgba(255,255,255,0.15)'
  const pnlAccentBg = !hasTrades
    ? 'rgba(255,255,255,0.06)'
    : pnl > 0 ? 'rgba(8,153,129,0.12)' : pnl < 0 ? 'rgba(242,54,69,0.12)' : 'rgba(255,255,255,0.06)'
  const PnlIcon = !hasTrades ? TrendingUp : pnl >= 0 ? TrendingUp : TrendingDown

  const winRateValue = winRate === null ? (
    <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>—</span>
  ) : `${winRate.toFixed(1)}%`
  const winRateAccent = winRate === null ? 'rgba(255,255,255,0.15)' : winRate >= 50 ? '#089981' : '#F23645'
  const winRateAccentBg = winRate === null ? 'rgba(255,255,255,0.06)' : winRate >= 50 ? 'rgba(8,153,129,0.12)' : 'rgba(242,54,69,0.12)'

  const rrValue = avgRR === null ? (
    <span className="text-sm font-normal" style={{ color: 'var(--fg-3)' }}>—</span>
  ) : `1:${avgRR.toFixed(2)}`

  const ddAccent = (drawdownPct ?? 0) > 10
    ? '#F23645'
    : (drawdownPct ?? 0) > 5 ? '#FF9800' : '#089981'
  const ddAccentBg = (drawdownPct ?? 0) > 10
    ? 'rgba(242,54,69,0.12)'
    : (drawdownPct ?? 0) > 5 ? 'rgba(255,152,0,0.12)' : 'rgba(8,153,129,0.12)'
  const ddStyle: React.CSSProperties = { color: ddAccent }

  return (
    <div
      className={
        tab === 'month'
          ? 'grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : 'grid gap-3 grid-cols-2 sm:grid-cols-4'
      }
    >
      <KpiCard
        label={pnlLabel}
        value={pnlValue}
        sub={hasTrades ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%` : undefined}
        accentColor={pnlAccent}
        accentBg={pnlAccentBg}
        icon={PnlIcon}
      />
      <KpiCard
        label="Trades"
        value={<span style={{ color: 'var(--fg-1)' }}>{tradeCount}</span>}
        accentColor="#2962FF"
        accentBg="rgba(41,98,255,0.12)"
        icon={Activity}
      />
      <KpiCard
        label="Win Rate"
        value={winRateValue}
        accentColor={winRateAccent}
        accentBg={winRateAccentBg}
        icon={Target}
      />
      <KpiCard
        label="Ø Risk/Reward"
        value={rrValue}
        accentColor="#2962FF"
        accentBg="rgba(41,98,255,0.12)"
        icon={BarChart2}
      />
      {tab === 'month' && drawdownPct !== undefined && (
        <KpiCard
          label="Max. Drawdown"
          value={<span style={ddStyle}>{drawdownPct.toFixed(2)}%</span>}
          sub={drawdownPct > 10 ? 'Kritisch' : drawdownPct > 5 ? 'Erhöht' : undefined}
          accentColor={ddAccent}
          accentBg={ddAccentBg}
          icon={AlertTriangle}
        />
      )}
    </div>
  )
}
