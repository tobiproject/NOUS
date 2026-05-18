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

interface TradeRow {
  id: string
  label: string
  date: string
  asset: string
  display_rr: number
  is_true_rr: boolean
  outcome: string | null
  rr_ratio: number | null
  true_rr: number | null
  direction: 'long' | 'short'
}

function TradeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TradeRow }> }) {
  if (!active || !payload?.[0]) return null
  const row = payload[0].payload
  const isWin = row.outcome === 'win'
  const isLoss = row.outcome === 'loss'
  const outcomeColor = isWin ? '#22c55e' : isLoss ? '#ef4444' : '#6b7280'
  const outcomeLabel = isWin ? 'WIN' : isLoss ? 'LOSS' : row.outcome?.toUpperCase() ?? '–'
  const dirLabel = row.direction === 'long' ? '▲ Long' : '▼ Short'
  const dirColor = row.direction === 'long' ? '#22c55e' : '#ef4444'
  const bonusR = row.is_true_rr && row.rr_ratio && row.true_rr !== null && isWin
    ? row.true_rr - row.rr_ratio
    : null

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: `1px solid ${isWin ? 'rgba(34,197,94,0.3)' : isLoss ? 'rgba(239,68,68,0.3)' : 'var(--border-raw)'}`,
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 190,
      boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
      fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>
          {row.asset}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
          background: `${outcomeColor}22`,
          color: outcomeColor,
          letterSpacing: '0.06em',
        }}>
          {outcomeLabel}
        </span>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <TooltipRow label="Datum"     value={row.date} />
        <TooltipRow label="Richtung"  value={dirLabel} valueColor={dirColor} />
        <TooltipRow label="Geplant"   value={row.rr_ratio !== null ? `${row.rr_ratio}R` : '–'} />
        {row.is_true_rr && row.true_rr !== null && (
          <TooltipRow
            label="Tatsächlich"
            value={`${row.true_rr}R`}
            valueColor={outcomeColor}
            bold
          />
        )}
        {bonusR !== null && bonusR > 0.05 && (
          <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 10, color: '#f59e0b' }}>
            +{bonusR.toFixed(2)}R über Ziel gelaufen
          </div>
        )}
        {bonusR !== null && bonusR < -0.05 && (
          <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {Math.abs(bonusR).toFixed(2)}R vor Ziel geclosed
          </div>
        )}
        {!row.is_true_rr && (
          <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            Geplanter RR — kein Max-Kurs eingetragen
          </div>
        )}
      </div>
    </div>
  )
}

