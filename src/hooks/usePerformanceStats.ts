'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAccountContext } from '@/contexts/AccountContext'
import type { Trade } from './useTrades'

export interface StatsFilter {
  dateFrom?: string
  dateTo?: string
  assets?: string[]
  strategies?: string[]
  setupTypes?: string[]
}

export interface KpiStats {
  totalTrades: number
  winRate: number | null
  profitFactor: number | null
  avgWin: number | null
  avgLoss: number | null
  avgRRWins: number | null
  avgRRAll: number | null
  bestStreak: number
  worstStreak: number
  maxDrawdownPct: number
}

export interface BarDataPoint {
  label: string
  pnl: number
  winRate: number | null
  tradeCount: number
}

export interface WinrateDataPoint {
  label: string
  winRate: number
  tradeCount: number
}

export interface HeatmapCell {
  weekday: number   // 0=Mon … 6=Sun
  hour: number      // 0–23
  tradeCount: number
  winRate: number | null
  avgPnl: number | null
  profitFactor: number | null
}

export interface DrawdownPoint {
  date: string
  drawdownPct: number
}

export interface DrawdownPhase {
  startDate: string
  endDate: string
  peakPct: number       // drawdown depth at trough
  recoveryDays: number | null
}

export interface PerformanceStats {
  kpi: KpiStats
  monthly: BarDataPoint[]
  weekly: BarDataPoint[]
  dayOfWeek: BarDataPoint[]
  winrateByAsset: WinrateDataPoint[]
  winrateBySetup: WinrateDataPoint[]
  winrateByStrategy: WinrateDataPoint[]
  heatmap: HeatmapCell[]
  drawdownCurve: DrawdownPoint[]
  drawdownPhases: DrawdownPhase[]
  currentDrawdownPct: number
  availableAssets: string[]
  availableStrategies: string[]
  availableSetupTypes: string[]
}

// ─── Pure calculation helpers ─────────────────────────────────────────────────

function applyFilter(trades: Trade[], f: StatsFilter): Trade[] {
  return trades.filter(t => {
    const day = t.traded_at.split('T')[0]
    if (f.dateFrom && day < f.dateFrom) return false
    if (f.dateTo && day > f.dateTo) return false
    if (f.assets?.length && !f.assets.includes(t.asset)) return false
    if (f.strategies?.length && !f.strategies.includes(t.strategy ?? '')) return false
    if (f.setupTypes?.length && !f.setupTypes.includes(t.setup_type ?? '')) return false
    return true
  })
}

function calcStreaks(trades: Trade[]): { best: number; worst: number } {
  let best = 0, worst = 0, curWin = 0, curLoss = 0
  for (const t of trades) {
    if (t.outcome === 'win') { curWin++; curLoss = 0; if (curWin > best) best = curWin }
    else if (t.outcome === 'loss') { curLoss++; curWin = 0; if (curLoss > worst) worst = curLoss }
    else { curWin = 0; curLoss = 0 }
  }
  return { best, worst }
}

function calcDrawdownSeries(
  trades: Trade[],
  startBalance: number
): { curve: DrawdownPoint[]; phases: DrawdownPhase[]; current: number } {
  const sorted = [...trades].sort((a, b) => a.traded_at.localeCompare(b.traded_at))
  let equity = startBalance
  let peak = startBalance
  let inDrawdown = false
  let phaseStart = ''
  let phasePeak = startBalance
  const curve: DrawdownPoint[] = []
  const phases: DrawdownPhase[] = []

  for (const t of sorted) {
    equity += t.result_currency ?? 0
    if (equity > peak) {
      if (inDrawdown) {
        // Recovered
        const depth = ((phasePeak - (equity - (t.result_currency ?? 0))) / phasePeak) * 100
        const startD = new Date(phaseStart)
        const endD = new Date(t.traded_at)
        phases.push({
          startDate: phaseStart.split('T')[0],
          endDate: t.traded_at.split('T')[0],
          peakPct: Math.round(depth * 100) / 100,
          recoveryDays: Math.round((endD.getTime() - startD.getTime()) / 86400000),
        })
        inDrawdown = false
      }
      peak = equity
    } else if (equity < peak) {
      if (!inDrawdown) { inDrawdown = true; phaseStart = t.traded_at; phasePeak = peak }
    }
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    curve.push({ date: t.traded_at.split('T')[0], drawdownPct: Math.round(dd * 100) / 100 })
  }

  // Open drawdown phase
  if (inDrawdown && phaseStart) {
    const lastTrade = sorted[sorted.length - 1]
    const depth = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    phases.push({
      startDate: phaseStart.split('T')[0],
      endDate: lastTrade?.traded_at.split('T')[0] ?? phaseStart.split('T')[0],
      peakPct: Math.round(depth * 100) / 100,
      recoveryDays: null,
    })
  }

  const current = curve.length > 0 ? curve[curve.length - 1].drawdownPct : 0
  const top5 = [...phases].sort((a, b) => b.peakPct - a.peakPct).slice(0, 5)
  return { curve, phases: top5, current }
}

