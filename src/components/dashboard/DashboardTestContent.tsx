'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { useAccountContext } from '@/contexts/AccountContext'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import type { DashboardMetrics, EquityPoint } from '@/hooks/useDashboardMetrics'
import type { Trade } from '@/hooks/useTrades'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

type TabKey = 'today' | 'week' | 'month'

// ── helpers ────────────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().split('T')[0] }
function weekStartISO() {
  const d = new Date(); const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1); return d.toISOString().split('T')[0]
}
function monthStartISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function startOfPeriod(tab: TabKey) {
  return tab === 'today' ? todayISO() : tab === 'week' ? weekStartISO() : monthStartISO()
}

function calcKpis(trades: Trade[], startBalance: number) {
  const pnl = trades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  const pnlPct = startBalance > 0 ? (pnl / startBalance) * 100 : 0
  const decided = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  const wins = decided.filter(t => t.outcome === 'win')
  const winRate = decided.length > 0 ? (wins.length / decided.length) * 100 : null
  const rrTrades = trades.filter(t => t.rr_ratio !== null)
  const avgRR = rrTrades.length > 0 ? rrTrades.reduce((s, t) => s + t.rr_ratio!, 0) / rrTrades.length : null
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
    tradeCount: trades.length,
    winRate: winRate !== null ? Math.round(winRate * 10) / 10 : null,
    avgRR: avgRR !== null ? Math.round(avgRR * 100) / 100 : null,
  }
}

function buildCurve(trades: Trade[], startBalance: number): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => a.traded_at.localeCompare(b.traded_at))
  const map = new Map<string, number>()
  for (const t of sorted) {
    const date = t.traded_at.split('T')[0]
    map.set(date, (map.get(date) ?? 0) + (t.result_currency ?? 0))
  }
  let balance = startBalance
  return [...map.entries()].sort().map(([date, delta]) => {
    balance += delta
    return { date, balance: Math.round(balance * 100) / 100, delta }
  })
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: EquityPoint }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg px-3 py-1.5 text-xs" style={{ background: '#fff', color: '#111' }}>
      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: '#089981' }} />
      {p.date} · {p.balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
    </div>
  )
}

// ── Balance Card ───────────────────────────────────────────────────────────

interface BalanceCardProps {
  trades: Trade[]
  curve: EquityPoint[]
  startBalance: number
  currentBalance: number
  tab: TabKey
}

