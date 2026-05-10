'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarFilters, ImpactLevel } from '@/types/calendar'
import { ImpactDot } from './ImpactDot'

const IMPACT_LEVELS: ImpactLevel[] = ['High', 'Medium', 'Low']
const IMPACT_LABELS: Record<ImpactLevel, string> = {
  High: 'High',
  Medium: 'Med',
  Low: 'Low',
}

const TOP_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'CNY']

interface Props {
  filters: CalendarFilters
  onChange: (filters: CalendarFilters) => void
}

export function KalenderFilterBar({ filters, onChange }: Props) {
  const toggleImpact = (level: ImpactLevel) => {
    const has = filters.impact.includes(level)
    const newImpact = has
      ? filters.impact.filter(l => l !== level)
      : [...filters.impact, level]
    onChange({ ...filters, impact: newImpact as ImpactLevel[] })
  }

  const toggleCurrency = (currency: string) => {
    const has = filters.currencies.includes(currency)
    const newCurrencies = has
      ? filters.currencies.filter(c => c !== currency)
      : [...filters.currencies, currency]
    onChange({ ...filters, currencies: newCurrencies })
  }

  const isDefault =
    filters.impact.length === 3 && filters.currencies.length === 0

  const reset = () => onChange({ impact: ['High', 'Medium', 'Low'], currencies: [] })

  return (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      {/* Impact toggles */}
      <div className="flex items-center gap-1 shrink-0">
        {IMPACT_LEVELS.map(level => {
          const active = filters.impact.includes(level)
          return (
            <button
              key={level}
              onClick={() => toggleImpact(level)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all',
                active
                  ? 'opacity-100'
                  : 'opacity-40 hover:opacity-60'
              )}
              style={{
                background: active ? 'var(--bg-3)' : 'var(--bg-2)',
                border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border-raw)'}`,
                color: 'var(--fg-2)',
              }}
            >
              <ImpactDot impact={level} />
              {IMPACT_LABELS[level]}
            </button>
          )
        })}
      </div>

      <div className="w-px h-4 shrink-0" style={{ background: 'var(--border-raw)' }} />

      {/* Currency filters — horizontal scroll on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {TOP_CURRENCIES.map(currency => {
          const active = filters.currencies.includes(currency)
          return (
            <button
              key={currency}
              onClick={() => toggleCurrency(currency)}
              className={cn(
                'px-2 py-1 rounded text-xs font-mono font-medium transition-all shrink-0',
                active
                  ? 'opacity-100'
                  : 'opacity-40 hover:opacity-60'
              )}
              style={{
                background: active ? 'var(--brand-blue-soft)' : 'var(--bg-2)',
                border: `1px solid ${active ? 'rgba(255,130,16,0.3)' : 'var(--border-raw)'}`,
                color: active ? 'var(--brand-blue)' : 'var(--fg-3)',
              }}
            >
              {currency}
            </button>
          )
        })}
      </div>

      {/* Reset */}
      {!isDefault && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs shrink-0"
          style={{ color: 'var(--fg-4)' }}
          onClick={reset}
        >
          Zurücksetzen
        </Button>
      )}
    </div>
  )
}
