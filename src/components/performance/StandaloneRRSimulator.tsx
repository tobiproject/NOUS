'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { calcRR } from '@/lib/trade-calculations'
import { useAccountContext } from '@/contexts/AccountContext'
import { cn } from '@/lib/utils'

interface Inputs {
  entry: string
  sl: string
  tp: string
  lotSize: string
  direction: 'long' | 'short'
}

interface Scenario {
  altSl: string
  altTp: string
}

function calcResult(entry: number, sl: number, tp: number, lotSize: number, balance: number, direction: 'long' | 'short') {
  const rr = calcRR(entry, sl, tp)
  const slDist = Math.abs(entry - sl)
  const tpDist = Math.abs(tp - entry)
  const favorable = direction === 'long' ? tp > entry : tp < entry

  if (!favorable || slDist <= 0 || tpDist <= 0) return null

  const riskAmt = slDist * lotSize
  const rewardAmt = tpDist * lotSize
  const riskPct = balance > 0 ? (riskAmt / balance) * 100 : 0
  const rewardPct = balance > 0 ? (rewardAmt / balance) * 100 : 0

  return { rr, riskAmt, rewardAmt, riskPct, rewardPct }
}

interface ScenarioCardProps {
  index: number
  scenario: Scenario
  baseEntry: number
  baseLotSize: number
  baseDirection: 'long' | 'short'
  balance: number
  onChange: (s: Scenario) => void
  onRemove: () => void
  canRemove: boolean
}

function ScenarioCard({ index, scenario, baseEntry, baseLotSize, baseDirection, balance, onChange, onRemove, canRemove }: ScenarioCardProps) {
  const altSl = parseFloat(scenario.altSl)
  const altTp = parseFloat(scenario.altTp)
  const validInputs = !isNaN(altSl) && !isNaN(altTp) && altSl > 0 && altTp > 0 && baseEntry > 0 && baseLotSize > 0

  const result = validInputs ? calcResult(baseEntry, altSl, altTp, baseLotSize, balance, baseDirection) : null

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
          <label className="text-xs text-muted-foreground">Stop Loss</label>
          <Input
            type="number"
            step="any"
            placeholder="z.B. 1.0820"
            className="h-8 text-sm mt-1"
            value={scenario.altSl}
            onChange={e => onChange({ ...scenario, altSl: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Take Profit</label>
          <Input
            type="number"
            step="any"
            placeholder="z.B. 1.0920"
            className="h-8 text-sm mt-1"
            value={scenario.altTp}
            onChange={e => onChange({ ...scenario, altTp: e.target.value })}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">RR</p>
          <p className="text-xl font-bold tabular-nums">
            {result?.rr !== null && result?.rr !== undefined ? `1:${result.rr}` : '–'}
          </p>
        </div>

        {result && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Reward %</p>
              <p className="font-medium text-emerald-400 tabular-nums">+{result.rewardPct.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Risk %</p>
              <p className="font-medium text-red-400 tabular-nums">-{result.riskPct.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reward €</p>
              <p className="font-medium text-emerald-400 tabular-nums">+{result.rewardAmt.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Risk €</p>
              <p className="font-medium text-red-400 tabular-nums">-{result.riskAmt.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function StandaloneRRSimulator() {
  const { activeAccount } = useAccountContext()
  const balance = activeAccount?.start_balance ?? 10000

  const [inputs, setInputs] = useState<Inputs>({
    entry: '', sl: '', tp: '', lotSize: '', direction: 'long',
  })

  const [scenarios, setScenarios] = useState<Scenario[]>([
    { altSl: '', altTp: '' },
  ])

  const entry = parseFloat(inputs.entry)
  const lotSize = parseFloat(inputs.lotSize)

  const updateScenario = (index: number, s: Scenario) =>
    setScenarios(prev => prev.map((sc, i) => i === index ? s : sc))

  const removeScenario = (index: number) =>
    setScenarios(prev => prev.filter((_, i) => i !== index))

  const addScenario = () => {
    if (scenarios.length < 3) setScenarios(prev => [...prev, { altSl: '', altTp: '' }])
  }

  return (
    <div className="space-y-5">
      {/* Base inputs */}
      <div className="rounded-lg border border-border/60 p-4 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trade-Parameter</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Richtung</label>
            <div className="flex mt-1 rounded-md overflow-hidden border border-border/60 h-8">
              <button
                onClick={() => setInputs(i => ({ ...i, direction: 'long' }))}
                className={cn('flex-1 text-xs font-medium transition-colors', inputs.direction === 'long'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-muted-foreground hover:bg-muted/30')}
              >
                Long
              </button>
              <button
                onClick={() => setInputs(i => ({ ...i, direction: 'short' }))}
                className={cn('flex-1 text-xs font-medium transition-colors border-l border-border/60', inputs.direction === 'short'
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-muted-foreground hover:bg-muted/30')}
              >
                Short
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Entry</label>
            <Input
              type="number" step="any" placeholder="z.B. 1.0850"
              className="h-8 text-sm mt-1"
              value={inputs.entry}
              onChange={e => setInputs(i => ({ ...i, entry: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Lot-Größe</label>
            <Input
              type="number" step="any" placeholder="z.B. 0.1"
              className="h-8 text-sm mt-1"
              value={inputs.lotSize}
              onChange={e => setInputs(i => ({ ...i, lotSize: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Kontostand (€)</label>
            <Input
              type="number" step="any" placeholder={String(balance)}
              className="h-8 text-sm mt-1"
              value={inputs.lotSize === '' && balance > 0 ? '' : ''}
              disabled
              style={{ color: 'var(--fg-3)' }}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">{balance.toLocaleString('de-DE')} €</p>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div className="flex gap-3 flex-wrap">
        {scenarios.map((sc, i) => (
          <ScenarioCard
            key={i}
            index={i}
            scenario={sc}
            baseEntry={isNaN(entry) ? 0 : entry}
            baseLotSize={isNaN(lotSize) ? 0 : lotSize}
            baseDirection={inputs.direction}
            balance={balance}
            onChange={s => updateScenario(i, s)}
            onRemove={() => removeScenario(i)}
            canRemove={scenarios.length > 1}
          />
        ))}
        {scenarios.length < 3 && (
          <button
            onClick={addScenario}
            className="flex-none w-10 rounded-lg border border-dashed border-border/60 hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Simuliert RR-Szenarien für geplante Trades. Kontostand und Lot-Größe bestimmen Risk/Reward in Prozent.
        Reward/Risk in Preis-Einheiten × Lots (ohne instrument-spezifischen Pip-Wert).
      </p>
    </div>
  )
}
