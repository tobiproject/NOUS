'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { EquityPoint } from '@/hooks/useDashboardMetrics'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: EquityPoint }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: 'rgba(22,22,22,0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <p className="font-medium" style={{ color: 'var(--fg-1)' }}>{point.date}</p>
      <p className="mt-0.5" style={{ color: 'var(--fg-2)' }}>
        Balance: <span className="font-semibold">{point.balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
      </p>
      {point.delta !== null && (
        <p className="mt-0.5" style={{ color: point.delta >= 0 ? 'var(--long)' : 'var(--short)' }}>
          {point.delta >= 0 ? '+' : ''}{point.delta.toFixed(2)} € vs. Vortag
        </p>
      )}
    </div>
  )
}

interface Props {
  allPoints: EquityPoint[]
  startBalance: number
  currentBalance: number
}

export function EquityCurveChart({ allPoints, startBalance, currentBalance }: Props) {
  const hasData = allPoints.length >= 2
  const delta = currentBalance - startBalance
  const deltaPct = startBalance > 0 ? (delta / startBalance) * 100 : 0
  const isProfit = delta >= 0
  const lineColor = isProfit ? '#089981' : '#F23645'

  const yMin = allPoints.length > 0
    ? Math.min(...allPoints.map(p => p.balance), startBalance) * 0.995
    : startBalance * 0.99
  const yMax = allPoints.length > 0
    ? Math.max(...allPoints.map(p => p.balance), startBalance) * 1.005
    : startBalance * 1.01

  return (
    <div
      className="rounded-xl h-full flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Balance hero */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="eyebrow mb-1.5">Kontostand</div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="metric" style={{ fontSize: '26px', color: 'var(--fg-1)', lineHeight: 1.1 }}>
            {currentBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          <span
            className="num text-xs font-semibold px-2 py-0.5 rounded-md mb-0.5"
            style={{
              background: isProfit ? 'rgba(8,153,129,0.12)' : 'rgba(242,54,69,0.12)',
              color: isProfit ? 'var(--long)' : 'var(--short)',
            }}
          >
            {delta >= 0 ? '+' : ''}{delta.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € ({deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 px-2 py-3" style={{ minHeight: '140px' }}>
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--fg-4)' }}>
            {allPoints.length === 0
              ? 'Noch keine Trades — erfasse deinen ersten Trade.'
              : 'Mehr Trades nötig für die Kurve.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={allPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equity-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={d => {
                  const [, m, day] = d.split('-')
                  return `${day}.${m}`
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={startBalance}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#equity-gradient)"
                dot={false}
                activeDot={{ r: 4, fill: lineColor, stroke: 'none' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
