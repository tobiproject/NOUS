'use client'

export interface TabKpiData {
  pnl: number
  pnlPct: number
  tradeCount: number
  winRate: number | null
  avgRR: number | null
  drawdownPct?: number
}

interface CellProps {
  label: string
  value: React.ReactNode
  sub?: string
  last?: boolean
}

function Cell({ label, value, sub, last }: CellProps) {
  return (
    <div
      className="flex-1 min-w-[80px] px-4 py-3"
      style={last ? undefined : { borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="eyebrow mb-1.5" style={{ fontSize: '10px' }}>{label}</div>
      <div className="num text-lg font-bold leading-none" style={{ color: 'var(--fg-1)' }}>
        {value}
      </div>
      {sub && (
        <div className="num text-xs mt-1" style={{ color: 'var(--fg-4)' }}>{sub}</div>
      )}
    </div>
  )
}

interface Props {
  data: TabKpiData
  tab: 'today' | 'week' | 'month'
}

export function DashboardTabKpis({ data, tab }: Props) {
  const { tradeCount, winRate, avgRR, drawdownPct } = data

  const winRateColor = winRate === null ? 'var(--fg-4)' : winRate >= 50 ? 'var(--long)' : 'var(--short)'
  const ddColor = (drawdownPct ?? 0) > 10 ? 'var(--short)' : (drawdownPct ?? 0) > 5 ? 'var(--warn)' : 'var(--long)'

  const hasDd = tab === 'month' && drawdownPct !== undefined

  return (
    <div
      className="rounded-xl flex flex-wrap"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        overflow: 'hidden',
      }}
    >
      <Cell
        label="Trades"
        value={<span style={{ color: 'var(--fg-1)' }}>{tradeCount}</span>}
      />
      <Cell
        label="Win Rate"
        value={
          winRate === null
            ? <span style={{ color: 'var(--fg-4)' }}>—</span>
            : <span style={{ color: winRateColor }}>{winRate.toFixed(1)}%</span>
        }
      />
      <Cell
        label="Ø Risk/Reward"
        value={
          avgRR === null
            ? <span style={{ color: 'var(--fg-4)' }}>—</span>
            : <span style={{ color: 'var(--brand-blue)' }}>1:{avgRR.toFixed(2)}</span>
        }
        last={!hasDd}
      />
      {hasDd && (
        <Cell
          label="Max. Drawdown"
          value={<span style={{ color: ddColor }}>{drawdownPct!.toFixed(2)}%</span>}
          sub={drawdownPct! > 10 ? 'Kritisch' : drawdownPct! > 5 ? 'Erhöht' : undefined}
          last
        />
      )}
    </div>
  )
}
