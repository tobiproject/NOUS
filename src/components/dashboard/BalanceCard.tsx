'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { EquityPoint } from '@/hooks/useDashboardMetrics'
import type { Trade } from '@/hooks/useTrades'
import type { TabKpiData } from './DashboardTabKpis'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: EquityPoint }>
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg px-3 py-1.5 text-xs" style={{ background: '#fff', color: '#111' }}>
      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: '#089981' }} />
      {p.date} · {p.balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
    </div>
  )
}

interface Props {
  kpis: TabKpiData
  curve: EquityPoint[]
  trades: Trade[]
  startBalance: number
  currentBalance: number
  tab: 'today' | 'week' | 'month'
}

export function BalanceCard({ kpis, curve, trades, startBalance, currentBalance, tab }: Props) {
  const [view, setView] = useState<'pnl' | 'balance'>('pnl')

  const isProfit = kpis.pnl >= 0
  const lineColor = isProfit ? '#089981' : '#F23645'

  const yMin = curve.length > 0
    ? Math.min(...curve.map(p => p.balance), startBalance) * 0.995
    : startBalance * 0.99
  const yMax = curve.length > 0
    ? Math.max(...curve.map(p => p.balance), startBalance) * 1.005
    : startBalance * 1.01

  const balanceDelta = currentBalance - startBalance
  const balanceDeltaPct = startBalance > 0 ? (balanceDelta / startBalance) * 100 : 0

  // Per-asset P&L (top 4 by absolute value)
  const topAssets = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trades) {
      map.set(t.asset, (map.get(t.asset) ?? 0) + (t.result_currency ?? 0))
    }
    return [...map.entries()]
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 4)
  }, [trades])

  const pnlLabel = tab === 'today' ? 'Tages P&L' : tab === 'week' ? 'Wochen P&L' : 'Monats P&L'

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Toggle tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setView('pnl')}
          className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            background: view === 'pnl' ? '#fff' : '#1e1e2e',
            color: view === 'pnl' ? '#111' : '#666',
          }}
        >
          {pnlLabel}
        </button>
        <button
          onClick={() => setView('balance')}
          className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            background: view === 'balance' ? '#fff' : '#1e1e2e',
            color: view === 'balance' ? '#111' : '#666',
          }}
        >
          Kontostand
        </button>
      </div>

      {/* Main body */}
      <div className="flex gap-5 items-start">
        {/* Left: numbers */}
        <div className="shrink-0 min-w-0" style={{ width: '220px' }}>
          {view === 'pnl' ? (
            <>
              <div
                className="num font-bold leading-none mb-2"
                style={{ fontSize: 36, color: kpis.tradeCount === 0 ? 'rgba(255,255,255,0.3)' : lineColor }}
              >
                {kpis.tradeCount === 0
                  ? '—'
                  : `${kpis.pnl >= 0 ? '+' : ''}${kpis.pnl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
              </div>
              {kpis.tradeCount > 0 && (
                <div
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mb-3"
                  style={{ background: isProfit ? '#0b2e24' : '#2e0b0b', color: lineColor }}
                >
                  {isProfit ? '↑' : '↓'} {kpis.pnlPct >= 0 ? '+' : ''}{kpis.pnlPct.toFixed(2)}%
                </div>
              )}
              <div className="text-xs mt-1" style={{ color: '#555' }}>
                Kontostand:{' '}
                <strong style={{ color: '#d1d4dc' }}>
                  {currentBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </strong>
                {balanceDelta !== 0 && (
                  <span style={{ color: balanceDelta >= 0 ? '#089981' : '#F23645', marginLeft: 6, fontSize: 11 }}>
                    {balanceDelta >= 0 ? '▲' : '▼'} {Math.abs(balanceDelta).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="num font-bold leading-none mb-2" style={{ fontSize: 36, color: '#fff' }}>
                {currentBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mb-3"
                style={{ background: balanceDelta >= 0 ? '#0b2e24' : '#2e0b0b', color: balanceDelta >= 0 ? '#089981' : '#F23645' }}
              >
                {balanceDelta >= 0 ? '↑' : '↓'} {balanceDelta >= 0 ? '+' : ''}{balanceDelta.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div className="text-xs" style={{ color: '#555' }}>
                Startkapital: <strong style={{ color: '#d1d4dc' }}>{startBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
                <span style={{ color: balanceDeltaPct >= 0 ? '#089981' : '#F23645', marginLeft: 6, fontSize: 11 }}>
                  {balanceDeltaPct >= 0 ? '+' : ''}{balanceDeltaPct.toFixed(2)}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: chart */}
        <div className="flex-1 min-w-0" style={{ height: 100 }}>
          {curve.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 4, right: 4, left: 0, bottom: 16 }}>
                <defs>
                  <linearGradient id="bc-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: '#444' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={d => { const [,m,day] = d.split('-'); return `${day}.${m}` }}
                  interval="preserveStartEnd"
                />
                <YAxis hide domain={[yMin, yMax]} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={startBalance} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill="url(#bc-grad)"
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor, stroke: 'none' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs" style={{ color: '#444' }}>
              {curve.length === 0 ? 'Noch keine Trades' : 'Mehr Trades nötig'}
            </div>
          )}
        </div>
      </div>

      {/* Asset grid */}
      {topAssets.length > 0 && (
        <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: `repeat(${Math.min(topAssets.length, 4)}, 1fr)` }}>
          {topAssets.map(([asset, pnl]) => (
            <div key={asset} className="rounded-xl px-3 py-2.5" style={{ background: '#1a1a28' }}>
              <div className="text-xs mb-1.5" style={{ color: '#555' }}>{asset}</div>
              <div className="num font-bold text-sm flex items-center gap-1" style={{ color: pnl >= 0 ? '#089981' : '#F23645' }}>
                <span>{pnl >= 0 ? '▲' : '▼'}</span>
                <span>{pnl >= 0 ? '+' : ''}{pnl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
