'use client'

import { TrendingDown, Hash, Shield, BarChart2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RiskCheckResult } from '@/hooks/useRiskMetrics'
import type { RiskConfig } from '@/hooks/useRiskConfig'

interface Props {
  checkResult: RiskCheckResult | null
  config: RiskConfig | null
  lastTradRiskPct: number | null
}

function StatusDot({ breached, warning }: { breached: boolean; warning: boolean }) {
  if (breached) return <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
  if (warning) return <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
  return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
}

interface CardData {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  breached: boolean
  warning: boolean
}

function SummaryCard({ icon, label, value, sub, breached, warning }: CardData) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </div>
          <StatusDot breached={breached} warning={warning} />
        </div>
        <p className={cn(
          'mt-3 text-2xl font-bold tabular-nums',
          breached ? 'text-red-400' : warning ? 'text-amber-400' : 'text-foreground'
        )}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

export function RiskSummaryCards({ checkResult, config, lastTradRiskPct }: Props) {
  const dl = checkResult?.dailyLoss
  const dt = checkResult?.dailyTrades
  const dd = checkResult?.drawdown

  const rptBreached = config?.max_risk_per_trade_pct != null && lastTradRiskPct != null
    && lastTradRiskPct > config.max_risk_per_trade_pct
  const rptWarning = config?.max_risk_per_trade_pct != null && lastTradRiskPct != null
    && lastTradRiskPct > config.max_risk_per_trade_pct * 0.8 && !rptBreached

  const cards: CardData[] = [
    {
      icon: <TrendingDown className="h-4 w-4" />,
      label: 'Tages-Verlust',
      value: `${dl?.pct.toFixed(2) ?? '0.00'}%`,
      sub: config?.max_daily_loss_pct
        ? `Limit: ${config.max_daily_loss_pct}%`
        : 'Kein Limit',
      breached: dl?.breached ?? false,
      warning: dl?.warning ?? false,
    },
    {
      icon: <Hash className="h-4 w-4" />,
      label: 'Trades heute',
      value: `${dt?.count ?? 0}`,
      sub: config?.max_daily_trades
        ? `Limit: ${config.max_daily_trades} Trades`
        : 'Kein Limit',
      breached: dt?.breached ?? false,
      warning: dt?.warning ?? false,
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: 'Risk / Trade',
      value: lastTradRiskPct != null ? `${lastTradRiskPct.toFixed(2)}%` : '–',
      sub: config?.max_risk_per_trade_pct
        ? `Limit: ${config.max_risk_per_trade_pct}%`
        : 'Kein Limit',
      breached: rptBreached,
      warning: rptWarning,
    },
    {
      icon: <BarChart2 className="h-4 w-4" />,
      label: 'Max. Drawdown',
      value: `${dd?.pct.toFixed(2) ?? '0.00'}%`,
      sub: config?.max_drawdown_pct
        ? `Limit: ${config.max_drawdown_pct}%`
        : 'Kein Limit',
      breached: dd?.breached ?? false,
      warning: dd?.warning ?? false,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  )
}
