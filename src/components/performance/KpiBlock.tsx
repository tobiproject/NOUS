'use client'

import {
  Hash, Percent, TrendingUp, TrendingDown, BarChart2,
  Flame, AlertTriangle, ChevronsUp, ChevronsDown, Activity,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { KpiStats } from '@/hooks/usePerformanceStats'

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: string
  colorClass?: string
  tooltip: string
}

function KpiCard({ icon, label, value, sub, colorClass, tooltip }: KpiCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="border-border/60 cursor-default">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                {icon}
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className={cn('text-xl font-bold tabular-nums truncate', colorClass ?? 'text-foreground')}>
                {value}
              </p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function na(sub?: string) {
  return <span className="text-sm font-normal text-muted-foreground">{sub ?? 'N/A'}</span>
}

interface Props {
  kpi: KpiStats
}

export function KpiBlock({ kpi }: Props) {
  const ddColor = kpi.maxDrawdownPct > 10
    ? 'text-red-400'
    : kpi.maxDrawdownPct > 5
    ? 'text-amber-400'
    : 'text-emerald-400'

  const pfColor = kpi.profitFactor === null
    ? undefined
    : kpi.profitFactor >= 1.5
    ? 'text-emerald-400'
    : kpi.profitFactor >= 1
    ? 'text-amber-400'
    : 'text-red-400'

  const wrColor = kpi.winRate === null
    ? undefined
    : kpi.winRate >= 55
    ? 'text-emerald-400'
    : kpi.winRate >= 45
    ? 'text-amber-400'
    : 'text-red-400'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiCard
        icon={<Hash className="h-4 w-4" />}
        label="Trades gesamt"
        value={kpi.totalTrades}
        tooltip="Gesamtanzahl aller abgeschlossenen Trades im gewählten Zeitraum."
      />
      <KpiCard
        icon={<Percent className="h-4 w-4" />}
        label="Winrate"
        value={kpi.winRate === null ? na() : `${kpi.winRate.toFixed(1)}%`}
        colorClass={wrColor}
        tooltip="Anteil der gewinnbringenden Trades. ≥55% gilt als stark, 45–54% ist neutral, <45% ist ein Warnsignal."
      />
      <KpiCard
        icon={<BarChart2 className="h-4 w-4" />}
        label="Profit-Faktor"
        value={kpi.profitFactor === null ? na('Keine Verluste') : kpi.profitFactor === 999 ? '∞' : kpi.profitFactor.toFixed(2)}
        colorClass={pfColor}
        sub={kpi.profitFactor !== null && kpi.profitFactor !== 999 ? (kpi.profitFactor >= 1 ? 'Profitabel' : 'Nicht profitabel') : undefined}
        tooltip="Verhältnis von Gesamtgewinn zu Gesamtverlust. Werte ≥1.5 sind profitabel, <1.0 bedeutet Verlust im Durchschnitt."
      />
      <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="Ø Gewinn"
        value={kpi.avgWin === null ? na() : `${kpi.avgWin.toFixed(2)} €`}
        colorClass="text-emerald-400"
        tooltip="Durchschnittlicher Gewinn pro gewinnendem Trade in Euro."
      />
      <KpiCard
        icon={<TrendingDown className="h-4 w-4" />}
        label="Ø Verlust"
        value={kpi.avgLoss === null ? na() : `${kpi.avgLoss.toFixed(2)} €`}
        colorClass="text-red-400"
        tooltip="Durchschnittlicher Verlust pro verlierendem Trade in Euro. Sollte kleiner als der Ø Gewinn sein."
      />
      <KpiCard
        icon={<Activity className="h-4 w-4" />}
        label="Ø RR (Gewinner)"
        value={kpi.avgRRWins === null ? na() : `1:${kpi.avgRRWins.toFixed(2)}`}
        tooltip="Durchschnittliches Chance-Risiko-Verhältnis nur der gewinnenden Trades. Zeigt, wie groß deine Gewinner im Vergleich zu deinem Risiko sind."
      />
      <KpiCard
        icon={<Activity className="h-4 w-4" />}
        label="Ø RR (alle)"
        value={kpi.avgRRAll === null ? na() : `1:${kpi.avgRRAll.toFixed(2)}`}
        tooltip="Durchschnittliches RR aller Trades inkl. Verluste. Ein positiver Wert bedeutet, dass du im Schnitt mehr gewinnst als riskierst."
      />
      <KpiCard
        icon={<Flame className="h-4 w-4" />}
        label="Beste Serie"
        value={kpi.bestStreak === 0 ? na() : `${kpi.bestStreak}×`}
        colorClass="text-emerald-400"
        sub={kpi.bestStreak > 0 ? 'Wins in Folge' : undefined}
        tooltip="Längste Gewinn-Strähne: wie viele Trades du nacheinander gewonnen hast."
      />
      <KpiCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Schlechteste Serie"
        value={kpi.worstStreak === 0 ? na() : `${kpi.worstStreak}×`}
        colorClass={kpi.worstStreak > 0 ? 'text-red-400' : undefined}
        sub={kpi.worstStreak > 0 ? 'Losses in Folge' : undefined}
        tooltip="Längste Verlust-Strähne: wie viele Trades du nacheinander verloren hast. Wichtig für psychologisches Risiko-Management."
      />
      <KpiCard
        icon={<ChevronsDown className="h-4 w-4" />}
        label="Max Drawdown"
        value={`${kpi.maxDrawdownPct.toFixed(2)}%`}
        colorClass={ddColor}
        sub={kpi.maxDrawdownPct > 10 ? '⚠ Kritisch' : kpi.maxDrawdownPct > 5 ? '⚠ Erhöht' : undefined}
        tooltip="Größter prozentualer Kapitalrückgang vom Hochpunkt. >10% ist kritisch, >5% erhöht. Maßstab für dein Risiko-Management."
      />
    </div>
  )
}
