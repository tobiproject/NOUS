'use client'

import { AlertTriangle, XCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RiskAlert, AlertType } from '@/hooks/useRiskAlerts'

const ALERT_LABELS: Record<AlertType, string> = {
  max_daily_loss: 'Max. Daily Loss erreicht',
  max_daily_trades: 'Max. Daily Trades erreicht',
  max_drawdown: 'Max. Drawdown erreicht',
  risk_per_trade_warning: 'Hohes Risiko pro Trade',
  overtrade_warning: 'Overtrade-Warnung',
}

function alertDescription(alert: RiskAlert): string {
  const ctx = alert.context_data ?? {}
  switch (alert.alert_type) {
    case 'max_daily_loss':
      return `Tagesverlust: ${Number(ctx.current_pct ?? 0).toFixed(2)}% von ${Number(ctx.limit_pct ?? 0).toFixed(2)}% Limit`
    case 'max_daily_trades':
      return `${ctx.current_count} Trades heute — Limit: ${ctx.limit}`
    case 'max_drawdown':
      return `Drawdown: ${Number(ctx.current_pct ?? 0).toFixed(2)}% von ${Number(ctx.limit_pct ?? 0).toFixed(2)}% Limit`
    case 'risk_per_trade_warning':
      return `Risiko ${Number(ctx.risk_pct ?? 0).toFixed(2)}% überschreitet Limit von ${Number(ctx.limit_pct ?? 0).toFixed(2)}%`
    case 'overtrade_warning':
      return `${ctx.current_count} von ${ctx.limit} Trades heute erreicht`
    default:
      return ''
  }
}

interface Props {
  alerts: RiskAlert[]
  onDismiss: (id: string) => void
}

export function RiskAlertBanner({ alerts, onDismiss }: Props) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const isCritical = alert.severity === 'critical'
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
              isCritical
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}
          >
            {isCritical
              ? <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{ALERT_LABELS[alert.alert_type]}</p>
              <p className="text-xs opacity-80 mt-0.5">{alertDescription(alert)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
