'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { SlidersHorizontal, RefreshCw } from 'lucide-react'
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useDailyWatchlist } from '@/hooks/useDailyWatchlist'
import { useAccountContext } from '@/contexts/AccountContext'
import { getCategoryColor } from '@/lib/category-colors'
import { cn } from '@/lib/utils'
import { CountdownBanner } from './CountdownBanner'
import { EconomicEventList } from './EconomicEventList'
import { KalenderWeekNav } from './KalenderWeekNav'
import { ImpactDot } from './ImpactDot'
import { WorkflowVisitTracker } from '@/components/workflow/WorkflowVisitTracker'
import type { ImpactLevel } from '@/types/calendar'
import { format, startOfWeek, differenceInCalendarWeeks, subDays, parseISO } from 'date-fns'

type NavMode = 'yesterday' | 'today' | 'thisweek' | 'nextweek' | 'custom'

const NAV_TABS: { id: NavMode; label: string }[] = [
  { id: 'yesterday', label: 'Gestern' },
  { id: 'today',     label: 'Heute' },
  { id: 'thisweek',  label: 'Diese Woche' },
  { id: 'nextweek',  label: 'Nächste Woche' },
  { id: 'custom',    label: 'Benutzerdefiniert' },
]

const REGIONS = [
  { id: 'us', flag: '🇺🇸', label: 'USA',        currencies: ['USD'] },
  { id: 'eu', flag: '🇪🇺', label: 'Europa',      currencies: ['EUR', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK'] },
  { id: 'jp', flag: '🇯🇵', label: 'Japan',       currencies: ['JPY'] },
  { id: 'ap', flag: '🌏',  label: 'Asien/Paz',   currencies: ['AUD', 'NZD', 'CNY', 'HKD', 'SGD', 'KRW'] },
  { id: 'am', flag: '🌎',  label: 'Americas',    currencies: ['CAD', 'MXN', 'BRL'] },
]

const IMPACT_LEVELS: ImpactLevel[] = ['High', 'Medium', 'Low']
const IMPACT_LABELS: Record<ImpactLevel, string> = { High: 'High', Medium: 'Med', Low: 'Low' }

const LS_OPEN     = 'nous-cal-filter-open'
const LS_IMPACT   = 'nous-cal-impact'
const LS_REGIONS  = 'nous-cal-regions'
const LS_WATCHLIST = 'nous-cal-watchlist-only'

function loadLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v !== null ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
function saveLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* */ }
}

function extractCurrencies(symbols: string[]): string[] {
  const c = new Set<string>()
  for (const sym of symbols) {
    const u = sym.toUpperCase().replace(/[-/_.]/g, '')
    if (/^[A-Z]{6}$/.test(u)) { c.add(u.slice(0, 3)); c.add(u.slice(3, 6)) }
    if (['US100','NAS100','US500','SPX','US30','DOW','XAUUSD','XAGUSD','USOIL','CL'].some(k => u.includes(k))) c.add('USD')
    if (['GER40','DAX','GER30','FRA40','CAC'].some(k => u.includes(k))) c.add('EUR')
    if (['UK100','FTSE'].some(k => u.includes(k))) c.add('GBP')
    if (['JPN225','NKY','JP225'].some(k => u.includes(k))) c.add('JPY')
    if (['AUS200','ASX'].some(k => u.includes(k))) c.add('AUD')
  }
  return [...c]
}

