'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { format, parseISO, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  weekStart: string
  weekEnd: string
  weekOffset: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function KalenderWeekNav({ weekStart, weekEnd, weekOffset, onPrev, onNext, onToday }: Props) {
  const startDate = parseISO(weekStart)
  const endDate = parseISO(weekEnd)
  const kw = getISOWeek(startDate)

  const rangeLabel = `${format(startDate, 'd. MMM', { locale: de })} – ${format(endDate, 'd. MMM', { locale: de })}`

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onPrev}
        aria-label="Vorherige Woche"
      >
        <ChevronLeft size={15} />
      </Button>

      <div className="flex items-center gap-2 min-w-[160px] justify-center">
        <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--fg-3)' }}>
          KW {kw}
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
          {rangeLabel}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onNext}
        aria-label="Nächste Woche"
      >
        <ChevronRight size={15} />
      </Button>

      {weekOffset !== 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={onToday}
        >
          <Home size={11} />
          Heute
        </Button>
      )}
    </div>
  )
}
