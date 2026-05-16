'use client'

import { useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { RefreshCw } from 'lucide-react'
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useDailyWatchlist } from '@/hooks/useDailyWatchlist'
import { useAccountContext } from '@/contexts/AccountContext'
import { getCategoryColor } from '@/lib/category-colors'
import { CountdownBanner } from './CountdownBanner'
import { KalenderWeekNav } from './KalenderWeekNav'
import { KalenderFilterBar } from './KalenderFilterBar'
import { EconomicEventList } from './EconomicEventList'
import { WorkflowVisitTracker } from '@/components/workflow/WorkflowVisitTracker'

export function KalenderContent() {
  const { activeAccount } = useAccountContext()
  const {
    events, filters, weekOffset, weekStart, weekEnd,
    fetchedAt, isLoading, isRefreshing, filtersLoading,
    updateFilters, goToPrevWeek, goToNextWeek, goToThisWeek, manualRefresh,
  } = useEconomicCalendar()

  const { items: watchlistItems } = useWatchlist(activeAccount?.id)
  const { todaySymbols } = useDailyWatchlist(activeAccount?.id)

  // Prefer today's watchlist; fall back to general watchlist if today is empty
  const watchlistSymbols = todaySymbols.length > 0
    ? todaySymbols
    : watchlistItems.map(i => i.symbol)

  // Symbol → Farbe aus der Watchlist (eigene Farbe des Users oder Kategorie-Farbe)
  const watchlistColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    watchlistItems.forEach(item => {
      map[item.symbol] = item.color ?? getCategoryColor(item.category)
    })
    return map
  }, [watchlistItems])

  const handleScrollToEvent = useCallback((eventId: string) => {
    const el = document.getElementById(`event-${eventId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const fetchedAtLabel = fetchedAt
    ? `Daten vom ${format(new Date(fetchedAt), "d. MMM HH:mm 'Uhr'", { locale: de })}`
    : null

  return (
    <div className="space-y-4">
      <WorkflowVisitTracker step="kalender" />
      <CountdownBanner events={events} onScrollToEvent={handleScrollToEvent} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <KalenderWeekNav
          weekStart={weekStart} weekEnd={weekEnd} weekOffset={weekOffset}
          onPrev={goToPrevWeek} onNext={goToNextWeek} onToday={goToThisWeek}
        />
        <div className="hidden sm:flex items-center gap-2">
          {fetchedAtLabel && (
            <span className="text-xs" style={{ color: 'var(--fg-4)' }}>
              {fetchedAtLabel}
            </span>
          )}
          <button
            onClick={manualRefresh}
            disabled={isRefreshing}
            title="Daten aktualisieren"
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--fg-4)' }}
          >
            <RefreshCw
              className={isRefreshing ? 'animate-spin' : ''}
              style={{ width: 13, height: 13 }}
            />
          </button>
        </div>
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
        watchlistColorMap={watchlistColorMap}
      />

      {fetchedAtLabel && (
        <p className="text-xs sm:hidden text-center" style={{ color: 'var(--fg-4)' }}>
          {fetchedAtLabel}
        </p>
      )}
    </div>
  )
}
