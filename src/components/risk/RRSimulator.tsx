'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { calcRR } from '@/lib/trade-calculations'
import { useAccountContext } from '@/contexts/AccountContext'
import { cn } from '@/lib/utils'
import type { Trade } from '@/hooks/useTrades'

interface Scenario {
  altSl: number | undefined
  altTp: number | undefined
}

function calcAltPotential(
  entry: number,
  altSl: number,
  altTp: number,
  lotSize: number,
  balance: number
): { riskPct: number; rewardPct: number; reward: number; risk: number } {
  const riskDist = Math.abs(entry - altSl)
  const rewardDist = Math.abs(altTp - entry)
  const riskPct = balance > 0 ? (riskDist * lotSize / balance) * 100 : 0
  const rewardPct = balance > 0 ? (rewardDist * lotSize / balance) * 100 : 0
  return {
    riskPct: Math.round(riskPct * 100) / 100,
    rewardPct: Math.round(rewardPct * 100) / 100,
    reward: Math.round(rewardDist * lotSize * 100) / 100,
    risk: Math.round(riskDist * lotSize * 100) / 100,
  }
}

interface ScenarioCardProps {
  index: number
  scenario: Scenario
  trade: Trade
  balance: number
  onChange: (s: Scenario) => void
  onRemove: () => void
  canRemove: boolean
}

function ScenarioCard({ index, scenario, trade, balance, onChange, onRemove, canRemove }: ScenarioCardProps) {
  const altRR = scenario.altSl && scenario.altTp
    ? calcRR(trade.entry_price, scenario.altSl, scenario.altTp)
    : null

  const altCalc = scenario.altSl && scenario.altTp && altRR !== null
    ? calcAltPotential(trade.entry_price, scenario.altSl, scenario.altTp, trade.lot_size, balance)
    : null

  const rrDelta = altRR !== null && trade.rr_ratio !== null
    ? altRR - trade.rr_ratio
    : null

  return (
    <div className="rounded-lg border border-border/60 p-4 space-y-3 flex-1 min-w-[180px]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Szenario {index + 1}
        </span>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground">Alt. Stop Loss</label>
          <Input
            type="number"
            step="any"
            placeholder={String(trade.sl_price)}
            className="h-8 text-sm mt-1"
            value={scenario.altSl === undefined ? '' : String(scenario.altSl)}
            onChange={e => onChange({
              ...scenario,
              altSl: e.target.value === '' ? undefined : e.target.valueAsNumber
            })}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Alt. Take Profit</label>
          <Input
            type="number"
            step="any"
            placeholder={String(trade.tp_price)}
            className="h-8 text-sm mt-1"
            value={scenario.altTp === undefined ? '' : String(scenario.altTp)}
            onChange={e => onChange({
              ...scenario,
              altTp: e.target.value === '' ? undefined : e.target.valueAsNumber
            })}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Alt. RR</p>
          <p className="text-xl font-bold tabular-nums">
            {altRR !== null ? `1:${altRR}` : '–'}
          </p>
          {rrDelta !== null && (
            <p className={cn('text-xs tabular-nums', rrDelta > 0 ? 'text-emerald-400' : 'text-red-400')}>
              {rrDelta > 0 ? '+' : ''}{rrDelta.toFixed(2)} vs. Ist
            </p>
          )}
        </div>

        {altCalc && (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Reward %</p>
                <p className="font-medium text-emerald-400 tabular-nums">+{altCalc.rewardPct.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Risk %</p>
                <p className="font-medium text-red-400 tabular-nums">-{altCalc.riskPct.toFixed(2)}%</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Preis-Einheiten × Lots</p>
          </>
        )}
      </div>
    </div>
  )
}

interface Props {
  trade: Trade
}

export function RRSimulator({ trade }: Props) {
  const { activeAccount } = useAccountContext()
  const balance = activeAccount?.start_balance ?? 10000

  const [scenarios, setScenarios] = useState<Scenario[]>([
    { altSl: undefined, altTp: undefined },
  ])

  const update = (index: number, s: Scenario) => {
    setScenarios(prev => prev.map((sc, i) => i === index ? s : sc))
  }

  const remove = (index: number) => {
    setScenarios(prev => prev.filter((_, i) => i !== index))
  }

  const add = () => {
    if (scenarios.length < 3) setScenarios(prev => [...prev, { altSl: undefined, altTp: undefined }])
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/40 border border-border/60 p-3">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Ist-Werte (unveränderlich)</p>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Entry</p>
            <p className="font-medium tabular-nums">{trade.entry_price}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ist-RR</p>
            <p className="font-bold tabular-nums">{trade.rr_ratio !== null ? `1:${trade.rr_ratio}` : '–'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ergebnis</p>
            <p className={cn('font-bold tabular-nums', trade.result_currency !== null && trade.result_currency >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {trade.result_currency !== null
                ? `${trade.result_currency >= 0 ? '+' : ''}${trade.result_currency.toFixed(2)} €`
                : '–'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {scenarios.map((sc, i) => (
          <ScenarioCard
            key={i}
            index={i}
            scenario={sc}
            trade={trade}
            balance={balance}
            onChange={s => update(i, s)}
            onRemove={() => remove(i)}
            canRemove={scenarios.length > 1}
          />
        ))}
        {scenarios.length < 3 && (
          <button
            onClick={add}
            className="flex-none w-10 rounded-lg border border-dashed border-border/60 hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Simuliert alternative RR-Szenarien. Verändert keine gespeicherten Daten.
        Reward/Risk in Preis-Einheiten × Lots (ohne instrument-spezifische Pip-Werte).
      </p>
    </div>
  )
}