function BalanceCard({ trades, curve, startBalance, currentBalance, tab }: BalanceCardProps) {
  const [view, setView] = useState<'pnl' | 'balance'>('pnl')
  const kpis = useMemo(() => calcKpis(trades, startBalance), [trades, startBalance])

  const isProfit = kpis.pnl >= 0
  const lineColor = isProfit ? '#089981' : '#F23645'
  const balanceDelta = currentBalance - startBalance

  const yMin = curve.length > 0 ? Math.min(...curve.map(p => p.balance), startBalance) * 0.995 : startBalance * 0.99
  const yMax = curve.length > 0 ? Math.max(...curve.map(p => p.balance), startBalance) * 1.005 : startBalance * 1.01

  const topAssets = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trades) map.set(t.asset, (map.get(t.asset) ?? 0) + (t.result_currency ?? 0))
    return [...map.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4)
  }, [trades])

  const pnlLabel = tab === 'today' ? 'Tages P&L' : tab === 'week' ? 'Wochen P&L' : 'Monats P&L'

  return (
    <div className="rounded-2xl p-5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      {/* Toggles */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setView('pnl')} className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{ background: view === 'pnl' ? '#fff' : '#1e1e2e', color: view === 'pnl' ? '#111' : '#666' }}>
          {pnlLabel}
        </button>
        <button onClick={() => setView('balance')} className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{ background: view === 'balance' ? '#fff' : '#1e1e2e', color: view === 'balance' ? '#111' : '#666' }}>
          Kontostand
        </button>
      </div>

      {/* Main body */}
      <div className="flex gap-5 items-start">
        {/* Left: numbers */}
        <div className="shrink-0" style={{ width: 220 }}>
          {view === 'pnl' ? (
            <>
              <div className="num font-bold leading-none mb-2"
                style={{ fontSize: 36, color: kpis.tradeCount === 0 ? 'rgba(255,255,255,0.3)' : lineColor }}>
                {kpis.tradeCount === 0 ? '—'
                  : `${kpis.pnl >= 0 ? '+' : ''}${kpis.pnl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
              </div>
              {kpis.tradeCount > 0 && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mb-3"
                  style={{ background: isProfit ? '#0b2e24' : '#2e0b0b', color: lineColor }}>
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
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mb-3"
                style={{ background: balanceDelta >= 0 ? '#0b2e24' : '#2e0b0b', color: balanceDelta >= 0 ? '#089981' : '#F23645' }}>
                {balanceDelta >= 0 ? '↑' : '↓'} {balanceDelta >= 0 ? '+' : ''}{balanceDelta.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div className="text-xs" style={{ color: '#555' }}>
                Startkapital: <strong style={{ color: '#d1d4dc' }}>{startBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
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
                  <linearGradient id="test-bc-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false}
                  tickFormatter={d => { const [,m,day] = d.split('-'); return `${day}.${m}` }} interval="preserveStartEnd" />
                <YAxis hide domain={[yMin, yMax]} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={startBalance} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="balance" stroke={lineColor} strokeWidth={2}
                  fill="url(#test-bc-grad)" dot={false} activeDot={{ r: 4, fill: lineColor, stroke: 'none' }} />
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

// ── Trades Summary (Donut) ─────────────────────────────────────────────────

function TradesSummaryCard({ trades }: { trades: Trade[] }) {
  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const longs = trades.filter(t => t.direction === 'long').length
  const shorts = trades.filter(t => t.direction === 'short').length
  const total = trades.length
  const decided = wins + losses

  // SVG donut: circumference of r=42 → 2π×42 ≈ 263.9
  const circ = 263.9
  const winArc = decided > 0 ? (wins / decided) * circ : 0
  const lossArc = circ - winArc

  return (
    <div className="rounded-2xl p-5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold" style={{ color: '#fff' }}>Trades</div>
        <Link href="/journal" className="text-xs flex items-center gap-1" style={{ color: '#ff8210' }}>
          Details →
        </Link>
      </div>

      <div className="text-xs mb-1" style={{ color: '#555' }}>Trades gesamt</div>
      <div className="num text-2xl font-bold mb-3" style={{ color: '#fff' }}>
        {total} {total > 0 && <span style={{ color: '#089981', fontSize: 14 }}>↑</span>}
      </div>

      <div className="flex gap-4 items-center">
        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1">
          {[
            { label: 'Win', count: wins, color: '#089981' },
            { label: 'Loss', count: losses, color: '#F23645' },
            { label: 'Long', count: longs, color: '#2962ff' },
            { label: 'Short', count: shorts, color: '#ff8210' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2 text-xs" style={{ color: '#aaa' }}>
              <span className="rounded-full shrink-0" style={{ width: 10, height: 10, background: color, display: 'inline-block' }} />
              {label}
              <span className="ml-auto font-semibold" style={{ color: '#fff' }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Donut */}
        <svg viewBox="0 0 110 110" width="110" height="110" style={{ flexShrink: 0 }}>
          <circle cx="55" cy="55" r="42" fill="none" stroke="#1a1a2e" strokeWidth="14" />
          {decided > 0 ? (
            <>
              <circle cx="55" cy="55" r="42" fill="none" stroke="#089981" strokeWidth="14"
                strokeDasharray={`${winArc} ${lossArc}`} strokeDashoffset="0"
                transform="rotate(-90 55 55)" />
              <circle cx="55" cy="55" r="42" fill="none" stroke="#F23645" strokeWidth="14"
                strokeDasharray={`${lossArc} ${winArc}`} strokeDashoffset={-winArc}
                transform="rotate(-90 55 55)" />
            </>
          ) : (
            <circle cx="55" cy="55" r="42" fill="none" stroke="#2a2a3e" strokeWidth="14" />
          )}
          <text x="55" y="51" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">{total}</text>
          <text x="55" y="63" textAnchor="middle" fontSize="8" fill="#666">Trades</text>
        </svg>
      </div>
    </div>
  )
}

// ── Recent Trades Table ────────────────────────────────────────────────────

function RecentTradesCard({ trades }: { trades: Trade[] }) {
  const recent = trades.slice(0, 5)
  return (
    <div className="rounded-2xl p-5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold" style={{ color: '#fff' }}>Recent Trades</div>
        <Link href="/journal" className="text-xs flex items-center gap-1" style={{ color: '#ff8210' }}>
          Details →
        </Link>
      </div>

      {/* Header */}
      <div className="grid gap-2 pb-2 mb-1" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: '1px solid #1e1e2e' }}>
        {['Asset', 'Richtung', 'P&L', 'Status'].map(h => (
          <span key={h} className="text-xs uppercase" style={{ color: '#444', letterSpacing: '0.06em', fontSize: 10 }}>{h}</span>
        ))}
      </div>

      {recent.length === 0 ? (
        <div className="text-xs py-6 text-center" style={{ color: '#444' }}>Keine Trades im Zeitraum</div>
      ) : (
        recent.map((t, i) => {
          const pnl = t.result_currency ?? 0
          const isWin = t.outcome === 'win'
          const isLoss = t.outcome === 'loss'
          const dir = t.direction === 'long' ? '▲ Long' : t.direction === 'short' ? '▼ Short' : '—'
          const dirColor = t.direction === 'long' ? '#089981' : t.direction === 'short' ? '#F23645' : '#666'
          return (
            <div key={t.id} className="grid gap-2 py-2 items-center text-xs"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: i < recent.length - 1 ? '1px solid #1a1a28' : 'none' }}>
              <span style={{ color: '#ccc' }}>{t.asset}</span>
              <span style={{ color: dirColor }}>{dir}</span>
              <span style={{ color: pnl >= 0 ? '#089981' : '#F23645' }}>
                {pnl >= 0 ? '+' : ''}{pnl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
              <span className="font-bold px-1.5 py-0.5 rounded text-center"
                style={{
                  background: isWin ? '#0b2e24' : isLoss ? '#2e0b0b' : '#1e1e2e',
                  color: isWin ? '#089981' : isLoss ? '#F23645' : '#666',
                  fontSize: 10,
                  display: 'inline-block',
                }}>
                {isWin ? 'WIN' : isLoss ? 'LOSS' : '—'}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function DashboardTestContent() {
  const { activeAccount, isLoading: accountLoading } = useAccountContext()
  const { fetchMetrics } = useDashboardMetrics()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('today')
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => setDisplayName(d.display_name ?? null)).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!activeAccount) return
    setIsLoading(true)
    try { setMetrics(await fetchMetrics(null)) } finally { setIsLoading(false) }
  }, [activeAccount, fetchMetrics])

  useEffect(() => { load() }, [load])

  const startBalance = activeAccount?.start_balance ?? 0

  const periodTrades = useMemo(() => {
    if (!metrics) return []
    const since = startOfPeriod(tab)
    return metrics.allTrades.filter(t => t.traded_at >= since)
  }, [metrics, tab])

  const curve = useMemo(() => buildCurve(periodTrades, startBalance), [periodTrades, startBalance])

  const currentBalance = useMemo(() => {
    if (!metrics || metrics.allTrades.length === 0) return startBalance
    const pnl = metrics.allTrades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    return startBalance + pnl
  }, [metrics, startBalance])

  if (accountLoading || isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    )
  }

  const now = new Date()
  const greetingBase = now.getHours() < 12 ? 'Guten Morgen' : now.getHours() < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* TEST BANNER */}
      <div className="rounded-lg px-4 py-2.5 text-xs font-semibold flex items-center gap-2"
        style={{ background: 'rgba(255,130,16,0.1)', border: '1px solid rgba(255,130,16,0.3)', color: '#ff8210' }}>
        <span>🧪</span>
        <span>Design-Test — Diese Seite zeigt das neue Dashboard-Design mit echten Daten. Das bestehende Dashboard bleibt unverändert.</span>
        <Link href="/dashboard" className="ml-auto underline opacity-70 hover:opacity-100">→ Zum echten Dashboard</Link>
      </div>

      {/* Greeting + Period tabs */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs" style={{ color: '#888' }}>{greetingBase}{displayName ? `, ${displayName}` : ''}.</div>
          <div className="text-2xl font-extrabold" style={{ color: '#fff' }}>Willkommen zurück!</div>
        </div>
        <div className="flex items-center gap-1.5">
          {(['today', 'week', 'month'] as TabKey[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#111' : '#666' }}>
              {t === 'today' ? 'Heute' : t === 'week' ? 'Woche' : 'Monat'}
            </button>
          ))}
        </div>
      </div>

      {/* Balance card */}
      <BalanceCard
        trades={periodTrades}
        curve={curve}
        startBalance={startBalance}
        currentBalance={currentBalance}
        tab={tab}
      />

      {/* Bottom row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TradesSummaryCard trades={periodTrades} />
        <RecentTradesCard trades={periodTrades} />
      </div>
    </div>
  )
}
