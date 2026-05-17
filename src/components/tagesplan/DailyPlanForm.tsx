'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2, Save, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useDailyPlan, type DailyPlan, type DailyPlanInput } from '@/hooks/useDailyPlan'
import { AssetMultiPicker } from '@/components/watchlist/AssetMultiPicker'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const COMMON_ERRORS = [
  'Zu früh eingestiegen',
  'Stop-Loss zu eng',
  'Position zu groß',
  'FOMO Trade',
  'Gegen den Trend',
  'Kein Plan gehabt',
  'Zu früh ausgestiegen',
  'Overtrading',
  'News ignoriert',
  'Emotionaler Trade',
]

type Bias = 'bullish' | 'bearish' | 'neutral'

interface Props {
  initialPlan?: DailyPlan | null
  onSaved?: () => void
}

export function DailyPlanForm({ initialPlan, onSaved }: Props) {
  const { savePlan } = useDailyPlan()
  const [bias, setBias] = useState<Bias | null>(initialPlan?.market_bias ?? null)
  const [focusAssets, setFocusAssets] = useState<string[]>(initialPlan?.focus_assets ?? [])
  const [errorsToAvoid, setErrorsToAvoid] = useState<string[]>(initialPlan?.errors_to_avoid ?? [])
  const [notes, setNotes] = useState(initialPlan?.notes ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const today = format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })

  const toggleError = (e: string) => {
    setErrorsToAvoid(prev =>
      prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    const input: DailyPlanInput = {
      market_bias: bias,
      focus_assets: focusAssets,
      errors_to_avoid: errorsToAvoid,
      notes,
    }
    const { error } = await savePlan(input)
    setIsSaving(false)
    if (error) {
      toast.error('Tagesplan konnte nicht gespeichert werden: ' + error)
    } else {
      setSaved(true)
      toast.success('Tagesplan gespeichert')
      onSaved?.()
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">{today}</p>
      </div>

      {/* Market Bias */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Markt-Bias</p>
        <div className="flex gap-2">
          {([
            { value: 'bullish', label: 'Bullish', icon: TrendingUp, color: 'emerald' },
            { value: 'neutral', label: 'Neutral', icon: Minus, color: 'amber' },
            { value: 'bearish', label: 'Bearish', icon: TrendingDown, color: 'red' },
          ] as const).map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBias(prev => prev === value ? null : value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all',
                bias === value
                  ? color === 'emerald'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : color === 'amber'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Focus Assets */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Fokus-Assets heute</p>
        <AssetMultiPicker
          value={focusAssets}
          onChange={setFocusAssets}
          placeholder="Asset aus Watchlist…"
        />
      </div>

      {/* Errors to Avoid */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Fehler vermeiden heute</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_ERRORS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => toggleError(e)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                errorsToAvoid.includes(e)
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {e}
            </button>
          ))}
        </div>
        {errorsToAvoid.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {errorsToAvoid.length} Fehler markiert
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Sonstiges</p>
        <Textarea
          placeholder="Besonderheiten heute, wichtige Level, Nachrichten…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Speichern…</>
        ) : saved ? (
          <><CheckCircle className="h-4 w-4 mr-2 text-emerald-400" /> Gespeichert</>
        ) : (
          <><Save className="h-4 w-4 mr-2" /> Tagesplan speichern</>
        )}
      </Button>
    </div>
  )
}
