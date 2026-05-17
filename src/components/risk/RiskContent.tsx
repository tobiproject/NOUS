'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useAccountContext } from '@/contexts/AccountContext'
import { useRiskConfig, type RiskConfig } from '@/hooks/useRiskConfig'
import { useRiskMetrics, type DailyRiskMetrics, type RiskCheckResult } from '@/hooks/useRiskMetrics'
import { useRiskAlerts, type RiskAlert } from '@/hooks/useRiskAlerts'
import { RiskSummaryCards } from './RiskSummaryCards'
import { RiskGauge } from './RiskGauge'
import { RiskAlertBanner } from './RiskAlertBanner'
import { RiskAlertHistory } from './RiskAlertHistory'
import { RiskConfigForm } from './RiskConfigForm'
import { PropFirmSection } from './PropFirmSection'

export function RiskContent() {
  const { activeAccount } = useAccountContext()
  const { fetchRiskConfig, saveRiskConfig, isSaving } = useRiskConfig()
  const { fetchDailyMetrics, fetchDrawdown, checkLimits } = useRiskMetrics()
  const { fetchTodayAlerts, fetchAlerts, dismissAlert, processAlerts } = useRiskAlerts()

  const [config, setConfig] = useState<RiskConfig | null>(null)
  const [metrics, setMetrics] = useState<DailyRiskMetrics | null>(null)
  const [drawdownPct, setDrawdownPct] = useState(0)
  const [checkResult, setCheckResult] = useState<RiskCheckResult | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<RiskAlert[]>([])
  const [historyAlerts, setHistoryAlerts] = useState<RiskAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)

  const loadAll = useCallback(async () => {
    if (!activeAccount) return
    setIsLoading(true)
    try {
      const [cfg, daily, dd] = await Promise.all([
        fetchRiskConfig(),
        fetchDailyMetrics(),
        fetchDrawdown(),
      ])
      setConfig(cfg)
      setDrawdownPct(dd)

      if (daily) {
        setMetrics(daily)
        if (cfg) {
          const result = await checkLimits(daily, dd, {
            max_daily_loss_pct: cfg.max_daily_loss_pct,
            max_daily_trades: cfg.max_daily_trades,
            max_drawdown_pct: cfg.max_drawdown_pct,
          })
          setCheckResult(result)
          await processAlerts(result)
        }
      }

      const [todayA, histA] = await Promise.all([
        fetchTodayAlerts(),
        fetchAlerts(30),
      ])
      setActiveAlerts(todayA)
      setHistoryAlerts(histA)
      setIsHistoryLoading(false)
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount, fetchRiskConfig, fetchDailyMetrics, fetchDrawdown, checkLimits, processAlerts, fetchTodayAlerts, fetchAlerts])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleDismiss = async (id: string) => {
    await dismissAlert(id)
    setActiveAlerts(prev => prev.filter(a => a.id !== id))
  }

  const handleSaveConfig = async (values: {
    max_daily_loss_pct?: number
    max_daily_trades?: number
    max_risk_per_trade_pct?: number
    max_drawdown_pct?: number
  }) => {
    const { data } = await saveRiskConfig({
      max_daily_loss_pct: values.max_daily_loss_pct ?? null,
      max_daily_trades: values.max_daily_trades ?? null,
      max_risk_per_trade_pct: values.max_risk_per_trade_pct ?? null,
      max_drawdown_pct: values.max_drawdown_pct ?? null,
    })
    if (data) {
      setConfig(data)
      if (metrics) {
        const result = await checkLimits(metrics, drawdownPct, {
          max_daily_loss_pct: data.max_daily_loss_pct,
          max_daily_trades: data.max_daily_trades,
          max_drawdown_pct: data.max_drawdown_pct,
        })
        setCheckResult(result)
      }
    }
  }

  const lossRatio = checkResult?.dailyLoss.ratio ?? null
  const lastTradeRiskPct = metrics?.dailyRiskPct ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Management</h1>
        <p className="text-muted-foreground text-sm">
          {activeAccount ? `Konto: ${activeAccount.name}` : 'Kein aktives Konto'}
        </p>
      </div>

      {!activeAccount && (
        <p className="text-muted-foreground text-sm border border-dashed border-border/60 rounded-lg p-8 text-center">
          Bitte wähle ein aktives Konto aus, um Risk-Metriken zu sehen.
        </p>
      )}

      {activeAccount && (
        <>
          {/* Active alert banners */}
          {activeAlerts.length > 0 && (
            <RiskAlertBanner alerts={activeAlerts} onDismiss={handleDismiss} />
          )}

          {!config && !isLoading && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Risk-Limits noch nicht konfiguriert — konfiguriere sie unten, um Warnungen zu erhalten.
            </div>
          )}

          {/* Summary cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
          ) : (
            <RiskSummaryCards
              checkResult={checkResult}
              config={config}
              lastTradRiskPct={lastTradeRiskPct}
            />
          )}

          {/* Gauges */}
          {!isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 rounded-lg border border-border/60 p-4">
              <RiskGauge
                label="Tages-Verlust"
                currentValue={(checkResult?.dailyLoss.pct ?? 0).toFixed(2)}
                limitValue={config?.max_daily_loss_pct?.toFixed(2) ?? null}
                ratio={lossRatio}
              />
              <RiskGauge
                label="Drawdown"
                currentValue={drawdownPct.toFixed(2)}
                limitValue={config?.max_drawdown_pct?.toFixed(2) ?? null}
                ratio={checkResult?.drawdown.ratio ?? null}
              />
              <RiskGauge
                label="Trades heute"
                currentValue={String(metrics?.dailyTradeCount ?? 0)}
                limitValue={config?.max_daily_trades != null ? String(config.max_daily_trades) : null}
                ratio={checkResult?.dailyTrades
                  ? (config?.max_daily_trades ? (metrics?.dailyTradeCount ?? 0) / config.max_daily_trades : null)
                  : null}
                unit=""
              />
            </div>
          )}

          <Separator />

          {/* Prop-firm rules */}
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg-1)' }}>Prop-Firm Regeln</p>
            <p className="text-xs mb-3" style={{ color: 'var(--fg-3)' }}>
              Tagesverlust-Limit, Max-Drawdown und Profit-Ziel deiner Prop-Firm — werden als Fortschrittsbalken angezeigt.
            </p>
            <PropFirmSection />
          </div>

          <Separator />

          {/* Config form */}
          <RiskConfigForm config={config} isSaving={isSaving} onSave={handleSaveConfig} />

          <Separator />

          {/* Alert history */}
          <RiskAlertHistory alerts={historyAlerts} isLoading={isHistoryLoading} />
        </>
      )}
    </div>
  )
}
