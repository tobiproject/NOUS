'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DashboardTabKpis, type TabKpiData } from './DashboardTabKpis'
import { EquityCurveChart } from './EquityCurveChart'
import { TopStrategyCard } from './TopStrategyCard'
import { RecentTradesTable } from './RecentTradesTable'
import type { DashboardMetrics, TopStrategy } from '@/hooks/useDashboardMetrics'
import type { Trade } from '@/hooks/useTrades'

type TabKey = 'today' | 'week' | 'month'

const STORAGE_KEY = 'dashboard_active_tab'

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function weekStartISO() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function monthStartISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function calcPeriodKpis(trades: Trade[], startBalance: number): TabKpiData {
  const pnl = trades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  const pnlPct = startBalance > 0 ? (pnl / startBalance) * 100 : 0
  const decided = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  const wins = decided.filter(t => t.outcome === 'win')
  const winRate = decided.length > 0 ? (wins.length / decided.length) * 100 : null
  const rrTrades = trades.filter(t => t.rr_ratio !== null)
  const avgRR =
    rrTrades.length > 0
      ? rrTrades.reduce((s, t) => s + t.rr_ratio!, 0) / rrTrades.length
      : null
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
    tradeCount: trades.length,
    winRate: winRate !== null ? Math.round(winRate * 10) / 10 : null,
    avgRR: avgRR !== null ? Math.round(avgRR * 100) / 100 : null,
  }
}

function calcDrawdown(trades: Trade[], startBalance: number): number {
  let equity = startBalance
  let peak = startBalance
  let maxDd = 0
  const sorted = [...trades].sort((a, b) => a.traded_at.localeCompare(b.traded_at))
  for (const t of sorted) {
    equity += t.result_currency ?? 0
    if (equity > peak) peak = equity
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    if (dd > maxDd) maxDd = dd
  }
  return Math.round(maxDd * 100) / 100
}

function calcTopStrategy(trades: Trade[], minCount: number): TopStrategy | null {
  const byStrategy = new Map<string, Trade[]>()
  for (const t of trades.filter(t => t.strategy)) {
    const key = t.strategy!
    const arr = byStrategy.get(key) ?? []
    arr.push(t)
    byStrategy.set(key, arr)
  }
  let best: TopStrategy | null = null
  for (const [name, group] of byStrategy.entries()) {
    if (group.length < minCount) continue
    const wins = group.filter(t => t.outcome === 'win')
    const losses = group.filter(t => t.outcome === 'loss')
    const grossProfit = wins.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.result_currency ?? 0), 0))
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
    const decided = group.filter(t => t.outcome !== null)
    const winRate = decided.length > 0 ? (wins.length / decided.length) * 100 : 0
    const totalPnl = group.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    if (!best || profitFactor > best.profitFactor) {
      best = {
        name,
        tradeCount: group.length,
        totalPnl: Math.round(totalPnl * 100) / 100,
        profitFactor: isFinite(profitFactor) ? Math.round(profitFactor * 100) / 100 : 999,
        winRate: Math.round(winRate * 10) / 10,
      }
    }
  }
  return best
}

// ── P&L Hero Card ──────────────────────────────────────────────────────────

interface PnlHeroProps {
  data: TabKpiData
  tab: TabKey
}

