'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAccountContext } from '@/contexts/AccountContext'
import type { Trade } from './useTrades'

export interface EquityPoint {
  date: string
  balance: number
  delta: number | null
}

export interface TopStrategy {
  name: string
  tradeCount: number
  totalPnl: number
  profitFactor: number
  winRate: number
}

export interface DashboardMetrics {
  todayPnl: number
  todayPnlPct: number
  todayTradeCount: number
  weekPnl: number
  monthPnl: number
  winRate: number | null
  avgRR: number | null
  drawdownPct: number
  equityCurve: EquityPoint[]
  topStrategy: TopStrategy | null
  recentTrades: Trade[]
  allTrades: Trade[]
  allTradeCount: number
}

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

function calcDrawdown(trades: { result_currency: number | null; traded_at: string }[], startBalance: number): number {
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

function buildEquityCurve(
  trades: { result_currency: number | null; traded_at: string }[],
  startBalance: number,
  periodDays: number | null
): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => a.traded_at.localeCompare(b.traded_at))

  // Build cumulative by day
  const byDay = new Map<string, number>()
  let cumulative = 0
  for (const t of sorted) {
    const day = t.traded_at.split('T')[0]
    cumulative += t.result_currency ?? 0
    byDay.set(day, cumulative)
  }

  if (byDay.size === 0) return []

  // Generate all days in range
  const days = Array.from(byDay.keys()).sort()
  const earliest = days[0]
  const latest = todayISO()

  const cutoff = periodDays
    ? new Date(Date.now() - periodDays * 86400000).toISOString().split('T')[0]
    : earliest

  const allDays: string[] = []
  const cursor = new Date(cutoff < earliest ? earliest : cutoff)
  const end = new Date(latest)
  while (cursor <= end) {
    allDays.push(cursor.toISOString().split('T')[0])
    cursor.setDate(cursor.getDate() + 1)
  }

  // Build cumulative values, carrying last known value forward
  const points: EquityPoint[] = []
  let lastCumulative = 0
  // Find last cumulative before range start
  for (const [day, val] of byDay.entries()) {
    if (day < (allDays[0] ?? '')) lastCumulative = val
  }

  let prevBalance: number | null = null
  for (const day of allDays) {
    if (byDay.has(day)) lastCumulative = byDay.get(day)!
    const balance = Math.round((startBalance + lastCumulative) * 100) / 100
    points.push({
      date: day,
      balance,
      delta: prevBalance !== null ? Math.round((balance - prevBalance) * 100) / 100 : null,
    })
    prevBalance = balance
  }
  return points
}

function calcTopStrategy(trades: Trade[]): TopStrategy | null {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const recent = trades.filter(t => t.traded_at >= cutoff && t.strategy)
  const byStrategy = new Map<string, Trade[]>()
  for (const t of recent) {
    const key = t.strategy!
    const arr = byStrategy.get(key) ?? []
    arr.push(t)
    byStrategy.set(key, arr)
  }

  let best: TopStrategy | null = null
  for (const [name, group] of byStrategy.entries()) {
    if (group.length < 5) continue
    const wins = group.filter(t => t.outcome === 'win')
    const losses = group.filter(t => t.outcome === 'loss')
    const grossProfit = wins.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.result_currency ?? 0), 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
    const winRate = (wins.length / group.filter(t => t.outcome !== null).length) * 100
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

export function useDashboardMetrics() {
  const { activeAccount } = useAccountContext()
  const supabase = createClient()

  const fetchMetrics = useCallback(async (periodDays: number | null = null): Promise<DashboardMetrics | null> => {
    if (!activeAccount) return null

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('account_id', activeAccount.id)
      .order('traded_at', { ascending: true })

    if (error || !data) return null

    const trades = data as Trade[]
    const balance = activeAccount.start_balance
    const today = todayISO()
    const weekStart = weekStartISO()
    const monthStart = monthStartISO()

    const todayTrades = trades.filter(t => t.traded_at.startsWith(today))
    const weekTrades = trades.filter(t => t.traded_at.split('T')[0] >= weekStart)
    const monthTrades = trades.filter(t => t.traded_at.split('T')[0] >= monthStart)

    const todayPnl = todayTrades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const weekPnl = weekTrades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const monthPnl = monthTrades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const todayPnlPct = balance > 0 ? (todayPnl / balance) * 100 : 0

    const decidedTrades = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
    const wins = decidedTrades.filter(t => t.outcome === 'win')
    const winRate = decidedTrades.length > 0 ? (wins.length / decidedTrades.length) * 100 : null

    const rrTrades = trades.filter(t => t.rr_ratio !== null)
    const avgRR = rrTrades.length > 0
      ? rrTrades.reduce((s, t) => s + t.rr_ratio!, 0) / rrTrades.length
      : null

    const drawdownPct = calcDrawdown(trades, balance)
    const equityCurve = buildEquityCurve(trades, balance, periodDays)
    const topStrategy = calcTopStrategy(trades)
    const recentTrades = [...trades].reverse().slice(0, 10)

    return {
      todayPnl: Math.round(todayPnl * 100) / 100,
      todayPnlPct: Math.round(todayPnlPct * 100) / 100,
      todayTradeCount: todayTrades.length,
      weekPnl: Math.round(weekPnl * 100) / 100,
      monthPnl: Math.round(monthPnl * 100) / 100,
      winRate: winRate !== null ? Math.round(winRate * 10) / 10 : null,
      avgRR: avgRR !== null ? Math.round(avgRR * 100) / 100 : null,
      drawdownPct,
      equityCurve,
      topStrategy,
      recentTrades,
      allTrades: trades,
      allTradeCount: trades.length,
    }
  }, [activeAccount, supabase])

  return { fetchMetrics }
}
