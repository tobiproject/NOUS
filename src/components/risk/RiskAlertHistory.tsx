'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { RiskAlert, AlertType } from '@/hooks/useRiskAlerts'

const ALERT_LABELS: Record<AlertType, string> = {
  max_daily_loss: 'Max. Daily Loss',
  max_daily_trades: 'Max. Daily Trades',
  max_drawdown: 'Max. Drawdown',
  risk_per_trade_warning: 'Risk/Trade',
  overtrade_warning: 'Overtrade',
}

function contextSummary(alert: RiskAlert): string {
  const ctx = alert.context_data ?? {}
  switch (alert.alert_type) {
    case 'max_daily_loss':
      return `${Number(ctx.current_pct ?? 0).toFixed(2)}% / ${Number(ctx.limit_pct ?? 0).toFixed(2)}%`
    case 'max_daily_trades':
      return `${ctx.current_count} / ${ctx.limit} Trades`
    case 'max_drawdown':
      return `${Number(ctx.current_pct ?? 0).toFixed(2)}% / ${Number(ctx.limit_pct ?? 0).toFixed(2)}%`
    case 'risk_per_trade_warning':
      return `${Number(ctx.risk_pct ?? 0).toFixed(2)}% / ${Number(ctx.limit_pct ?? 0).toFixed(2)}%`
    case 'overtrade_warning':
      return `${ctx.current_count} / ${ctx.limit} Trades`
    default:
      return '–'
  }
}

interface Props {
  alerts: RiskAlert[]
  isLoading: boolean
}

export function RiskAlertHistory({ alerts, isLoading }: Props) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ausgelöste Risikoregeln — letzte 30 Tage</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 px-6 pb-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 pb-4">
            Keine Risikoregeln in den letzten 30 Tagen ausgelöst.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead>Datum</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Schwere</TableHead>
                <TableHead>Wert / Limit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map(alert => (
                <TableRow key={alert.id} className="border-border/40">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(alert.created_at), 'dd.MM.yy HH:mm', { locale: de })}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {ALERT_LABELS[alert.alert_type]}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={alert.severity === 'critical'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30 text-xs'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs'}
                    >
                      {alert.severity === 'critical' ? 'Kritisch' : 'Warnung'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {contextSummary(alert)}
                  </TableCell>
                  <TableCell>
                    {alert.dismissed_at
                      ? <span className="text-xs text-muted-foreground">Dismissed</span>
                      : <span className="text-xs text-emerald-400">Aktiv</span>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
