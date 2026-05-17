'use client'

import { useState } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { StatsFilter } from '@/hooks/usePerformanceStats'

const QUICK_PRESETS = [
  { label: '7T', days: 7 },
  { label: '30T', days: 30 },
  { label: '90T', days: 90 },
  { label: '1J', days: 365 },
  { label: 'Gesamt', days: null },
] as const

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysAgo(n: number): string {
  return toDateStr(new Date(Date.now() - n * 86400000))
}

interface Props {
  filter: StatsFilter
  availableAssets: string[]
  availableStrategies: string[]
  availableSetupTypes: string[]
  onFilterChange: (f: StatsFilter) => void
}

export function StatsFilterBar({
  filter,
  availableAssets,
  availableStrategies,
  availableSetupTypes,
  onFilterChange,
}: Props) {
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)

  function setPreset(days: number | null) {
    if (days === null) {
      onFilterChange({ ...filter, dateFrom: undefined, dateTo: undefined })
    } else {
      onFilterChange({ ...filter, dateFrom: daysAgo(days), dateTo: undefined })
    }
  }

  function activePreset(): number | null | undefined {
    if (!filter.dateFrom && !filter.dateTo) return null
    if (filter.dateTo) return undefined
    if (filter.dateFrom) {
      for (const p of QUICK_PRESETS) {
        if (p.days !== null && filter.dateFrom === daysAgo(p.days)) return p.days
      }
    }
    return undefined
  }

  const activeP = activePreset()
  const hasFilter = !!(filter.dateFrom || filter.dateTo ||
    filter.assets?.length || filter.strategies?.length || filter.setupTypes?.length)

  function toggle<K extends keyof StatsFilter>(
    key: K,
    value: string,
    current: string[] | undefined
  ) {
    const arr = current ?? []
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
    onFilterChange({ ...filter, [key]: next.length > 0 ? next : undefined })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick presets */}
      <div className="flex items-center gap-1 border border-border/60 rounded-md p-0.5">
        {QUICK_PRESETS.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => setPreset(days)}
            className={cn(
              'px-2.5 py-1 text-xs rounded transition-colors',
              activeP === days
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date from */}
      <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 text-xs border-border/60',
              filter.dateFrom ? 'border-primary/50 text-foreground' : 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {filter.dateFrom ?? 'Von'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filter.dateFrom ? new Date(filter.dateFrom) : undefined}
            onSelect={d => {
              onFilterChange({ ...filter, dateFrom: d ? toDateStr(d) : undefined })
              setDateFromOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Custom date to */}
      <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 text-xs border-border/60',
              filter.dateTo ? 'border-primary/50 text-foreground' : 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {filter.dateTo ?? 'Bis'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filter.dateTo ? new Date(filter.dateTo) : undefined}
            onSelect={d => {
              onFilterChange({ ...filter, dateTo: d ? toDateStr(d) : undefined })
              setDateToOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Asset multi-select */}
      {availableAssets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 text-xs border-border/60',
                filter.assets?.length ? 'border-primary/50 text-foreground' : 'text-muted-foreground'
              )}
            >
              Asset
              {(filter.assets?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {filter.assets!.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {availableAssets.map(a => (
              <DropdownMenuCheckboxItem
                key={a}
                checked={filter.assets?.includes(a) ?? false}
                onCheckedChange={() => toggle('assets', a, filter.assets)}
              >
                {a}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Strategy multi-select */}
      {availableStrategies.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 text-xs border-border/60',
                filter.strategies?.length ? 'border-primary/50 text-foreground' : 'text-muted-foreground'
              )}
            >
              Strategie
              {(filter.strategies?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {filter.strategies!.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {availableStrategies.map(s => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={filter.strategies?.includes(s) ?? false}
                onCheckedChange={() => toggle('strategies', s, filter.strategies)}
              >
                {s}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Setup-Typ multi-select */}
      {availableSetupTypes.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 text-xs border-border/60',
                filter.setupTypes?.length ? 'border-primary/50 text-foreground' : 'text-muted-foreground'
              )}
            >
              Setup
              {(filter.setupTypes?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {filter.setupTypes!.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {availableSetupTypes.map(s => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={filter.setupTypes?.includes(s) ?? false}
                onCheckedChange={() => toggle('setupTypes', s, filter.setupTypes)}
              >
                {s}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Reset */}
      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground gap-1"
          onClick={() => onFilterChange({})}
        >
          <X className="h-3 w-3" />
          Filter zurücksetzen
        </Button>
      )}
    </div>
  )
}
