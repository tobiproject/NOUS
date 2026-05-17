'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAccountContext } from '@/contexts/AccountContext'
import type { RiskCheckResult } from './useRiskMetrics'

export type AlertType =
  | 'max_daily_loss'
  | 'max_daily_trades'
  | 'max_drawdown'
  | 'risk_per_trade_warning'
  | 'overtrade_warning'

export type AlertSeverity = 'warning' | 'critical'

export interface RiskAlert {
  id: string
  account_id: string
  user_id: string
  alert_type: AlertType
  severity: AlertSeverity
  context_data: Record<string, unknown> | null
  dismissed_at: string | null
  created_at: string
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function useRiskAlerts() {
  const { activeAccount } = useAccountContext()
  const supabase = createClient()

  const fetchAlerts = useCallback(async (days = 30): Promise<RiskAlert[]> => {
    if (!activeAccount) return []
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('risk_alerts')
      .select('*')
      .eq('account_id', activeAccount.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data
  }, [activeAccount, supabase])

  const fetchTodayAlerts = useCallback(async (): Promise<RiskAlert[]> => {
    if (!activeAccount) return []
    const today = todayISO()

    const { data, error } = await supabase
      .from('risk_alerts')
      .select('*')
      .eq('account_id', activeAccount.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data
  }, [activeAccount, supabase])

  const createAlert = useCallback(async (
    alertType: AlertType,
    severity: AlertSeverity,
    contextData: Record<string, unknown>
  ): Promise<void> => {
    if (!activeAccount) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = todayISO()

    // Avoid duplicate alerts: one per type per day per account
    const { data: existing } = await supabase
      .from('risk_alerts')
      .select('id')
      .eq('account_id', activeAccount.id)
      .eq('alert_type', alertType)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .limit(1)

    if (existing && existing.length > 0) return

    await supabase.from('risk_alerts').insert({
      account_id: activeAccount.id,
      user_id: user.id,
      alert_type: alertType,
      severity,
      context_data: contextData,
    })
  }, [activeAccount, supabase])

  const dismissAlert = useCallback(async (alertId: string): Promise<void> => {
    await supabase
      .from('risk_alerts')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', alertId)
  }, [supabase])

  /** Evaluates RiskCheckResult and writes any triggered alerts to DB */
  const processAlerts = useCallback(async (checkResult: RiskCheckResult): Promise<void> => {
    const { dailyLoss, dailyTrades, drawdown } = checkResult

    if (dailyLoss.breached) {
      await createAlert('max_daily_loss', 'critical', {
        current_pct: dailyLoss.pct,
        limit_pct: dailyLoss.limitPct,
      })
    }
    if (dailyTrades.breached) {
      await createAlert('max_daily_trades', 'critical', {
        current_count: dailyTrades.count,
        limit: dailyTrades.limit,
      })
    }
    if (drawdown.breached) {
      await createAlert('max_drawdown', 'critical', {
        current_pct: drawdown.pct,
        limit_pct: drawdown.limitPct,
      })
    }
    // Warning-level alerts (80–99% of limit)
    if (!dailyLoss.breached && dailyLoss.warning) {
      await createAlert('max_daily_loss', 'warning', {
        current_pct: dailyLoss.pct,
        limit_pct: dailyLoss.limitPct,
        ratio: dailyLoss.ratio,
      })
    }
    if (!dailyTrades.breached && dailyTrades.warning) {
      await createAlert('overtrade_warning', 'warning', {
        current_count: dailyTrades.count,
        limit: dailyTrades.limit,
      })
    }
  }, [createAlert])

  return { fetchAlerts, fetchTodayAlerts, createAlert, dismissAlert, processAlerts }
}