function groupByPeriod(
  trades: Trade[],
  keyFn: (t: Trade) => string
): BarDataPoint[] {
  const map = new Map<string, { pnl: number; wins: number; losses: number }>()
  for (const t of trades) {
    const k = keyFn(t)
    const cur = map.get(k) ?? { pnl: 0, wins: 0, losses: 0 }
    cur.pnl += t.result_currency ?? 0
    if (t.outcome === 'win') cur.wins++
    if (t.outcome === 'loss') cur.losses++
    map.set(k, cur)
  }
  return Array.from(map.entries()).map(([label, d]) => ({
    label,
    pnl: Math.round(d.pnl * 100) / 100,
    winRate: (d.wins + d.losses) > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 1000) / 10 : null,
    tradeCount: trades.filter(t => keyFn(t) === label).length,
  }))
}

function calcWinrateGroup(trades: Trade[], keyFn: (t: Trade) => string | null): WinrateDataPoint[] {
  const map = new Map<string, { wins: number; losses: number; count: number }>()
  for (const t of trades) {
    const k = keyFn(t)
    if (!k) continue
    const cur = map.get(k) ?? { wins: 0, losses: 0, count: 0 }
    cur.count++
    if (t.outcome === 'win') cur.wins++
    if (t.outcome === 'loss') cur.losses++
    map.set(k, cur)
  }
  return Array.from(map.entries())
    .map(([label, d]) => ({
      label,
      winRate: (d.wins + d.losses) > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 1000) / 10 : 0,
      tradeCount: d.count,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, 10)
}

function buildHeatmap(trades: Trade[]): HeatmapCell[] {
  // weekday: 0=Mon…6=Sun (JS getDay: 0=Sun, 1=Mon…)
  const map = new Map<string, { wins: number; losses: number; count: number; pnlSum: number; grossProfit: number; grossLoss: number }>()
  for (const t of trades) {
    const d = new Date(t.traded_at)
    const jsDay = d.getDay() // 0=Sun
    const weekday = jsDay === 0 ? 6 : jsDay - 1 // convert to 0=Mon…6=Sun
    const hour = d.getHours()
    const key = `${weekday}:${hour}`
    const cur = map.get(key) ?? { wins: 0, losses: 0, count: 0, pnlSum: 0, grossProfit: 0, grossLoss: 0 }
    cur.count++
    cur.pnlSum += t.result_currency ?? 0
    if (t.outcome === 'win') { cur.wins++; cur.grossProfit += t.result_currency ?? 0 }
    if (t.outcome === 'loss') { cur.losses++; cur.grossLoss += Math.abs(t.result_currency ?? 0) }
    map.set(key, cur)
  }

  const cells: HeatmapCell[] = []
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      const d = map.get(`${weekday}:${hour}`)
      if (!d) {
        cells.push({ weekday, hour, tradeCount: 0, winRate: null, avgPnl: null, profitFactor: null })
      } else {
        const wr = (d.wins + d.losses) > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 1000) / 10 : null
        const pf = d.grossLoss > 0 ? Math.round((d.grossProfit / d.grossLoss) * 100) / 100 : d.grossProfit > 0 ? 999 : 0
        cells.push({
          weekday, hour,
          tradeCount: d.count,
          winRate: wr,
          avgPnl: d.count > 0 ? Math.round((d.pnlSum / d.count) * 100) / 100 : null,
          profitFactor: d.count >= 3 ? pf : null,
        })
      }
    }
  }
  return cells
}

