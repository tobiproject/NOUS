'use client'

import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Target, Lightbulb, Clock, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { PeriodAnalysis } from '@/hooks/useAiPeriodAnalysis'

function DeltaBadge({ delta, unit = '' }: { delta: number; unit?: string }) {
  const isPositive = delta > 0
  const isZero = delta === 0
  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown
  const color = isZero ? 'text-muted-foreground' : isPositive ? 'text-emerald-400' : 'text-red-400'
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{delta.toFixed(1)}{unit}
    </span>
  )
}

function StatItem({ label, value, delta, unit }: { label: string; value: string; delta?: number; unit?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className="text-sm font-semibold">{value}</p>
        {delta !== undefined && <DeltaBadge delta={delta} unit={unit} />}
      </div>
    </div>
  )
}

interface Props {
  analysis: PeriodAnalysis
}

export function PeriodAnalysisCard({ analysis }: Props) {
  const r = analysis.full_response

  if (analysis.status === 'pending' || analysis.status === 'processing') {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 justify-center">
          <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">
            {analysis.status === 'pending' ? 'Analyse in Warteschlange…' : 'Analyse wird erstellt…'}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (analysis.status === 'failed') {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 justify-center">
          <XCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Analyse fehlgeschlagen{analysis.error_message ? `: ${analysis.error_message}` : ''}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!r) return null

  const periodLabel = `${analysis.period_start} – ${analysis.period_end}`
  const pnlColor = r.pnl > 0 ? 'text-emerald-400' : r.pnl < 0 ? 'text-red-400' : 'text-amber-400'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{periodLabel}</CardTitle>
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
            Abgeschlossen
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">P&L</p>
            <p className={`text-lg font-bold tabular-nums ${pnlColor}`}>
              {r.pnl >= 0 ? '+' : ''}{r.pnl.toFixed(2)}€
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Trades</p>
            <p className="text-lg font-bold tabular-nums">{r.trade_count}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Winrate</p>
            <p className="text-lg font-bold tabular-nums">{r.win_rate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Vormonatsvergleich (monthly only) */}
        {r.vs_previous && (
          <div className="grid grid-cols-3 gap-3 rounded-md border border-border/40 bg-muted/30 p-2.5">
            <StatItem label="Winrate Δ" value="" delta={r.vs_previous.win_rate_delta} unit="%" />
            <StatItem label="Profit-F. Δ" value="" delta={r.vs_previous.profit_factor_delta} />
            <StatItem label="Ø RR Δ" value="" delta={r.vs_previous.avg_rr_delta} />
          </div>
        )}

        {/* Summary */}
        {r.summary && (
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-sm leading-relaxed">{r.summary}</p>
          </div>
        )}

        {/* Top errors */}
        {r.top_errors?.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-medium uppercase tracking-wide">Top-Fehler</p>
              </div>
              <div className="space-y-1.5">
                {r.top_errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-xs shrink-0 border-amber-500/30 text-amber-400">
                      {err.count}×
                    </Badge>
                    <div>
                      <span className="font-medium text-xs">{err.category}: </span>
                      <span className="text-muted-foreground text-xs">{err.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Top strengths */}
        {r.top_strengths?.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-medium uppercase tracking-wide">Stärken</p>
              </div>
              <div className="space-y-1.5">
                {r.top_strengths.map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{s.description}</p>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Focus next period */}
        {r.focus_next_period && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="h-4 w-4 text-blue-400" />
                <p className="text-xs font-medium uppercase tracking-wide">Fokus nächste Periode</p>
              </div>
              <p className="text-sm text-muted-foreground">{r.focus_next_period}</p>
            </div>
          </>
        )}

        {/* Actions (monthly only) */}
        {r.actions && r.actions.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-4 w-4 text-purple-400" />
                <p className="text-xs font-medium uppercase tracking-wide">Maßnahmen</p>
              </div>
              <div className="space-y-1.5">
                {r.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <PriorityBadge priority={a.priority} />
                    <p className="text-xs text-muted-foreground flex-1">{a.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const map = {
    high: 'bg-red-500/15 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-muted text-muted-foreground border-border',
  }
  const labels = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' }
  return (
    <Badge variant="outline" className={`text-xs shrink-0 ${map[priority]}`}>
      {labels[priority]}
    </Badge>
  )
}
