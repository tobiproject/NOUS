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
        profitFactor: isFinite(profitFactor)
          ? Math.round(profitFactor * 100) / 100
          : 999,
        winRate: Math.round(winRate * 10) / 10,
      }
    }
  }
  return best
}

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
      // localStorage unavailable — keep default
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

  const todayKpis = useMemo(
    () => calcPeriodKpis(todayTrades, startBalance),
    [todayTrades, startBalance]
  )
  const weekKpis = useMemo(
    () => calcPeriodKpis(weekTrades, startBalance),
    [weekTrades, startBalance]
  )
  const monthKpis = useMemo(() => {
    const base = calcPeriodKpis(monthTrades, startBalance)
    const priorPnl = allTrades
      .filter(t => t.traded_at.split('T')[0] < monthStart)
      .reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const monthStartEquity = startBalance + priorPnl
    return { ...base, drawdownPct: calcDrawdown(monthTrades, monthStartEquity) }
  }, [monthTrades, allTrades, startBalance, monthStart])

  const todayCurve = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yesterday = d.toISOString().split('T')[0]
    return metrics.equityCurve.filter(p => p.date >= yesterday)
  }, [metrics.equityCurve])
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

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full sm:w-auto mb-4">
        <TabsTrigger value="today" className="flex-1 sm:flex-none">
          Heute
        </TabsTrigger>
        <TabsTrigger value="week" className="flex-1 sm:flex-none">
          Woche
        </TabsTrigger>
        <TabsTrigger value="month" className="flex-1 sm:flex-none">
          Monat
        </TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="space-y-4">
        <DashboardTabKpis data={todayKpis} tab="today" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <EquityCurveChart allPoints={todayCurve} startBalance={startBalance} />
          </div>
          <div className="lg:col-span-2">
            <TopStrategyCard strategy={null} periodLabel="heute" minCountLabel={3} />
          </div>
        </div>
        <RecentTradesTable
          trades={[...todayTrades].reverse()}
          onTradeClick={onTradeClick}
          emptyMessage="Noch keine Trades heute."
        />
      </TabsContent>

      <TabsContent value="week" className="space-y-4">
        <DashboardTabKpis data={weekKpis} tab="week" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <EquityCurveChart allPoints={weekCurve} startBalance={startBalance} />
          </div>
          <div className="lg:col-span-2">
            <TopStrategyCard strategy={weekStrategy} periodLabel="diese Woche" minCountLabel={3} />
          </div>
        </div>
        <RecentTradesTable
          trades={[...weekTrades].reverse()}
          onTradeClick={onTradeClick}
          emptyMessage="Noch keine Trades diese Woche."
        />
      </TabsContent>

      <TabsContent value="month" className="space-y-4">
        <DashboardTabKpis data={monthKpis} tab="month" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <EquityCurveChart allPoints={monthCurve} startBalance={startBalance} />
          </div>
          <div className="lg:col-span-2">
            <TopStrategyCard strategy={monthStrategy} periodLabel="diesen Monat" minCountLabel={5} />
          </div>
        </div>
        <RecentTradesTable
          trades={[...monthTrades].reverse()}
          onTradeClick={onTradeClick}
          emptyMessage="Noch keine Trades diesen Monat."
        />
      </TabsContent>
    </Tabs>
  )
}
