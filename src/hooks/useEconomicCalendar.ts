'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns'
import type { EconomicEvent, CalendarFilters, WeekEventsResponse } from '@/types/calendar'

const DEFAULT_FILTERS: CalendarFilters = {
  impact: ['High', 'Medium', 'Low'],
  currencies: [],
}

function getWeekBounds(offset: number): { weekStart: string; weekEnd: string } {
  const base = addWeeks(new Date(), offset)
  const weekStart = format(startOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return { weekStart, weekEnd }
}

function getInitialWeekOffset(): number {
  // On Sundays, default to next week since the trading week starts Monday
  return new Date().getDay() === 0 ? 1 : 0
}

export function useEconomicCalendar() {
  const [weekOffset, setWeekOffset] = useState(getInitialWeekOffset)
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filtersLoading, setFiltersLoading] = useState(true)
  const refreshTriggeredRef = useRef(false)

  const { weekStart, weekEnd } = getWeekBounds(weekOffset)

  const loadFilters = useCallback(async () => {
    setFiltersLoading(true)
    try {
      const res = await fetch('/api/calendar/filters')
      if (res.ok) {
        const data = await res.json()
        setFilters(data.filters ?? DEFAULT_FILTERS)
      }
    } finally {
      setFiltersLoading(false)
    }
  }, [])

  const loadEvents = useCallback(async (ws: string, we: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/calendar/events?week_start=${ws}&week_end=${we}`)
      if (!res.ok) return
      const data: WeekEventsResponse = await res.json()
      setEvents(data.events ?? [])
      setFetchedAt(data.fetched_at)

      // Auto-refresh if: no events for this week, any event missing time_utc, or past events missing actuals
      if (!refreshTriggeredRef.current) {
        const now = new Date()
        const evts = data.events ?? []
        const needsRefresh =
          evts.length === 0 ||
          evts.some(e => e.time_utc === null) ||
          evts.some(e => e.time_utc && new Date(e.time_utc) < now && e.actual === null)
        if (needsRefresh) {
          refreshTriggeredRef.current = true
          fetch('/api/calendar/refresh').then(async r => {
            if (r.ok) {
              const res2 = await fetch(`/api/calendar/events?week_start=${ws}&week_end=${we}`)
              if (res2.ok) {
                const data2: WeekEventsResponse = await res2.json()
                setEvents(data2.events ?? [])
                setFetchedAt(data2.fetched_at)
              }
            }
          })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  useEffect(() => {
    refreshTriggeredRef.current = false
    loadEvents(weekStart, weekEnd)
  }, [loadEvents, weekStart, weekEnd])

  const updateFilters = useCallback(async (newFilters: CalendarFilters) => {
    setFilters(newFilters)
    await fetch('/api/calendar/filters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFilters),
    })
  }, [])

  const goToPrevWeek = useCallback(() => setWeekOffset(o => o - 1), [])
  const goToNextWeek = useCallback(() => setWeekOffset(o => o + 1), [])
  const goToThisWeek = useCallback(() => setWeekOffset(0), [])

  // Apply filters client-side
  const filteredEvents = events.filter(e => {
    const impactMatch = filters.impact.includes(e.impact)
    const currencyMatch = filters.currencies.length === 0 || filters.currencies.includes(e.currency)
    return impactMatch && currencyMatch
  })

  return {
    events: filteredEvents,
    allEvents: events,
    filters,
    weekOffset,
    weekStart,
    weekEnd,
    fetchedAt,
    isLoading,
    filtersLoading,
    updateFilters,
    goToPrevWeek,
    goToNextWeek,
    goToThisWeek,
    reload: () => loadEvents(weekStart, weekEnd),
  }
}
