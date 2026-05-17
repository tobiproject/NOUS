'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LabelList, ReferenceLine, CartesianGrid,
} from 'recharts'
import type { Trade } from '@/hooks/useTrades'

interface Props {
  trades: Trade[]
}

const RR_SCENARIOS = [
  { rr: 0.5,  label: '1:0.5' },
  { rr: 0.75, label: '1:0.75' },
  { rr: 1.0,  label: '1:1' },
  { rr: 1.5,  label: '1:1.5' },
  { rr: 2.0,  label: '1:2' },
  { rr: 2.5,  label: '1:2.5' },
  { rr: 3.0,  label: '1:3' },
]

function rrColor(outcome: string | null) {
  if (outcome === 'win') return '#22c55e'
  if (outcome === 'loss') return '#ef4444'
  return '#6b7280'
}

function confidenceLabel(n: number): { label: string; color: string } {
  if (n < 20)  return { label: 'Zu wenig Daten',    color: 'var(--short)' }
  if (n < 50)  return { label: 'Erste Tendenz',      color: '#f59e0b' }
  if (n < 100) return { label: 'Mittlere Konfidenz', color: '#f59e0b' }
  if (n < 200) return { label: 'Gute Konfidenz',     color: 'var(--long)' }
  return              { label: 'Hohe Konfidenz',      color: 'var(--long)' }
}

