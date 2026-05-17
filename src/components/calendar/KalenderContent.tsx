'use client'

import { useMemo } from 'react'
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useDailyWatchlist } from '@/hooks/useDailyWatchlist'
import { useAccountContext } from '@/contexts/AccountContext'
import { getCategoryColor } from '@/lib/category-colors'
import { CountdownBanner } from './CountdownBanner'
import { TradingViewCalendarWidget } from './TradingViewCalendarWidget'
import { KalenderKiSection } from './KalenderKiSection'
import { WorkflowVisitTracker } from '@/components/workflow/WorkflowVisitTracker'

const CURRENCY_TO_TV_COUNTRY: Record<string, string> = {
  USD: 'us', EUR: 'eu', GBP: 'gb', JPY: 'jp',
  CAD: 'ca', AUD: 'au', NZD: 'nz', CHF: 'ch',
  CNY: 'cn', HKD: 'hk', SGD: 'sg', NOK: 'no',
  SEK: 'se', DKK: 'dk', MXN: 'mx', BRL: 'br',
  INR: 'in', KRW: 'kr', ZAR: 'za', TRY: 'tr',
}

const INDEX_COUNTRY_MAP: Array<[string[], string]> = [
  [['US100', 'NAS100', 'US500', 'SPX', 'US30', 'DOW', 'GOLD', 'XAUUSD', 'OIL', 'USOIL'], 'us'],
  [['GER40', 'DAX', 'GER30'], 'de'],
  [['UK100', 'FTSE'], 'gb'],
  [['JPN225', 'JP225', 'NKY'], 'jp'],
  [['AUS200', 'ASX'], 'au'],
  [['FRA40', 'CAC'], 'fr'],
]

function symbolsToCountryFilter(symbols: string[]): string {
  const countries = new Set<string>(['us', 'eu'])
  for (const sym of symbols) {
    const upper = sym.toUpperCase().replace(/[-/_.]/g, '')
    // 6-char forex pairs (e.g. EURUSD, GBPJPY)
    if (upper.length === 6 && /^[A-Z]{6}$/.test(upper)) {
      const cc1 = CURRENCY_TO_TV_COUNTRY[upper.slice(0, 3)]
      const cc2 = CURRENCY_TO_TV_COUNTRY[upper.slice(3, 6)]
      if (cc1) countries.add(cc1)
      if (cc2) countries.add(cc2)
    }
    // Indices and commodities
    for (const [keys, cc] of INDEX_COUNTRY_MAP) {
      if (keys.some(k => upper.includes(k))) countries.add(cc)
    }
  }
  return [...countries].join(',')
}

export function KalenderContent() {
  const { activeAccount } = useAccountContext()
  const { events, isLoading } = useEconomicCalendar()
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

  const countryFilter = useMemo(
    () => symbolsToCountryFilter(watchlistSymbols),
    [watchlistSymbols]
  )

  const highImpactEvents = useMemo(
    () => events.filter(e => e.impact === 'High'),
    [events]
  )

  return (
    <div className="space-y-4">
      <WorkflowVisitTracker step="kalender" />
      <CountdownBanner events={events} onScrollToEvent={() => {}} />

      {watchlistSymbols.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--fg-4)' }}>
            Kalender gefiltert nach Watchlist:
          </span>
          {watchlistSymbols.map(s => (
            <span
              key={s}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: watchlistColorMap[s] ? `${watchlistColorMap[s]}22` : 'var(--bg-2)',
                color: watchlistColorMap[s] ?? 'var(--fg-2)',
                border: `1px solid ${watchlistColorMap[s] ? `${watchlistColorMap[s]}44` : 'var(--border-1)'}`,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-1)' }}
      >
        <TradingViewCalendarWidget countryFilter={countryFilter} height={700} />
      </div>

      <KalenderKiSection
        events={highImpactEvents}
        watchlistSymbols={watchlistSymbols}
        isLoading={isLoading}
      />
    </div>
  )
}
