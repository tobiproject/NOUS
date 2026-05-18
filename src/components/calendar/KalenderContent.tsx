'use client'

import { useMemo, useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useDailyWatchlist } from '@/hooks/useDailyWatchlist'
import { useAccountContext } from '@/contexts/AccountContext'
import { getCategoryColor } from '@/lib/category-colors'
import { cn } from '@/lib/utils'
import { CountdownBanner } from './CountdownBanner'
import { EconomicEventList } from './EconomicEventList'
import { KalenderFilterBar } from './KalenderFilterBar'
import { KalenderWeekNav } from './KalenderWeekNav'
import { KalenderKiSection } from './KalenderKiSection'
import { WorkflowVisitTracker } from '@/components/workflow/WorkflowVisitTracker'

const LS_KEY = 'nous-kalender-watchlist-only'

function extractCurrencies(symbols: string[]): string[] {
  const currencies = new Set<string>()
  for (const sym of symbols) {
    const upper = sym.toUpperCase().replace(/[-/_.]/g, '')
    if (/^[A-Z]{6}$/.test(upper)) {
      currencies.add(upper.slice(0, 3))
      currencies.add(upper.slice(3, 6))
    }
    if (['US100', 'NAS100', 'US500', 'SPX', 'US30', 'DOW', 'XAUUSD', 'XAGUSD', 'USOIL', 'CL'].some(k => upper.includes(k))) currencies.add('USD')
    if (['GER40', 'DAX', 'GER30', 'FRA40', 'CAC'].some(k => upper.includes(k))) currencies.add('EUR')
    if (['UK100', 'FTSE'].some(k => upper.includes(k))) currencies.add('GBP')
    if (['JPN225', 'NKY', 'JP225'].some(k => upper.includes(k))) currencies.add('JPY')
    if (['AUS200', 'ASX'].some(k => upper.includes(k))) currencies.add('AUD')
  }
  return [...currencies]
}

export function KalenderContent() {
  const { activeAccount } = useAccountContext()
  const {
    events, allEvents, filters, weekOffset,
    weekStart, weekEnd, fetchedAt,
    isLoading, isRefreshing, filtersLoading,
    updateFilters, goToPrevWeek, goToNextWeek, goToThisWeek, manualRefresh,
  } = useEconomicCalendar()

  const { items: watchlistItems } = useWatchlist(activeAccount?.id)
  const { todaySymbols } = useDailyWatchlist(activeAccount?.id)

  const watchlistSymbols = todaySymbols.length > 0
    ? todaySymbols
    : watchlistItems.map(i => i.symbol)

  const watchlistColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    watchlistItems.forEach(item => {
      map[item.symbol] = item.color ?? getCategoryColor(item.category)
    })
    return map
  }, [watchlistItems])

  const watchlistCurrencies = useMemo(
    () => extractCurrencies(watchlistSymbols),
    [watchlistSymbols]
  )

  // Watchlist-only toggle — persisted in localStorage
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  useEffect(() => {
    try { setWatchlistOnly(localStorage.getItem(LS_KEY) === '1') } catch { /* */ }
  }, [])
  const toggleWatchlistOnly = () => {
    const next = !watchlistOnly
    setWatchlistOnly(next)
    try { localStorage.setItem(LS_KEY, next ? '1' : '0') } catch { /* */ }
  }

  // Apply watchlist-only filter on top of regular filters
  const displayEvents = useMemo(() => {
    if (!watchlistOnly || watchlistCurrencies.length === 0) return events
    return events.filter(e => watchlistCurrencies.includes(e.currency))
  }, [events, watchlistOnly, watchlistCurrencies])

  const highImpactEvents = useMemo(
    () => allEvents.filter(e => e.impact === 'High'),
    [allEvents]
  )

  const allImpactFiltersOff = filters.impact.length === 0

  const fetchedLabel = useMemo(() => {
    if (!fetchedAt) return null
    const d = new Date(fetchedAt)
    return `Zuletzt aktualisiert: ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  }, [fetchedAt])

  return (
    <div className="space-y-4">
      <WorkflowVisitTracker step="kalender" />
      <CountdownBanner events={allEvents} onScrollToEvent={() => {}} />

      {/* Top bar: week nav + refresh */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <KalenderWeekNav
          weekStart={weekStart}
          weekEnd={weekEnd}
          weekOffset={weekOffset}
          onPrev={goToPrevWeek}
          onNext={goToNextWeek}
          onToday={goToThisWeek}
        />
        <div className="flex items-center gap-2">
          {fetchedLabel && (
            <span className="text-[10px] hidden sm:block" style={{ color: 'var(--fg-4)' }}>
              {fetchedLabel}
            </span>
          )}
          <button
            onClick={manualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-opacity disabled:opacity-40"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-3)' }}
            aria-label="Aktualisieren"
          >
            <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Aktualisieren</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {!filtersLoading && (
        <div className="flex items-center gap-3 flex-wrap">
          <KalenderFilterBar filters={filters} onChange={updateFilters} />

          {/* Watchlist-only toggle */}
          {watchlistSymbols.length > 0 && (
            <>
              <div className="w-px h-4 shrink-0" style={{ background: 'var(--border-raw)' }} />
              <button
                onClick={toggleWatchlistOnly}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all shrink-0',
                  watchlistOnly ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                )}
                style={{
                  background: watchlistOnly ? 'rgba(255,130,16,0.12)' : 'var(--bg-2)',
                  border: `1px solid ${watchlistOnly ? 'rgba(255,130,16,0.4)' : 'var(--border-raw)'}`,
                  color: watchlistOnly ? '#ff8210' : 'var(--fg-3)',
                }}
              >
                <span style={{ fontSize: 10 }}>◆</span>
                Nur meine Watchlist
              </button>
            </>
          )}
        </div>
      )}

      {/* Active watchlist symbols */}
      {watchlistOnly && watchlistSymbols.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>Gefiltert nach:</span>
          {watchlistSymbols.map(s => (
            <span
              key={s}
              className="text-[10px] px-1.5 py-px rounded-full font-medium"
              style={{
                background: watchlistColorMap[s] ? `${watchlistColorMap[s]}22` : 'var(--bg-2)',
                color: watchlistColorMap[s] ?? 'var(--fg-2)',
                border: `1px solid ${watchlistColorMap[s] ? `${watchlistColorMap[s]}44` : 'var(--border-1)'}`,
              }}
            >
              {s}
            </span>
          ))}
          {watchlistCurrencies.length > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
              → {watchlistCurrencies.join(', ')} Events
            </span>
          )}
        </div>
      )}

      {/* Calendar */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}
      >
        <EconomicEventList
          events={displayEvents}
          weekStart={weekStart}
          weekEnd={weekEnd}
          isLoading={isLoading}
          allImpactFiltersOff={allImpactFiltersOff}
          watchlistSymbols={watchlistSymbols}
          watchlistColorMap={watchlistColorMap}
        />
      </div>

      <KalenderKiSection
        events={highImpactEvents}
        watchlistSymbols={watchlistSymbols}
        isLoading={isLoading}
      />
    </div>
  )
}