export function RrrAnalyseTab({ trades }: Props) {
  const { winRate, closed, total, avgTrueRR, trueRRCount, tradeRows, maxRR, scenarios, optimalRR } = useMemo(() => {
    const wins   = trades.filter(t => t.outcome === 'win').length
    const losses = trades.filter(t => t.outcome === 'loss').length
    const closed = wins + losses
    const winRate = closed >= 5 ? wins / closed : null

    // Show all trades that have at least rr_ratio; use true_rr if available, else rr_ratio
    const tradeRows = trades
      .filter(t => t.rr_ratio !== null || t.true_rr !== null)
      .sort((a, b) => b.traded_at.localeCompare(a.traded_at))
      .map(t => {
        const displayRR = (t.true_rr ?? t.rr_ratio) as number
        return {
          id: t.id,
          label: `${t.traded_at.slice(8, 10)}.${t.traded_at.slice(5, 7)}. ${t.asset}`,
          display_rr: displayRR,
          is_true_rr: t.true_rr !== null,
          outcome: t.outcome,
          rr_ratio: t.rr_ratio,
          direction: t.direction,
        }
      })

    const maxRR = Math.max(3, ...tradeRows.map(r => r.display_rr))

    const trueRRCount = trades.filter(t => t.true_rr !== null).length
    const avgTrueRR = trueRRCount > 0
      ? Math.round((trades.filter(t => t.true_rr !== null).reduce((s, t) => s + t.true_rr!, 0) / trueRRCount) * 100) / 100
      : null

    const scenarios = RR_SCENARIOS.map(({ rr, label }) => {
      const needed = 1 / (1 + rr)
      const profitable = winRate !== null && winRate > needed
      const ev = winRate !== null ? winRate * rr - (1 - winRate) * 1 : null
      const gap = winRate !== null ? (winRate - needed) * 100 : null
      return { rr, label, needed: needed * 100, profitable, ev, gap }
    })

    const profitable = scenarios.filter(s => s.ev !== null && s.ev > 0)
    const optimalRR = profitable.length > 0
      ? profitable.reduce((best, s) => (s.ev! > best.ev! ? s : best))
      : null

    return { winRate, closed, total: trades.length, avgTrueRR, trueRRCount, tradeRows, maxRR, scenarios, optimalRR }
  }, [trades])

  const conf = confidenceLabel(closed)
  const chartHeight = Math.max(200, tradeRows.length * 28 + 32)

  return (
    <div className="space-y-6">

      {/* Top KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi
          label="Winrate"
          value={winRate !== null ? `${(winRate * 100).toFixed(1)}%` : '–'}
          color={winRate !== null ? (winRate >= 0.5 ? 'var(--long)' : 'var(--short)') : undefined}
        />
        <Kpi label="Trades gesamt" value={String(total)} />
        <Kpi
          label="Ø True RR"
          value={avgTrueRR !== null ? `${avgTrueRR}R` : '–'}
          sub={trueRRCount > 0 ? `${trueRRCount} mit Max-Kurs` : 'noch keine eingetragen'}
        />
      </div>

      {/* Datenbasis */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
          style={{ background: 'rgba(255,255,255,0.07)', color: conf.color }}>
          {conf.label} · {closed} abgeschl. Trades
        </span>
        {closed < 100 && (
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Empfehlung bis 100 Trades: 1:1 RRR
          </span>
        )}
      </div>

      {/* True RR Balkendiagramm — wie weit liefen die Trades */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>
            RR pro Trade
          </p>
          <p className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
            Grün = Gewinn · Rot = Verlust · gestrichelt = 1R
          </p>
        </div>

        {tradeRows.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm rounded-lg"
            style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-1)', color: 'var(--fg-4)' }}>
            Noch keine Trades vorhanden
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={tradeRows}
              layout="vertical"
              margin={{ top: 4, right: 52, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, Math.ceil(maxRR)]}
                tickCount={Math.ceil(maxRR) + 1}
                tick={{ fontSize: 10, fill: 'var(--fg-4)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}R`}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--fg-4)' }}
                tickLine={false}
                axisLine={false}
                width={88}
                tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 6, fontSize: 12 }}
                formatter={(v, _name, props) => {
                  const row = props?.payload
                  const label = row?.is_true_rr ? 'True RR (Max-Kurs)' : 'Geplant RR'
                  return [`${String(v ?? 0)}R`, label]
                }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <ReferenceLine x={1} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" strokeWidth={1.5} />
              <Bar dataKey="display_rr" radius={[0, 3, 3, 0]} barSize={16}>
                {tradeRows.map((row, i) => (
                  <Cell key={i} fill={rrColor(row.outcome)} fillOpacity={row.is_true_rr ? 0.85 : 0.45} />
                ))}
                <LabelList
                  dataKey="display_rr"
                  position="right"
                  formatter={(v: unknown) => `${String(v ?? 0)}R`}
                  style={{ fontSize: 11, fill: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakeven Szenarien */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-4)' }}>
          Welches RRR ist bei deiner Winrate profitabel?
        </p>
        <div className="space-y-2">
          {scenarios.map((s) => {
            const isOptimal = optimalRR?.rr === s.rr
            const isRecommended = closed < 100 && s.rr === 1.0
            const tqPct = winRate !== null ? winRate * 100 : null
            const profitable = tqPct !== null && tqPct >= s.needed
            const barWidthPct = tqPct !== null ? Math.min(tqPct, 100) : 0
            const markerPct = Math.min(s.needed, 100)

            return (
              <div
                key={s.rr}
                className="rounded-lg px-4 py-3 space-y-2"
                style={{
                  background: isOptimal ? 'rgba(59,130,246,0.08)' : 'var(--bg-3)',
                  border: `1px solid ${isOptimal ? 'rgba(59,130,246,0.35)' : isRecommended ? 'rgba(245,158,11,0.35)' : 'var(--border-1)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold num" style={{ color: 'var(--fg-1)' }}>{s.label}</span>
                    {isOptimal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(59,130,246,0.2)', color: 'var(--brand-blue)' }}>Optimal</span>
                    )}
                    {isRecommended && !isOptimal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>Empfohlen</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span style={{ color: 'var(--fg-4)' }}>Break-Even: <span className="num font-medium" style={{ color: 'var(--fg-2)' }}>{s.needed.toFixed(1)}%</span></span>
                    <span style={{ color: 'var(--fg-4)' }}>Deine TQ: <span className="num font-semibold" style={{ color: profitable ? 'var(--long)' : 'var(--short)' }}>{tqPct !== null ? `${tqPct.toFixed(1)}%` : '–'}</span></span>
                    <span className="num font-semibold" style={{ color: s.ev !== null ? (s.ev > 0 ? 'var(--long)' : 'var(--short)') : 'var(--fg-4)', minWidth: 48, textAlign: 'right' }}>
                      {s.ev !== null ? (s.ev > 0 ? `+${s.ev.toFixed(2)}R` : `${s.ev.toFixed(2)}R`) : '–'}
                    </span>
                  </div>
                </div>

                <div className="relative h-5 rounded-sm" style={{ background: 'var(--bg-2)' }}>
                  {tqPct !== null && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm transition-all"
                      style={{ width: `${barWidthPct}%`, background: profitable ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)' }}
                    />
                  )}
                  <div
                    className="absolute inset-y-0 w-0.5 z-10"
                    style={{ left: `${markerPct}%`, background: 'rgba(255,255,255,0.5)' }}
                  />
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-[10px] font-semibold" style={{ color: profitable ? '#86efac' : '#fca5a5' }}>
                      {tqPct !== null ? `${tqPct.toFixed(0)}%` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--fg-4)' }}>
          Weißer Strich = Break-Even-Schwelle. Grün = profitabel, Rot = nicht profitabel.
        </p>
      </div>

    </div>
  )
}

function Kpi({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="rounded-lg px-4 py-3" style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)' }}>
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--fg-4)' }}>{label}</p>
      <p className="text-lg font-bold num" style={{ color: color ?? 'var(--fg-1)' }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-4)' }}>{sub}</p>}
    </div>
  )
}
