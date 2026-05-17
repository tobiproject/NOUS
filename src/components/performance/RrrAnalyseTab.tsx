'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
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

const DIST_BUCKETS = [
  { label: '<0.5R', min: -Infinity, max: 0.5 },
  { label: '0.5R',  min: 0.5,  max: 0.75 },
  { label: '0.75R', min: 0.75, max: 1.0  },
  { label: '1R',    min: 1.0,  max: 1.25 },
  { label: '1.25R', min: 1.25, max: 1.5  },
  { label: '1.5R',  min: 1.5,  max: 2.0  },
  { label: '2R',    min: 2.0,  max: 3.0  },
  { label: '>3R',   min: 3.0,  max: Infinity },
]

function confidenceLabel(n: number): { label: string; color: string } {
  if (n < 20)  return { label: 'Zu wenig Daten',      color: 'var(--short)' }
  if (n < 50)  return { label: 'Erste Tendenz',        color: '#f59e0b' }
  if (n < 100) return { label: 'Mittlere Konfidenz',   color: '#f59e0b' }
  if (n < 200) return { label: 'Gute Konfidenz',       color: 'var(--long)' }
  return              { label: 'Hohe Konfidenz',        color: 'var(--long)' }
}

export function RrrAnalyseTab({ trades }: Props) {
  const { winRate, closed, total, trueRRValues, distribution, scenarios, optimalRR } = useMemo(() => {
    const wins  = trades.filter(t => t.outcome === 'win').length
    const losses = trades.filter(t => t.outcome === 'loss').length
    const closed = wins + losses
    const winRate = closed >= 5 ? wins / closed : null

    const trueRRValues = trades
      .filter(t => typeof t.true_rr === 'number' && t.true_rr !== null)
      .map(t => t.true_rr as number)

    const distribution = DIST_BUCKETS.map(b => ({
      label: b.label,
      count: trueRRValues.filter(v => v >= b.min && v < b.max).length,
    }))

    const scenarios = RR_SCENARIOS.map(({ rr, label }) => {
      const needed = 1 / (1 + rr)
      const profitable = winRate !== null && winRate > needed
      const ev = winRate !== null ? winRate * rr - (1 - winRate) * 1 : null
      const gap = winRate !== null ? (winRate - needed) * 100 : null
      return { rr, label, needed: needed * 100, profitable, ev, gap }
    })

    // Optimal = highest EV scenario that is profitable
    const profitable = scenarios.filter(s => s.ev !== null && s.ev > 0)
    const optimalRR = profitable.length > 0
      ? profitable.reduce((best, s) => (s.ev! > best.ev! ? s : best))
      : null

    return { winRate, closed, total: trades.length, trueRRValues, distribution, scenarios, optimalRR }
  }, [trades])

  const conf = confidenceLabel(closed)
  const hasDistData = trueRRValues.length > 0

  return (
    <div className="space-y-6">

      {/* Header KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Trades gesamt" value={String(total)} />
        <Kpi
          label="Trefferquote"
          value={winRate !== null ? `${(winRate * 100).toFixed(1)}%` : '–'}
          color={winRate !== null ? (winRate >= 0.5 ? 'var(--long)' : 'var(--short)') : undefined}
        />
        <Kpi label="Datenbasis" value={conf.label} color={conf.color} sub={`${closed} abgeschl. Trades`} />
      </div>

      {/* First-100 notice */}
      {closed < 100 && (
        <div
          className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
        >
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>
            Du hast erst <strong>{closed}</strong> abgeschlossene Trades.
            Bis zu <strong>100 Trades</strong> empfehlen wir <strong>1:1 RRR</strong> — zu wenig Daten für eine verlässliche Optimierung.
            {closed >= 20 && winRate !== null && ` Erste Tendenz: ${(winRate * 100).toFixed(0)}% Trefferquote.`}
          </span>
        </div>
      )}

      {/* Breakeven Tabelle mit visuellen Balken */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--fg-4)' }}>
          Breakeven-Analyse — Welches RRR ist profitabel?
        </p>
        <div className="space-y-2">
          {scenarios.map((s) => {
            const isOptimal = optimalRR?.rr === s.rr
            const isRecommended = closed < 100 && s.rr === 1.0
            const tqPct = winRate !== null ? winRate * 100 : null
            const profitable = tqPct !== null && tqPct >= s.needed
            const barColor = profitable ? 'var(--long)' : 'var(--short)'
            // Bar width: cap at 100%, scale your TQ within 0–80% range for visual clarity
            const barWidthPct = tqPct !== null ? Math.min(tqPct, 100) : 0
            // Breakeven marker position
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
                {/* Row header */}
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
                    <span style={{ color: 'var(--fg-4)' }}>Deine TQ: <span className="num font-semibold" style={{ color: barColor }}>{tqPct !== null ? `${tqPct.toFixed(1)}%` : '–'}</span></span>
                    <span className="num font-semibold" style={{ color: s.ev !== null ? (s.ev > 0 ? 'var(--long)' : 'var(--short)') : 'var(--fg-4)', minWidth: 48, textAlign: 'right' }}>
                      {s.ev !== null ? (s.ev > 0 ? `+${s.ev.toFixed(2)}R` : `${s.ev.toFixed(2)}R`) : '–'}
                    </span>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="relative h-5 rounded-sm overflow-visible" style={{ background: 'var(--bg-2)' }}>
                  {/* Filled bar — your TQ */}
                  {tqPct !== null && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm transition-all"
                      style={{ width: `${barWidthPct}%`, background: profitable ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)' }}
                    />
                  )}
                  {/* Breakeven marker line */}
                  <div
                    className="absolute inset-y-0 w-0.5 z-10"
                    style={{ left: `${markerPct}%`, background: 'rgba(255,255,255,0.5)' }}
                  />
                  {/* Labels inside bar */}
                  <div className="absolute inset-0 flex items-center px-2 justify-between">
                    <span className="text-[10px] font-semibold" style={{ color: profitable ? '#86efac' : '#fca5a5' }}>
                      {tqPct !== null ? `${tqPct.toFixed(0)}%` : ''}
                    </span>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {s.gap !== null ? (s.gap > 0 ? `+${s.gap.toFixed(1)}% Puffer` : `${s.gap.toFixed(1)}% zu wenig`) : ''}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--fg-4)' }}>
          Weißer Strich = Break-Even-Schwelle. Balken = deine Trefferquote. Grün = profitabel, Rot = nicht profitabel.
        </p>
      </div>

      {/* Recommendation */}
      {winRate !== null && (
        <div
          className="rounded-lg px-4 py-4"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border-1)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-4)' }}>Empfehlung</p>
          {closed < 100 ? (
            <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
              Mit <strong style={{ color: 'var(--fg-1)' }}>{(winRate * 100).toFixed(1)}%</strong> Trefferquote und erst <strong style={{ color: 'var(--fg-1)' }}>{closed}</strong> Trades:
              Bleib beim <strong style={{ color: '#f59e0b' }}>1:1 RRR</strong> bis du 100 Trades hast.
              Danach passt sich die Empfehlung automatisch an.
            </p>
          ) : optimalRR ? (
            <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
              Bei deiner Trefferquote von <strong style={{ color: 'var(--fg-1)' }}>{(winRate * 100).toFixed(1)}%</strong> ist
              {' '}<strong style={{ color: 'var(--brand-blue)', fontSize: '1rem' }}>{optimalRR.label}</strong>{' '}
              dein optimales RRR — Erwartungswert <strong style={{ color: 'var(--long)' }}>+{optimalRR.ev!.toFixed(2)}R</strong> pro Trade.
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--short)' }}>
              Deine aktuelle Trefferquote von <strong>{(winRate * 100).toFixed(1)}%</strong> reicht bei keinem der RRR-Szenarien für Profitabilität.
              Fokus auf Setup-Qualität vor RRR-Optimierung.
            </p>
          )}
        </div>
      )}

      {/* True RR Verteilung */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--fg-4)' }}>
          Wahre RRR-Verteilung
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--fg-4)' }}>
          Wie weit laufen deine Trades wirklich? Basiert auf {trueRRValues.length} Trades mit gespeichertem Max-Kurs.
          {trueRRValues.length === 0 && ' → Trage den Max-Kurs in der Simulation-Tab ein um diese Grafik zu füllen.'}
        </p>
        {hasDistData ? (
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--fg-4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--fg-4)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 6, fontSize: 12 }}
                  formatter={(v) => [`${String(v ?? 0)} Trades`, 'Anzahl']}
                />
                <ReferenceLine x="1R" stroke="var(--brand-blue)" strokeDasharray="3 3" strokeWidth={1.5} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {distribution.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.label === '1R' || d.label === '1.25R' || d.label === '1.5R' || d.label === '2R' || d.label === '>3R'
                        ? 'var(--long)'
                        : 'var(--fg-4)'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className="rounded-lg flex items-center justify-center h-24 text-sm"
            style={{ background: 'var(--bg-3)', border: '1px dashed var(--border-1)', color: 'var(--fg-4)' }}
          >
            Noch keine Max-Kurs-Daten — in Simulation-Tab eintragen
          </div>
        )}
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