function PnlHeroCard({ data, tab }: PnlHeroProps) {
  const label =
    tab === 'today' ? 'Tages P&L' : tab === 'week' ? 'Wochen P&L' : 'Monats P&L'
  const hasTrades = data.tradeCount > 0
  const pnlColor = !hasTrades
    ? 'var(--fg-4)'
    : data.pnl > 0 ? 'var(--long)' : data.pnl < 0 ? 'var(--short)' : 'var(--fg-3)'
  const isPos = data.pnl >= 0

  return (
    <div
      className="rounded-xl p-5 flex flex-col h-full"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        minHeight: '160px',
      }}
    >
      <div className="eyebrow mb-3">{label}</div>

      {/* Main number */}
      <div
        className="metric leading-none"
        style={{ fontSize: '36px', color: pnlColor }}
      >
        {hasTrades
          ? `${data.pnl >= 0 ? '+' : ''}${data.pnl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
          : '—'
        }
      </div>

      {/* % badge */}
      {hasTrades && (
        <div className="flex items-center gap-2 mt-2">
          <span
            className="num text-xs font-semibold px-2 py-0.5 rounded-md"
            style={{
              background: isPos ? 'rgba(8,153,129,0.12)' : 'rgba(242,54,69,0.12)',
              color: isPos ? 'var(--long)' : 'var(--short)',
            }}
          >
            {data.pnlPct >= 0 ? '+' : ''}{data.pnlPct.toFixed(2)}%
          </span>
          <span className="text-xs" style={{ color: 'var(--fg-4)' }}>vom Startkapital</span>
        </div>
      )}

      {/* Sub-stats */}
      <div
        className="mt-auto pt-4 grid grid-cols-3 gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div>
          <div className="eyebrow mb-1" style={{ fontSize: '10px' }}>Trades</div>
          <div className="num text-base font-bold" style={{ color: 'var(--fg-1)' }}>
            {data.tradeCount}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-1" style={{ fontSize: '10px' }}>Win Rate</div>
          <div
            className="num text-base font-bold"
            style={{
              color: data.winRate === null ? 'var(--fg-4)' : data.winRate >= 50 ? 'var(--long)' : 'var(--short)',
            }}
          >
            {data.winRate !== null ? `${data.winRate.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-1" style={{ fontSize: '10px' }}>Ø R:R</div>
          <div className="num text-base font-bold" style={{ color: 'var(--brand-blue)' }}>
            {data.avgRR !== null ? `1:${data.avgRR.toFixed(2)}` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  metrics: DashboardMetrics
  startBalance: number
  onTradeClick: (trade: Trade) => void
}

export function DashboardTabs({ metrics, startBalance, onTradeClick }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('today')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as TabKey | null
      if (stored && ['today', 'week', 'month'].includes(stored)) {
        setActiveTab(stored)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  const handleTabChange = (tab: string) => {
    const t = tab as TabKey
    setActiveTab(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // ignore
    }
  }

  const today = todayISO()
  const weekStart = weekStartISO()
  const monthStart = monthStartISO()
  const allTrades = metrics.allTrades

  const currentBalance = useMemo(() => {
    if (metrics.equityCurve.length === 0) return startBalance
    return metrics.equityCurve[metrics.equityCurve.length - 1].balance
  }, [metrics.equityCurve, startBalance])

  const todayTrades = useMemo(
    () => allTrades.filter(t => t.traded_at.startsWith(today)),
    [allTrades, today]
  )
  const weekTrades = useMemo(
    () => allTrades.filter(t => t.traded_at.split('T')[0] >= weekStart),
    [allTrades, weekStart]
  )
  const monthTrades = useMemo(
    () => allTrades.filter(t => t.traded_at.split('T')[0] >= monthStart),
    [allTrades, monthStart]
  )

  const todayKpis = useMemo(() => calcPeriodKpis(todayTrades, startBalance), [todayTrades, startBalance])
  const weekKpis = useMemo(() => calcPeriodKpis(weekTrades, startBalance), [weekTrades, startBalance])
  const monthKpis = useMemo(() => {
    const base = calcPeriodKpis(monthTrades, startBalance)
    const priorPnl = allTrades
      .filter(t => t.traded_at.split('T')[0] < monthStart)
      .reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const monthStartEquity = startBalance + priorPnl
    return { ...base, drawdownPct: calcDrawdown(monthTrades, monthStartEquity) }
  }, [monthTrades, allTrades, startBalance, monthStart])

  const d = new Date()
  d.setDate(d.getDate() - 1)
  const yesterday = d.toISOString().split('T')[0]
  const todayCurve = useMemo(
    () => metrics.equityCurve.filter(p => p.date >= yesterday),
    [metrics.equityCurve, yesterday]
  )
  const weekCurve = useMemo(
    () => metrics.equityCurve.filter(p => p.date >= weekStart),
    [metrics.equityCurve, weekStart]
  )
  const monthCurve = useMemo(
    () => metrics.equityCurve.filter(p => p.date >= monthStart),
    [metrics.equityCurve, monthStart]
  )

  const weekStrategy = useMemo(() => calcTopStrategy(weekTrades, 3), [weekTrades])
  const monthStrategy = useMemo(() => calcTopStrategy(monthTrades, 5), [monthTrades])

  const tabContent = (
    kpis: TabKpiData,
    tab: TabKey,
    curve: typeof todayCurve,
    trades: Trade[],
    strategy: TopStrategy | null,
    minCount: number,
    periodLabel: string
  ) => (
    <div className="space-y-4">
      {/* Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <PnlHeroCard data={kpis} tab={tab} />
        </div>
        <div className="lg:col-span-3">
          <EquityCurveChart
            allPoints={curve}
            startBalance={startBalance}
            currentBalance={currentBalance}
          />
        </div>
      </div>

      {/* KPI strip */}
      <DashboardTabKpis data={kpis} tab={tab} />

      {/* Strategy + Trades */}
      {strategy ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <TopStrategyCard strategy={strategy} periodLabel={periodLabel} minCountLabel={minCount} />
          </div>
          <div className="lg:col-span-3">
            <RecentTradesTable
              trades={[...trades].reverse()}
              onTradeClick={onTradeClick}
              emptyMessage={`Noch keine Trades ${periodLabel}.`}
            />
          </div>
        </div>
      ) : (
        <RecentTradesTable
          trades={[...trades].reverse()}
          onTradeClick={onTradeClick}
          emptyMessage={`Noch keine Trades ${periodLabel}.`}
        />
      )}
    </div>
  )

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full sm:w-auto mb-4">
        <TabsTrigger value="today" className="flex-1 sm:flex-none">Heute</TabsTrigger>
        <TabsTrigger value="week" className="flex-1 sm:flex-none">Woche</TabsTrigger>
        <TabsTrigger value="month" className="flex-1 sm:flex-none">Monat</TabsTrigger>
      </TabsList>

      <TabsContent value="today">
        {tabContent(todayKpis, 'today', todayCurve, todayTrades, null, 3, 'heute')}
      </TabsContent>
      <TabsContent value="week">
        {tabContent(weekKpis, 'week', weekCurve, weekTrades, weekStrategy, 3, 'diese Woche')}
      </TabsContent>
      <TabsContent value="month">
        {tabContent(monthKpis, 'month', monthCurve, monthTrades, monthStrategy, 5, 'diesen Monat')}
      </TabsContent>
    </Tabs>
  )
}