function TooltipRow({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11 }}>
      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span style={{ color: valueColor ?? 'var(--fg-2)', fontWeight: bold ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeCustomTick(chartRows: TradeRow[]) {
  return function CustomYTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
    const row = chartRows.find(r => r.label === payload.value)
    const dirIcon = row?.direction === 'long' ? '▲' : '▼'
    const dirColor = row?.direction === 'long' ? '#22c55e' : '#ef4444'

    return (
      <g transform={`translate(${x},${y})`}>
        {/* Direction indicator */}
        <text x={-90} y={5} textAnchor="start" fill={dirColor} fontSize={8} fontFamily="inherit" opacity={0.7}>
          {dirIcon}
        </text>
        {/* Date — dim, small */}
        <text x={-8} y={-5} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="inherit">
          {row?.date ?? ''}
        </text>
        {/* Asset — bold, prominent */}
        <text x={-8} y={7} textAnchor="end" fill="var(--fg-2)" fontSize={11} fontWeight={600} fontFamily="inherit">
          {row?.asset ?? payload.value}
        </text>
      </g>
    )
  }
}

export function RrrAnalyseTab({ trades }: Props) {
  const { winRate, closed, total, avgTrueRR, trueRRCount, tradeRows, maxRR, scenarios, optimalRR } = useMemo(() => {
    const wins   = trades.filter(t => t.outcome === 'win').length
    const losses = trades.filter(t => t.outcome === 'loss').length
    const closed = wins + losses
    const winRate = closed >= 5 ? wins / closed : null

    const tradeRows: TradeRow[] = trades
      .filter(t => t.rr_ratio !== null || t.true_rr !== null)
      .sort((a, b) => b.traded_at.localeCompare(a.traded_at))
      .map(t => {
        const displayRR = (t.true_rr ?? t.rr_ratio) as number
        const date = `${t.traded_at.slice(8, 10)}.${t.traded_at.slice(5, 7)}.`
        return {
          id: t.id,
          label: `${date} ${t.asset}`,
          date,
          asset: t.asset,
          display_rr: displayRR,
          is_true_rr: t.true_rr !== null,
          outcome: t.outcome,
          rr_ratio: t.rr_ratio,
          true_rr: t.true_rr,
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
  const chartRows = tradeRows.slice(0, 50)
  const chartHeight = Math.max(200, chartRows.length * 34 + 32)
  const CustomYTick = useMemo(() => makeCustomTick(chartRows), [chartRows])

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

      {/* RR Balkendiagramm */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-4)' }}>
            RR pro Trade
            {tradeRows.length > 50 && (
              <span className="ml-2 font-normal normal-case tracking-normal" style={{ color: 'rgba(255,255,255,0.25)' }}>
                letzte 50 von {tradeRows.length}
              </span>
            )}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
            Grün = Gewinn · Rot = Verlust
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34,197,94,0.85)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>True RR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(34,197,94,0.35)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Geplant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.4)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>1R Referenz</span>
          </div>
        </div>

        {tradeRows.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm rounded-lg"
            style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-raw)', color: 'var(--fg-4)' }}>
            Noch keine Trades vorhanden
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartRows}
              layout="vertical"
              margin={{ top: 4, right: 56, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tick={CustomYTick as any}
                tickLine={false}
                axisLine={false}
                width={96}
              />
              <Tooltip
                content={<TradeTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                allowEscapeViewBox={{ x: false, y: false }}
              />
              {/* 1R reference — break-even target */}
              <ReferenceLine x={1} stroke="rgba(255,255,255,0.3)" strokeDasharray="4 3" strokeWidth={1.5} />
              {/* 2R reference — soft goal */}
              <ReferenceLine x={2} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 4" strokeWidth={1} />
              <Bar dataKey="display_rr" radius={[0, 4, 4, 0]} barSize={14}>
                {chartRows.map((row, i) => (
                  <Cell key={i} fill={rrColor(row.outcome)} fillOpacity={row.is_true_rr ? 0.85 : 0.4} />
                ))}
                <LabelList
                  dataKey="display_rr"
                  position="right"
                  formatter={(v: unknown) => `${String(v ?? 0)}R`}
                  style={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        <p className="text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
          ▲ Long · ▼ Short · Gestrichelter Strich = 1R · Schwacher Strich = 2R · Tippe auf einen Balken für Details
        </p>
      </div>

      {/* Breakeven Szenarien — horizontale Scorecard */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-4)' }}>
          Welches RRR ist profitabel?
        </p>

        {/* Sticky header row */}
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border-raw)' }}>
          <table className="w-full text-[11px] border-collapse" style={{ minWidth: 480 }}>
            <thead>
              <tr style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border-raw)' }}>
                <th className="text-left px-3 py-2 font-semibold sticky left-0 z-10" style={{ color: 'var(--fg-4)', background: 'var(--bg-3)', minWidth: 80 }}>
                  RR-Ratio
                </th>
                {scenarios.map(s => {
                  const isOptimal = optimalRR?.rr === s.rr
                  return (
                    <th key={s.rr} className="px-3 py-2 text-center font-bold num" style={{ color: isOptimal ? '#2962FF' : 'var(--fg-2)', whiteSpace: 'nowrap' }}>
                      {s.label}
                      {isOptimal && <span className="block text-[9px] font-semibold" style={{ color: '#2962FF' }}>★ Optimal</span>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {/* Break-Even row */}
              <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border-raw)' }}>
                <td className="px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--fg-4)', background: 'var(--bg-2)' }}>Break-Even WR</td>
                {scenarios.map(s => (
                  <td key={s.rr} className="px-3 py-2 text-center num font-medium" style={{ color: 'var(--fg-3)' }}>
                    {s.needed.toFixed(1)}%
                  </td>
                ))}
              </tr>
              {/* Deine Winrate row */}
              <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border-raw)' }}>
                <td className="px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--fg-4)', background: 'var(--bg-2)' }}>Deine WR</td>
                {scenarios.map(s => {
                  const tqPct = winRate !== null ? winRate * 100 : null
                  const profitable = tqPct !== null && tqPct >= s.needed
                  return (
                    <td key={s.rr} className="px-3 py-2 text-center num font-bold" style={{ color: tqPct !== null ? (profitable ? 'var(--long)' : 'var(--short)') : 'var(--fg-4)' }}>
                      {tqPct !== null ? `${tqPct.toFixed(1)}%` : '–'}
                    </td>
                  )
                })}
              </tr>
              {/* Expected Value row */}
              <tr style={{ background: 'var(--bg-2)' }}>
                <td className="px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--fg-4)', background: 'var(--bg-2)' }}>Erw. Wert (EV)</td>
                {scenarios.map(s => (
                  <td key={s.rr} className="px-3 py-2 text-center num font-bold" style={{ color: s.ev !== null ? (s.ev > 0 ? 'var(--long)' : 'var(--short)') : 'var(--fg-4)' }}>
                    {s.ev !== null ? (s.ev > 0 ? `+${s.ev.toFixed(2)}R` : `${s.ev.toFixed(2)}R`) : '–'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--fg-4)' }}>
          Grün = profitabel bei deiner aktuellen Winrate · ★ = bestes EV
        </p>
      </div>

    </div>
  )
}

function Kpi({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="rounded-lg px-4 py-3" style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}>
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--fg-4)' }}>{label}</p>
      <p className="text-lg font-bold num" style={{ color: color ?? 'var(--fg-1)' }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-4)' }}>{sub}</p>}
    </div>
  )
}
