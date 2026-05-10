'use client'

import { useEffect, useRef } from 'react'
import { format, parseISO, isToday, isWeekend, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { EconomicEvent } from '@/types/calendar'
import { EconomicEventRow } from './EconomicEventRow'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  events: EconomicEvent[]
  weekStart: string
  weekEnd: string
  isLoading: boolean
  userTimezone?: string
  allImpactFiltersOff?: boolean
}

function groupByDate(events: EconomicEvent[]): Record<string, EconomicEvent[]> {
  return events.reduce<Record<string, EconomicEvent[]>>((acc, e) => {
    ;(acc[e.date] ??= []).push(e)
    return acc
  }, {})
}

function getDatesInWeek(weekStart: string, weekEnd: string): string[] {
  const dates: string[] = []
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(format(new Date(d), 'yyyy-MM-dd'))
  }
  return dates
}

function CurrentTimeRule() {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')

  return (
    <div className="flex items-center gap-2 my-1">
      <span
        className="text-xs tabular-nums shrink-0"
        style={{ color: 'var(--short)', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}
      >
        {hours}:{minutes}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--short)' }} />
    </div>
  )
}

export function EconomicEventList({ events, weekStart, weekEnd, isLoading, userTimezone, allImpactFiltersOff }: Props) {
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isLoading, weekStart])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const grouped = groupByDate(events)
  const dates = getDatesInWeek(weekStart, weekEnd)
  const now = new Date()

  const hasAnyEvents = events.length > 0

  if (!hasAnyEvents) {
    return (
      <div
        className="rounded-lg p-8 text-center"
        style={{ border: '1px solid var(--border-raw)', background: 'var(--bg-2)' }}
      >
        {allImpactFiltersOff ? (
          <>
            <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
              Alle Impact-Filter deaktiviert.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-4)' }}>
              Mindestens einen Filter (High / Med / Low) aktivieren.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
              Keine Events für diese Woche und die gesetzten Filter.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-4)' }}>
              Filter anpassen oder andere Woche wählen.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {dates.map(dateStr => {
        const dateEvents = grouped[dateStr] ?? []
        const date = parseISO(dateStr)
        const isWeekendDay = isWeekend(date)
        const isTodayDate = isToday(date)

        if (isWeekendDay && dateEvents.length === 0) return null

        const dayLabel = format(date, 'EEEE, d. MMMM', { locale: de })

        // Find where current time falls in today's events for the red line
        let currentTimeInserted = false

        return (
          <div
            key={dateStr}
            ref={isTodayDate ? todayRef : undefined}
            className={cn(isWeekendDay && 'opacity-60')}
          >
            {/* Day header */}
            <div className="flex items-center gap-2 mb-2">
              <h3
                className={cn('text-xs font-semibold uppercase tracking-wider')}
                style={{ color: isTodayDate ? 'var(--brand-blue)' : 'var(--fg-3)' }}
              >
                {dayLabel}
              </h3>
              {isTodayDate && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: 'var(--brand-blue-soft)',
                    color: 'var(--brand-blue)',
                    fontSize: '10px',
                  }}
                >
                  Heute
                </span>
              )}
            </div>

            {/* Events */}
            <div className="space-y-1">
              {dateEvents.length === 0 ? (
                <p className="text-xs py-1 px-2" style={{ color: 'var(--fg-4)' }}>
                  Keine Events
                </p>
              ) : (
                dateEvents.map((event, idx) => {
                  const isPast = event.time_utc ? new Date(event.time_utc) < now : false

                  // Insert current time rule between past and future events on today
                  let showTimeLine = false
                  if (isTodayDate && !currentTimeInserted) {
                    const nextEvent = dateEvents[idx]
                    if (nextEvent?.time_utc && new Date(nextEvent.time_utc) > now) {
                      showTimeLine = true
                      currentTimeInserted = true
                    }
                  }

                  return (
                    <div key={event.id}>
                      {showTimeLine && <CurrentTimeRule />}
                      <EconomicEventRow
                        event={event}
                        isPast={isPast}
                        userTimezone={userTimezone}
                      />
                    </div>
                  )
                })
              )}
              {/* Time rule at end of today's list if all events are in the past */}
              {isTodayDate && !currentTimeInserted && dateEvents.length > 0 && (
                <CurrentTimeRule />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
