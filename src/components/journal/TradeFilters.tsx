'use client'

import { useState } from 'react'
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TradeFilters } from '@/hooks/useTrades'

interface Props {
  filters: TradeFilters
  onFiltersChange: (filters: TradeFilters) => void
  assetOptions?: string[]
  setupOptions?: string[]
  strategyOptions?: string[]
}

const ALL = '__all__'

export function TradeFilters({ filters, onFiltersChange, assetOptions = [], setupOptions = [], strategyOptions = [] }: Props) {
  const [expanded, setExpanded] = useState(false)

  const update = (patch: Partial<TradeFilters>) => {
    onFiltersChange({ ...filters, ...patch })
  }

  const hasActiveFilters = Object.values(filters).some(v =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  )

  const clearAll = () => onFiltersChange({})

  return (
    <div className="space-y-2">
      {/* Row 1: main filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Asset, Setup, Notizen…"
            value={filters.search ?? ''}
            onChange={e => update({ search: e.target.value || undefined })}
          />
        </div>

        <Input
          type="date"
          className="w-[160px]"
          title="Von Datum"
          value={filters.dateFrom ?? ''}
          onChange={e => update({ dateFrom: e.target.value || undefined })}
        />
        <Input
          type="date"
          className="w-[160px]"
          title="Bis Datum"
          value={filters.dateTo ?? ''}
          onChange={e => update({ dateTo: e.target.value || undefined })}
        />

        <Select
          value={filters.direction ?? ALL}
          onValueChange={v => update({ direction: v === ALL ? undefined : v as TradeFilters['direction'] })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Richtung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Richtungen</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.outcome ?? ALL}
          onValueChange={v => update({ outcome: v === ALL ? undefined : v as TradeFilters['outcome'] })}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Ergebnis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Ergebnisse</SelectItem>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(e => !e)}
          className="text-muted-foreground gap-1"
        >
          Mehr Filter
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground gap-1">
            <X className="h-3.5 w-3.5" />
            Zurücksetzen
          </Button>
        )}
      </div>

      {/* Row 2: extended filters */}
      {expanded && (
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="relative min-w-[160px]">
            <Input
              list="asset-filter-options"
              placeholder="Asset"
              value={filters.assets?.[0] ?? ''}
              onChange={e => update({ assets: e.target.value ? [e.target.value] : undefined })}
              className="w-[160px]"
            />
            <datalist id="asset-filter-options">
              {assetOptions.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>

          <div className="relative min-w-[160px]">
            <Input
              list="setup-filter-options"
              placeholder="Setup-Typ"
              value={filters.setupType ?? ''}
              onChange={e => update({ setupType: e.target.value || undefined })}
              className="w-[160px]"
            />
            <datalist id="setup-filter-options">
              {setupOptions.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div className="relative min-w-[160px]">
            <Input
              list="strategy-filter-options"
              placeholder="Strategie"
              value={filters.strategy ?? ''}
              onChange={e => update({ strategy: e.target.value || undefined })}
              className="w-[160px]"
            />
            <datalist id="strategy-filter-options">
              {strategyOptions.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          <Select
            value={filters.emotion ?? ALL}
            onValueChange={v => update({ emotion: v === ALL ? undefined : v })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Emotion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle Emotionen</SelectItem>
              <SelectItem value="calm">Ruhig</SelectItem>
              <SelectItem value="focused">Fokussiert</SelectItem>
              <SelectItem value="nervous">Nervös</SelectItem>
              <SelectItem value="impatient">Ungeduldig</SelectItem>
              <SelectItem value="overconfident">Overconfident</SelectItem>
              <SelectItem value="fomo">FOMO</SelectItem>
              <SelectItem value="tired">Müde</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
