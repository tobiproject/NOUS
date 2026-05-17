'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAccountContext } from '@/contexts/AccountContext'

export interface DailyRiskMetrics {
  /** Sum of result_currency for today's losing trades */
  dailyLoss: number
  /** Daily loss as % of account start_balance */
  dailyLossPct: number
  /** Number of trades placed today */
  dailyTradeCount: number
  /** Sum of risk_percent for today's trades */
  dailyRiskPct: number
  /** Current drawdown from peak equity */
  drawdownPct: number
  date: string
}

export interface RiskCheckResult {
  dailyLoss: { value: number; pct: number; limitPct: number | null; ratio: number | null; breached: boolean; warning: boolean }
  dailyTrades: { count: number; limit: number | null; breached: boolean; warning: boolean }
  drawdown: { pct: number; limitPct: number | null; ratio: number | null; breached: boolean; warning: boolean }
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function useRiskMetrics() {
  const { activeAccount } = useAccountContext()
  const supabase = createClient()

  const fetchDailyMetrics = useCallback(async (date?: string): Promise<DailyRiskMetrics | null> => {
    if (!activeAccount) return null
    const targetDate = date ?? todayISO()

    const { data, error } = await supabase
      .from('trades')
      .select('result_currency, risk_percent, outcome, traded_at')
      .eq('account_id', activeAccount.id)
      .gte('traded_at', `${targetDate}T00:00:00.000Z`)
      .lte('traded_at', `${targetDate}T23:59:59.999Z`)

    if (error || !data) return null

    const balance = activeAccount.start_balance
    const dailyLoss = data.reduce((sum, t) => {
      const val = t.result_currency ?? 0
      return sum + (val < 0 ? val : 0)
    }, 0)
    const dailyLossPct = balance > 0 ? Math.abs(dailyLoss / balance) * 100 : 0
    const dailyTradeCount = data.length
    const dailyRiskPct = data.reduce((sum, t) => sum + (t.risk_percent ?? 0), 0)

    return {
      dailyLoss: Math.abs(dailyLoss),
      dailyLossPct: Math.round(dailyLossPct * 100) / 100,
      dailyTradeCount,
      dailyRiskPct: Math.round(dailyRiskPct * 100) / 100,
      drawdownPct: 0, // calculated separately in fetchDrawdown
      date: targetDate,
    }
  }, [activeAccount, supabase])

  const fetchDrawdown = useCallback(async (): Promise<number> => {
    if (!activeAccount) return 0

    const { data, error } = await supabase
      .from('trades')
      .select('result_currency, traded_at')
      .eq('account_id', activeAccount.id)
      .order('traded_at', { ascending: true })

    if (error || !data) return 0

    const balance = activeAccount.start_balance
    let equity = balance
    let peak = balance
    let maxDrawdown = 0

    for (const trade of data) {
      equity += trade.result_currency ?? 0
      if (equity > peak) peak = equity
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
      if (dd > maxDrawdown) maxDrawdown = dd
    }

    return Math.round(maxDrawdown * 100) / 100
  }, [activeAccount, supabase])

  const checkLimits = useCallback(async (
    metrics: DailyRiskMetrics,
    drawdownPct: number,
    config: { max_daily_loss_pct: number | null; max_daily_trades: number | null; max_drawdown_pct: number | null }
  ): Promise<RiskCheckResult> => {
    const warningThreshold = 0.8

    const lossRatio = config.max_daily_loss_pct ? metrics.dailyLossPct / config.max_daily_loss_pct : null
    const dailyLoss = {
      value: metrics.dailyLoss,
      pct: metrics.dailyLossPct,
      limitPct: config.max_daily_loss_pct,
      ratio: lossRatio,
      breached: lossRatio !== null && lossRatio >= 1,
      warning: lossRatio !== null && lossRatio >= warningThreshold && lossRatio < 1,
    }

    const tradesRatio = config.max_daily_trades ? metrics.dailyTradeCount / config.max_daily_trades : null
    const dailyTrades = {
      count: metrics.dailyTradeCount,
      limit: config.max_daily_trades,
      breached: tradesRatio !== null && tradesRatio >= 1,
      warning: tradesRatio !== null && tradesRatio >= warningThreshold && tradesRatio < 1,
    }

    const ddRatio = config.max_drawdown_pct ? drawdownPct / config.max_drawdown_pct : null
    const drawdown = {
      pct: drawdownPct,
      limitPct: config.max_drawdown_pct,
      ratio: ddRatio,
      breached: ddRatio !== null && ddRatio >= 1,
      warning: ddRatio !== null && ddRatio >= warningThreshold && ddRatio < 1,
    }

    return { dailyLoss, dailyTrades, drawdown }
  }, [])

  return { fetchDailyMetrics, fetchDrawdown, checkLimits }
}