function calcKpi(trades: Trade[], startBalance: number): KpiStats {
  const wins = trades.filter(t => t.outcome === 'win')
  const losses = trades.filter(t => t.outcome === 'loss')
  const decided = wins.length + losses.length

  const winRate = decided > 0 ? Math.round((wins.length / decided) * 1000) / 10 : null
  const grossProfit = wins.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.result_currency ?? 0), 0))
  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : null
  const avgWin = wins.length > 0 ? Math.round((grossProfit / wins.length) * 100) / 100 : null
  const avgLoss = losses.length > 0 ? Math.round((grossLoss / losses.length) * 100) / 100 : null
  const avgRRWins = wins.filter(t => t.rr_ratio !== null).length > 0
    ? Math.round((wins.reduce((s, t) => s + (t.rr_ratio ?? 0), 0) / wins.filter(t => t.rr_ratio !== null).length) * 100) / 100
    : null
  const rrAll = trades.filter(t => t.rr_ratio !== null)
  const avgRRAll = rrAll.length > 0
    ? Math.round((rrAll.reduce((s, t) => s + t.rr_ratio!, 0) / rrAll.length) * 100) / 100
    : null

  const { best, worst } = calcStreaks(trades)

  let equity = startBalance, peak = startBalance, maxDd = 0
  for (const t of [...trades].sort((a, b) => a.traded_at.localeCompare(b.traded_at))) {
    equity += t.result_currency ?? 0
    if (equity > peak) peak = equity
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    if (dd > maxDd) maxDd = dd
  }

  return {
    totalTrades: trades.length,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    avgRRWins,
    avgRRAll,
    bestStreak: best,
    worstStreak: worst,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePerformanceStats() {
  const { activeAccount } = useAccountContext()
  const supabase = createClient()

  const fetchStats = useCallback(async (filter: StatsFilter): Promise<PerformanceStats | null> => {
    if (!activeAccount) return null

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('account_id', activeAccount.id)
      .order('traded_at', { ascending: true })

    if (error || !data) return null
    const allTrades = data as Trade[]
    const trades = applyFilter(allTrades, filter)
    const balance = activeAccount.start_balance

    // Unique filter options from all trades (not filtered)
    const availableAssets = [...new Set(allTrades.map(t => t.asset))].sort()
    const availableStrategies = [...new Set(allTrades.map(t => t.strategy).filter(Boolean) as string[])].sort()
    const availableSetupTypes = [...new Set(allTrades.map(t => t.setup_type).filter(Boolean) as string[])].sort()

    // Monthly
    const monthly = groupByPeriod(trades, t => t.traded_at.slice(0, 7))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-12)

    // Weekly (ISO week: YYYY-Www)
    const toWeekKey = (iso: string) => {
      const d = new Date(iso)
      const day = d.getDay() || 7
      d.setDate(d.getDate() + 4 - day)
      const yearStart = new Date(d.getFullYear(), 0, 1)
      const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
    }
    const weekly = groupByPeriod(trades, t => toWeekKey(t.traded_at))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-12)

    // Day of week
    const DOW_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    const dowMap = new Map<number, { pnl: number; wins: number; losses: number; count: number }>()
    for (const t of trades) {
      const jsDay = new Date(t.traded_at).getDay()
      const dow = jsDay === 0 ? 6 : jsDay - 1
      const cur = dowMap.get(dow) ?? { pnl: 0, wins: 0, losses: 0, count: 0 }
      cur.pnl += t.result_currency ?? 0
      if (t.outcome === 'win') cur.wins++
      if (t.outcome === 'loss') cur.losses++
      cur.count++
      dowMap.set(dow, cur)
    }
    const dayOfWeek: BarDataPoint[] = DOW_LABELS.map((label, i) => {
      const d = dowMap.get(i)
      return {
        label,
        pnl: d ? Math.round((d.pnl / (d.count || 1)) * 100) / 100 : 0,
        winRate: d && (d.wins + d.losses) > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 1000) / 10 : null,
        tradeCount: d?.count ?? 0,
      }
    })

    const winrateByAsset = calcWinrateGroup(trades, t => t.asset)
    const winrateBySetup = calcWinrateGroup(trades, t => t.setup_type)
    const winrateByStrategy = calcWinrateGroup(trades, t => t.strategy)
    const heatmap = buildHeatmap(trades)
    const { curve, phases, current } = calcDrawdownSeries(trades, balance)
    const kpi = calcKpi(trades, balance)

    return {
      kpi, monthly, weekly, dayOfWeek,
      winrateByAsset, winrateBySetup, winrateByStrategy,
      heatmap,
      drawdownCurve: curve,
      drawdownPhases: phases,
      currentDrawdownPct: current,
      availableAssets, availableStrategies, availableSetupTypes,
    }
  }, [activeAccount, supabase])

  return { fetchStats }
}
