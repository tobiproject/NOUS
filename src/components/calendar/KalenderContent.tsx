'use client'

import { useCallback } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar'
import { useWatchlist } from '@/hooks/useWatchlist'
import { CountdownBanner } from './CountdownBanner'
import { KalenderWeekNav } from './KalenderWeekNav'
import { KalenderFilterBar } from './KalenderFilterBar'
import { EconomicEventList } from './EconomicEventList'

export function KalenderContent() {
  const {
    events, filters, weekOffset, weekStart, weekEnd,
    fetchedAt, isLoading, filtersLoading,
    updateFilters, goToPrevWeek, goToNextWeek, goToThisWeek,
  } = useEconomicCalendar()

  // Load all watchlist items (no account filter — user wants all assets they trade)
  const { items: watchlistItems } = useWatchlist()
  const watchlistSymbols = watchlistItems.map(i => i.symbol)

  const handleScrollToEvent = useCallback((eventId: string) => {
    const el = document.getElementById(`event-${eventId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const fetchedAtLabel = fetchedAt
    ? `Daten vom ${format(new Date(fetchedAt), "d. MMM HH:mm 'Uhr'", { locale: de })}`
    : null

  return (
    <div className="space-y-4">
      <CountdownBanner events={events} onScrollToEvent={handleScrollToEvent} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <KalenderWeekNav
          weekStart={weekStart} weekEnd={weekEnd} weekOffset={weekOffset}
          onPrev={goToPrevWeek} onNext={goToNextWeek} onToday={goToThisWeek}
        />
        {fetchedAtLabel && (
          <span className="text-xs hidden sm:block" style={{ color: 'var(--fg-4)' }}>
            {fetchedAtLabel}
          </span>
        )}
      </div>

      {!filtersLoading && (
        <KalenderFilterBar filters={filters} onChange={updateFilters} />
      )}

      <EconomicEventList
        events={events}
        weekStart={weekStart}
        weekEnd={weekEnd}
        isLoading={isLoading}
        userTimezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
        allImpactFiltersOff={filters.impact.length === 0}
        watchlistSymbols={watchlistSymbols}
      />

      {fetchedAtLabel && (
        <p className="text-xs sm:hidden text-center" style={{ color: 'var(--fg-4)' }}>
          {fetchedAtLabel}
        </p>
      )}
    </div>
  )
}