export function KalenderContent() {
  const { activeAccount } = useAccountContext()
  const {
    allEvents, weekOffset, weekStart, weekEnd,
    isLoading, isRefreshing,
    goToPrevWeek, goToNextWeek, goToThisWeek, manualRefresh,
  } = useEconomicCalendar()

  // ── Nav tabs ───────────────────────────────────────────────────────────────
  const [navMode, setNavMode] = useState<NavMode>('thisweek')
  const [customDate, setCustomDate] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const update = () => setCurrentTime(new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date()))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [])

  const handleNavTab = useCallback((mode: NavMode) => {
    setNavMode(mode)
    if (mode === 'today' || mode === 'thisweek') { goToThisWeek() }
    else if (mode === 'nextweek') { goToNextWeek() }
    else if (mode === 'yesterday') {
      const yesterday = subDays(new Date(), 1)
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
      const prevWeekStart = startOfWeek(yesterday, { weekStartsOn: 1 })
      const diff = differenceInCalendarWeeks(prevWeekStart, thisWeekStart, { weekStartsOn: 1 })
      goToThisWeek() // always reset to 0 first
      if (diff < 0) goToPrevWeek() // then go back 1 if yesterday is in the previous week
    }
  }, [goToThisWeek, goToNextWeek, goToPrevWeek])

  useEffect(() => {
    if (navMode === 'custom' && customDate) {
      const d = parseISO(customDate)
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
      const targetWeekStart = startOfWeek(d, { weekStartsOn: 1 })
      const diff = differenceInCalendarWeeks(targetWeekStart, thisWeekStart, { weekStartsOn: 1 })
      if (diff === 0) goToThisWeek()
      else if (diff === 1) goToNextWeek()
      else if (diff === -1) goToPrevWeek()
      else {
        // For offsets > 1 away, repeatedly go forward/back — for simplicity just use goToThisWeek as fallback
        // The hook doesn't expose setWeekOffset directly, so we settle for current week on large offsets
        goToThisWeek()
      }
    }
  }, [customDate, navMode, goToThisWeek, goToNextWeek, goToPrevWeek])

  const { items: watchlistItems } = useWatchlist(activeAccount?.id)
  const { todaySymbols } = useDailyWatchlist(activeAccount?.id)

  const watchlistSymbols = todaySymbols.length > 0
    ? todaySymbols
    : watchlistItems.map(i => i.symbol)

  const watchlistColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    watchlistItems.forEach(item => { map[item.symbol] = item.color ?? getCategoryColor(item.category) })
    return map
  }, [watchlistItems])

  const watchlistCurrencies = useMemo(() => extractCurrencies(watchlistSymbols), [watchlistSymbols])

  // ── Filter state (localStorage) ────────────────────────────────────────────
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [selectedImpact, setSelectedImpact] = useState<ImpactLevel[]>(['High', 'Medium', 'Low'])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [watchlistOnly,  setWatchlistOnly]  = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setFilterOpen(loadLS(LS_OPEN, false))
    setSelectedImpact(loadLS(LS_IMPACT, ['High', 'Medium', 'Low']))
    setSelectedRegions(loadLS(LS_REGIONS, []))
    setWatchlistOnly(loadLS(LS_WATCHLIST, false))
    setHydrated(true)
  }, [])

  const toggleFilterPanel = () => { const v = !filterOpen; setFilterOpen(v); saveLS(LS_OPEN, v) }

  const toggleImpact = (level: ImpactLevel) => {
    const next = selectedImpact.includes(level)
      ? selectedImpact.filter(l => l !== level)
      : [...selectedImpact, level]
    setSelectedImpact(next); saveLS(LS_IMPACT, next)
  }

  const toggleRegion = (id: string) => {
    const next = selectedRegions.includes(id)
      ? selectedRegions.filter(r => r !== id)
      : [...selectedRegions, id]
    setSelectedRegions(next); saveLS(LS_REGIONS, next)
  }

  const toggleWatchlist = () => { const v = !watchlistOnly; setWatchlistOnly(v); saveLS(LS_WATCHLIST, v) }

  // ── Derived currencies from selected regions ───────────────────────────────
  const regionCurrencies = useMemo(() => {
    if (selectedRegions.length === 0) return null
    return REGIONS.filter(r => selectedRegions.includes(r.id)).flatMap(r => r.currencies)
  }, [selectedRegions])

  // ── Apply all filters client-side ──────────────────────────────────────────
  const displayEvents = useMemo(() => {
    if (!hydrated) return allEvents
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    return allEvents.filter(e => {
      if (!selectedImpact.includes(e.impact)) return false
      if (regionCurrencies && !regionCurrencies.includes(e.currency)) return false
      if (watchlistOnly && watchlistCurrencies.length > 0 && !watchlistCurrencies.includes(e.currency)) return false
      if (navMode === 'today' && e.date !== todayStr) return false
      if (navMode === 'yesterday' && e.date !== yesterdayStr) return false
      if (navMode === 'custom' && customDate && e.date !== format(parseISO(customDate), 'yyyy-MM-dd')) return false
      return true
    })
  }, [allEvents, hydrated, selectedImpact, regionCurrencies, watchlistOnly, watchlistCurrencies, navMode, customDate])

  const activeFilterCount = (selectedImpact.length < 3 ? 1 : 0) + (selectedRegions.length > 0 ? 1 : 0) + (watchlistOnly ? 1 : 0)
  const filterActive = filterOpen || activeFilterCount > 0

  return (
    <div className="space-y-3">
      <WorkflowVisitTracker step="kalender" />
      <CountdownBanner events={allEvents} onScrollToEvent={() => {}} />

      {/* ── Navigation tabs ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 flex-wrap">
          {NAV_TABS.map(tab => {
            const active = navMode === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleNavTab(tab.id)}
                className={cn('h-7 px-3 rounded text-xs font-medium transition-all whitespace-nowrap', !active && 'opacity-60 hover:opacity-90')}
                style={{
                  background: active ? 'rgba(255,130,16,0.15)' : 'var(--bg-2)',
                  border: `1px solid ${active ? 'rgba(255,130,16,0.5)' : 'var(--border-raw)'}`,
                  color: active ? '#ff8210' : 'var(--fg-3)',
                }}
              >
                {tab.label}
              </button>
            )
          })}
          {navMode === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="h-7 px-2 rounded text-xs"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-2)' }}
            />
          )}
        </div>
        {currentTime && (
          <p className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
            {currentTime} Ortszeit
          </p>
        )}
      </div>

      {/* ── Top bar (week nav + actions) ── */}
      <div className="flex items-center justify-between gap-2">
        {(navMode === 'thisweek' || navMode === 'nextweek') ? (
          <KalenderWeekNav
            weekStart={weekStart}
            weekEnd={weekEnd}
            weekOffset={weekOffset}
            onPrev={goToPrevWeek}
            onNext={goToNextWeek}
            onToday={goToThisWeek}
          />
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={manualRefresh}
            disabled={isRefreshing}
            className="w-7 h-7 flex items-center justify-center rounded transition-opacity disabled:opacity-40"
            style={{ color: 'var(--fg-4)', background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
            aria-label="Aktualisieren"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={toggleFilterPanel}
            className="relative flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium transition-all"
            style={{
              background: filterActive ? 'rgba(255,130,16,0.12)' : 'var(--bg-2)',
              border: `1px solid ${filterActive ? 'rgba(255,130,16,0.4)' : 'var(--border-raw)'}`,
              color: filterActive ? '#ff8210' : 'var(--fg-3)',
            }}
            aria-label="Filter"
          >
            <SlidersHorizontal size={12} />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span
                className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ml-0.5"
                style={{ background: '#ff8210', color: '#000' }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Collapsible filter panel ── */}
      {filterOpen && (
        <div
          className="rounded-lg p-3 space-y-2.5"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}
        >
          {/* Impact */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider w-16 shrink-0" style={{ color: 'var(--fg-4)' }}>
              Impact
            </span>
            <div className="flex items-center gap-1">
              {IMPACT_LEVELS.map(level => {
                const active = selectedImpact.includes(level)
                return (
                  <button
                    key={level}
                    onClick={() => toggleImpact(level)}
                    className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all', !active && 'opacity-35')}
                    style={{
                      background: active ? 'var(--bg-3)' : 'transparent',
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
          </div>

          {/* Regions */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider w-16 shrink-0" style={{ color: 'var(--fg-4)' }}>
              Region
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {REGIONS.map(r => {
                const active = selectedRegions.includes(r.id)
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRegion(r.id)}
                    className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all', !active && 'opacity-40 hover:opacity-70')}
                    style={{
                      background: active ? 'rgba(255,130,16,0.12)' : 'var(--bg-3)',
                      border: `1px solid ${active ? 'rgba(255,130,16,0.4)' : 'var(--border-raw)'}`,
                      color: active ? '#ff8210' : 'var(--fg-3)',
                    }}
                  >
                    <span>{r.flag}</span>
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Watchlist */}
          {watchlistSymbols.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider w-16 shrink-0" style={{ color: 'var(--fg-4)' }}>
                Watchlist
              </span>
              <button
                onClick={toggleWatchlist}
                className={cn('flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all', !watchlistOnly && 'opacity-40 hover:opacity-70')}
                style={{
                  background: watchlistOnly ? 'rgba(255,130,16,0.12)' : 'var(--bg-3)',
                  border: `1px solid ${watchlistOnly ? 'rgba(255,130,16,0.4)' : 'var(--border-raw)'}`,
                  color: watchlistOnly ? '#ff8210' : 'var(--fg-3)',
                }}
              >
                <span style={{ fontSize: 9 }}>◆</span>
                Nur meine Watchlist
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Calendar ── */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}
      >
        <EconomicEventList
          events={displayEvents}
          weekStart={weekStart}
          weekEnd={weekEnd}
          isLoading={isLoading}
          allImpactFiltersOff={selectedImpact.length === 0}
          watchlistSymbols={watchlistSymbols}
          watchlistColorMap={watchlistColorMap}
        />
      </div>
    </div>
  )
}
