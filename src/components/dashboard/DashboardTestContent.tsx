'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { useAccountContext } from '@/contexts/AccountContext'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import type { DashboardMetrics, EquityPoint } from '@/hooks/useDashboardMetrics'
import type { Trade } from '@/hooks/useTrades'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

type TabKey = 'today' | 'week' | 'month'

// ── Brand tokens ───────────────────────────────────────────────────────────
const C = {
  brand:       '#00C4FF',
  brandSoft:   'rgba(0,196,255,0.10)',
  brandBorder: 'rgba(0,196,255,0.30)',
  brandGlow:   'rgba(0,196,255,0.22)',
  long:        '#089981',
  short:       '#F23645',
  cardDark:    '#111118',
  cardLight:   '#ffffff',
  bgDark:      '#13131f',
  bgLight:     '#f1f5f9',
  textDark:    '#ffffff',
  textLight:   '#0a0a0a',
}

// ── Helpers ────────────────────────────────────────────────────────────────
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

// ── Chart tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: EquityPoint }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: '#fff', color: '#111', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: C.long }} />
      {p.date} · {p.balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
    </div>
  )
}

// ── Dark-mode toggle ───────────────────────────────────────────────────────
function DarkToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Dark mode toggle"
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        background: dark ? C.brand : 'rgba(255,255,255,0.15)',
        border: `1px solid ${dark ? C.brandBorder : 'rgba(255,255,255,0.2)'}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        flexShrink: 0,
        boxShadow: dark ? `0 0 12px ${C.brandGlow}` : 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: dark ? 22 : 2,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.25s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

// ── Balance card ───────────────────────────────────────────────────────────
interface BCProps { trades: Trade[]; curve: EquityPoint[]; startBalance: number; currentBalance: number; tab: TabKey; dark: boolean }

function BalanceCard({ trades, curve, startBalance, currentBalance, tab, dark }: BCProps) {
  const [view, setView] = useState<'pnl' | 'balance'>('pnl')
  const kpis = useMemo(() => calcKpis(trades, startBalance), [trades, startBalance])
  const isProfit = kpis.pnl >= 0
  const lineColor = isProfit ? C.long : C.short
  const balanceDelta = currentBalance - startBalance
  const yMin = curve.length > 0 ? Math.min(...curve.map(p => p.balance), startBalance) * 0.995 : startBalance * 0.99
  const yMax = curve.length > 0 ? Math.max(...curve.map(p => p.balance), startBalance) * 1.005 : startBalance * 1.01
  const topAssets = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trades) map.set(t.asset, (map.get(t.asset) ?? 0) + (t.result_currency ?? 0))
    return [...map.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4)
  }, [trades])
  const pnlLabel = tab === 'today' ? 'Tages P&L' : tab === 'week' ? 'Wochen P&L' : 'Monats P&L'
  const cardBg = dark ? '#111118' : '#ffffff'
  const cardBorder = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const assetBg = dark ? '#1a1a28' : '#f4f6f9'
  const textMuted = dark ? '#555' : '#888'
  const textSub = dark ? '#d1d4dc' : '#1a1a2e'

  return (
    <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)' }}>
      {/* Toggles */}
      <div className="flex items-center gap-2 mb-4">
        {[{ key: 'pnl', label: pnlLabel }, { key: 'balance', label: 'Kontostand' }].map(({ key, label }) => (
          <button key={key} onClick={() => setView(key as 'pnl' | 'balance')}
            className="pill-btn"
            style={{
              background: view === key ? C.brand : dark ? '#1e1e2e' : '#f0f0f0',
              color: view === key ? '#000' : dark ? '#666' : '#999',
              boxShadow: view === key ? `0 0 14px ${C.brandGlow}` : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex gap-5 items-start">
        <div className="shrink-0" style={{ width: 220 }}>
          {view === 'pnl' ? (
            <>
              <div className="num font-bold leading-none mb-2"
                style={{ fontSize: 36, color: kpis.tradeCount === 0 ? (dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') : lineColor }}>
                {kpis.tradeCount === 0 ? '—'
                  : `${kpis.pnl >= 0 ? '+' : ''}${kpis.pnl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
              </div>
              {kpis.tradeCount > 0 && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mb-3"
                  style={{ background: isProfit ? '#0b2e24' : '#2e0b0b', color: lineColor }}>
                  {isProfit ? '↑' : '↓'} {kpis.pnlPct >= 0 ? '+' : ''}{kpis.pnlPct.toFixed(2)}%
                </div>
              )}
              <div className="text-xs mt-1" style={{ color: textMuted }}>
                Kontostand:{' '}
                <strong style={{ color: textSub }}>
                  {currentBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </strong>
                {balanceDelta !== 0 && (
                  <span style={{ color: balanceDelta >= 0 ? C.long : C.short, marginLeft: 6, fontSize: 11 }}>
                    {balanceDelta >= 0 ? '▲' : '▼'} {Math.abs(balanceDelta).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="num font-bold leading-none mb-2" style={{ fontSize: 36, color: dark ? '#fff' : '#0a0a0a' }}>
                {currentBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mb-3"
                style={{ background: balanceDelta >= 0 ? '#0b2e24' : '#2e0b0b', color: balanceDelta >= 0 ? C.long : C.short }}>
                {balanceDelta >= 0 ? '↑' : '↓'} {balanceDelta >= 0 ? '+' : ''}{balanceDelta.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div className="text-xs" style={{ color: textMuted }}>
                Startkapital: <strong style={{ color: textSub }}>{startBalance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0" style={{ height: 100 }}>
          {curve.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 4, right: 4, left: 0, bottom: 16 }}>
                <defs>
                  <linearGradient id="tc-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: dark ? '#444' : '#bbb' }} tickLine={false} axisLine={false}
                  tickFormatter={d => { const [,m,day] = d.split('-'); return `${day}.${m}` }} interval="preserveStartEnd" />
                <YAxis hide domain={[yMin, yMax]} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={startBalance} stroke={dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="balance" stroke={lineColor} strokeWidth={2}
                  fill="url(#tc-grad)" dot={false} activeDot={{ r: 4, fill: lineColor, stroke: 'none' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs" style={{ color: dark ? '#444' : '#ccc' }}>
              {curve.length === 0 ? 'Noch keine Trades' : 'Mehr Trades nötig'}
            </div>
          )}
        </div>
      </div>

      {/* Asset grid */}
      {topAssets.length > 0 && (
        <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: `repeat(${Math.min(topAssets.length, 4)}, 1fr)` }}>
          {topAssets.map(([asset, pnl]) => (
            <div key={asset} className="rounded-xl px-3 py-2.5" style={{ background: assetBg }}>
              <div className="text-xs mb-1.5" style={{ color: textMuted }}>{asset}</div>
              <div className="num font-bold text-sm flex items-center gap-1" style={{ color: pnl >= 0 ? C.long : C.short }}>
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

// ── Trades donut ───────────────────────────────────────────────────────────
function TradesSummaryCard({ trades, dark }: { trades: Trade[]; dark: boolean }) {
  const wins   = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const longs  = trades.filter(t => t.direction === 'long').length
  const shorts = trades.filter(t => t.direction === 'short').length
  const total  = trades.length
  const decided = wins + losses
  const circ = 263.9
  const winArc = decided > 0 ? (wins / decided) * circ : 0
  const lossArc = circ - winArc
  const cardBg = dark ? '#111118' : '#ffffff'
  const cardBorder = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const textMuted = dark ? '#555' : '#aaa'
  const textPrimary = dark ? '#fff' : '#0a0a0a'

  return (
    <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold" style={{ color: textPrimary }}>Trades</div>
        <Link href="/journal" className="pill-btn-ghost text-xs" style={{ color: C.brand }}>Details →</Link>
      </div>
      <div className="text-xs mb-1" style={{ color: textMuted }}>Trades gesamt</div>
      <div className="num text-2xl font-bold mb-3" style={{ color: textPrimary }}>
        {total}{total > 0 && <span style={{ color: C.long, fontSize: 14, marginLeft: 6 }}>↑</span>}
      </div>
      <div className="flex gap-4 items-center">
        <div className="flex flex-col gap-2 flex-1">
          {[
            { label: 'Win', count: wins, color: C.long },
            { label: 'Loss', count: losses, color: C.short },
            { label: 'Long', count: longs, color: '#2962ff' },
            { label: 'Short', count: shorts, color: C.brand },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2 text-xs" style={{ color: dark ? '#aaa' : '#666' }}>
              <span className="rounded-full shrink-0" style={{ width: 9, height: 9, background: color, display: 'inline-block' }} />
              {label}
              <span className="ml-auto font-bold" style={{ color: textPrimary }}>{count}</span>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 110 110" width="110" height="110" style={{ flexShrink: 0 }}>
          <circle cx="55" cy="55" r="42" fill="none" stroke={dark ? '#1a1a2e' : '#f0f2f5'} strokeWidth="14" />
          {decided > 0 ? (
            <>
              <circle cx="55" cy="55" r="42" fill="none" stroke={C.long} strokeWidth="14"
                strokeDasharray={`${winArc} ${lossArc}`} strokeDashoffset="0" transform="rotate(-90 55 55)" />
              <circle cx="55" cy="55" r="42" fill="none" stroke={C.short} strokeWidth="14"
                strokeDasharray={`${lossArc} ${winArc}`} strokeDashoffset={-winArc} transform="rotate(-90 55 55)" />
            </>
          ) : (
            <circle cx="55" cy="55" r="42" fill="none" stroke={dark ? '#2a2a3e' : '#e4e7ec'} strokeWidth="14" />
          )}
          <text x="55" y="51" textAnchor="middle" fontSize="13" fontWeight="700" fill={textPrimary}>{total}</text>
          <text x="55" y="63" textAnchor="middle" fontSize="8" fill={textMuted}>Trades</text>
        </svg>
      </div>
    </div>
  )
}

// ── Recent trades ──────────────────────────────────────────────────────────
function RecentTradesCard({ trades, dark }: { trades: Trade[]; dark: boolean }) {
  const recent = trades.slice(0, 5)
  const cardBg = dark ? '#111118' : '#ffffff'
  const cardBorder = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const textPrimary = dark ? '#fff' : '#0a0a0a'
  const textMuted = dark ? '#555' : '#aaa'
  const rowBorder = dark ? '#1a1a28' : '#f4f4f6'

  return (
    <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold" style={{ color: textPrimary }}>Recent Trades</div>
        <Link href="/journal" className="text-xs" style={{ color: C.brand }}>Details →</Link>
      </div>
      <div className="grid gap-2 pb-2 mb-1" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: `1px solid ${dark ? '#1e1e2e' : '#eee'}` }}>
        {['Asset', 'Richtung', 'P&L', 'Status'].map(h => (
          <span key={h} style={{ fontSize: 10, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
        ))}
      </div>
      {recent.length === 0 ? (
        <div className="text-xs py-6 text-center" style={{ color: dark ? '#444' : '#bbb' }}>Keine Trades im Zeitraum</div>
      ) : recent.map((t, i) => {
        const pnl = t.result_currency ?? 0
        const isWin = t.outcome === 'win'; const isLoss = t.outcome === 'loss'
        const dir = t.direction === 'long' ? '▲ Long' : t.direction === 'short' ? '▼ Short' : '—'
        const dirColor = t.direction === 'long' ? C.long : t.direction === 'short' ? C.short : '#666'
        return (
          <div key={t.id} className="grid gap-2 py-2 items-center text-xs"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottom: i < recent.length - 1 ? `1px solid ${rowBorder}` : 'none' }}>
            <span style={{ color: dark ? '#ccc' : '#333' }}>{t.asset}</span>
            <span style={{ color: dirColor }}>{dir}</span>
            <span style={{ color: pnl >= 0 ? C.long : C.short }}>
              {pnl >= 0 ? '+' : ''}{pnl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
            <span className="font-bold px-1.5 py-0.5 rounded text-center inline-block"
              style={{ background: isWin ? '#0b2e24' : isLoss ? '#2e0b0b' : (dark ? '#1e1e2e' : '#f0f0f0'), color: isWin ? C.long : isLoss ? C.short : '#666', fontSize: 10 }}>
              {isWin ? 'WIN' : isLoss ? 'LOSS' : '—'}
            </span>
          </div>
        )
      })}
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
  const [dark, setDark] = useState(true)
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
    return startBalance + metrics.allTrades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  }, [metrics, startBalance])

  if (accountLoading || isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-56 rounded-full" />
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
  const textPrimary = dark ? '#fff' : '#0a0a0a'
  const textMuted = dark ? '#888' : '#666'
  const pageBg = dark ? 'transparent' : '#f1f5f9'

  return (
    <>
      {/* Scoped styles for pill buttons + hover effects */}
      <style>{`
        .pill-btn {
          padding: 7px 18px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .pill-btn:hover {
          transform: translateY(-1px);
        }
        .pill-tab {
          padding: 7px 20px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        .pill-tab:hover { opacity: 0.85; }
        .action-btn {
          padding: 8px 20px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .action-btn:hover {
          transform: translateY(-1px) scale(1.03);
        }
        .action-btn-primary:hover {
          box-shadow: 0 0 20px rgba(0,196,255,0.35);
        }
        .action-btn-secondary:hover {
          background: rgba(255,255,255,0.09) !important;
          border-color: rgba(255,255,255,0.2) !important;
          color: rgba(255,255,255,0.9) !important;
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4 transition-all duration-300" style={{ background: pageBg, borderRadius: pageBg !== 'transparent' ? 20 : 0, padding: pageBg !== 'transparent' ? 24 : 0 }}>

        {/* ── Page header: Big logo + controls ── */}
        <div className="flex items-end justify-between gap-4 pt-2 pb-1">
          {/* Full logo SVG — large */}
          <div style={{ position: 'relative' }}>
            {/* Subtle cyan glow behind the logo */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse 70% 60% at 40% 50%, ${C.brandGlow} 0%, transparent 70%)`,
              filter: 'blur(24px)',
              pointerEvents: 'none',
            }} />
            <Image
              src="/logo/nous-logo-full.svg"
              alt="NOUS — Turn Data into Decisions"
              width={340}
              height={106}
              priority
              style={{
                filter: dark
                  ? 'brightness(0) invert(1)'
                  : 'brightness(0)',
                display: 'block',
                position: 'relative',
              }}
            />
          </div>

          {/* Right: Dark mode toggle + back link */}
          <div className="flex items-center gap-3 shrink-0 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: textMuted }}>Dark</span>
              <DarkToggle dark={dark} onToggle={() => setDark(d => !d)} />
            </div>
            <Link href="/dashboard"
              className="action-btn action-btn-secondary"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              ← Live
            </Link>
          </div>
        </div>

        {/* TEST BADGE */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold w-fit"
          style={{ background: `rgba(0,196,255,0.08)`, border: `1px solid ${C.brandBorder}`, color: C.brand }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.brand, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Design-Preview · Echte Daten
        </div>

        {/* ── Greeting + Period tabs ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs" style={{ color: textMuted }}>{greetingBase}{displayName ? `, ${displayName}` : ''}.</div>
            <div className="text-2xl font-extrabold" style={{ color: textPrimary }}>Willkommen zurück!</div>
          </div>
          <div className="flex items-center gap-1.5">
            {(['today', 'week', 'month'] as TabKey[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className="pill-tab"
                style={{
                  background: tab === t ? C.brand : dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  color: tab === t ? '#000' : textMuted,
                  boxShadow: tab === t ? `0 0 14px ${C.brandGlow}` : 'none',
                }}>
                {t === 'today' ? 'Heute' : t === 'week' ? 'Woche' : 'Monat'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Quick action buttons (Apple-style) ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/journal"
            className="action-btn action-btn-primary"
            style={{ background: C.brandSoft, border: `1px solid ${C.brandBorder}`, color: C.brand, backdropFilter: 'blur(12px)' }}>
            <span style={{ fontSize: 14 }}>＋</span> Neuer Trade
          </Link>
          <Link href="/kalender"
            className="action-btn action-btn-secondary"
            style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)', color: dark ? 'rgba(255,255,255,0.55)' : '#555', backdropFilter: 'blur(12px)' }}>
            Kalender
          </Link>
          <Link href="/wochenvorbereitung"
            className="action-btn action-btn-secondary"
            style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)', color: dark ? 'rgba(255,255,255,0.55)' : '#555', backdropFilter: 'blur(12px)' }}>
            Wochenvorbereitung
          </Link>
        </div>

        {/* ── Balance card ── */}
        <BalanceCard trades={periodTrades} curve={curve} startBalance={startBalance} currentBalance={currentBalance} tab={tab} dark={dark} />

        {/* ── Bottom grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TradesSummaryCard trades={periodTrades} dark={dark} />
          <RecentTradesCard trades={periodTrades} dark={dark} />
        </div>
      </div>
    </>
  )
}
