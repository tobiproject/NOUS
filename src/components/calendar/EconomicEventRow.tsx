'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { EconomicEvent } from '@/types/calendar'
import { ImpactDot } from './ImpactDot'
import { CountryFlag } from './CountryFlag'
import { ActualValue } from './ActualValue'
import { EconomicEventDetail } from './EconomicEventDetail'
import { getWatchlistMatches } from '@/lib/calendar-asset-mapping'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  event: EconomicEvent
  isPast: boolean
  userTimezone?: string
  watchlistSymbols?: string[]
  watchlistColorMap?: Record<string, string>
}

function formatEventTime(timeUtc: string | null, userTimezone?: string): string {
  if (!timeUtc) return 'ganzt.'
  try {
    const date = new Date(timeUtc)
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(date)
  } catch {
    return format(parseISO(timeUtc), 'HH:mm', { locale: de })
  }
}

export function EconomicEventRow({ event, isPast, userTimezone, watchlistSymbols = [], watchlistColorMap = {} }: Props) {
  const [expanded, setExpanded] = useState(false)
  const toggle = useCallback(() => setExpanded(v => !v), [])

  const timeLabel = formatEventTime(event.time_utc, userTimezone)
  const matchedSymbols = watchlistSymbols.length > 0
    ? getWatchlistMatches(event.title, event.currency, watchlistSymbols)
    : []
  const isRelevant = matchedSymbols.length > 0
  // Hauptfarbe des ersten gematchten Symbols (für Event-Highlight)
  const accentColor = isRelevant ? (watchlistColorMap[matchedSymbols[0]] ?? '#ff8210') : null

  return (
    <div
      id={`event-${event.id}`}
      className={cn('rounded-md overflow-hidden transition-opacity', isPast && 'opacity-50')}
      style={{
        border: isRelevant ? `1px solid ${accentColor}55` : '1px solid var(--border-raw)',
        background: isRelevant ? `${accentColor}0d` : 'var(--bg-2)',
        borderLeft: isRelevant ? `3px solid ${accentColor}` : '1px solid var(--border-raw)',
      }}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isRelevant ? `${accentColor}1a` : 'var(--bg-3)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        onClick={toggle}
        aria-expanded={expanded}
      >
        <ImpactDot impact={event.impact} className="mt-px" />

        <span
          className="text-xs tabular-nums w-10 shrink-0"
          style={{ color: 'var(--fg-3)', fontFamily: 'JetBrains Mono, monospace' }}
        >
          {timeLabel}
        </span>

        <CountryFlag countryCode={event.country_code} currency={event.currency} />

        <span className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium truncate" style={{ color: isRelevant ? 'var(--fg-1)' : 'var(--fg-2)' }}>
            {event.title}
          </span>

          {event.trade_indicator && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0">
                    <BarChart2 size={11} style={{ color: 'var(--brand-blue)' }} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {event.trade_indicator.asset}{' '}
                  {event.trade_indicator.direction === 'long' ? 'Long' : 'Short'}
                  {event.trade_indicator.rr_ratio !== null && (
                    <>, {event.trade_indicator.rr_ratio > 0 ? '+' : ''}{event.trade_indicator.rr_ratio.toFixed(1)}R</>
                  )}
                  &nbsp;·&nbsp;{format(parseISO(event.trade_indicator.entry_time), 'HH:mm')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {matchedSymbols.slice(0, 3).map(sym => {
            const c = watchlistColorMap[sym] ?? '#ff8210'
            return (
              <span
                key={sym}
                className="inline-flex px-1.5 py-px rounded text-[10px] font-bold shrink-0"
                style={{
                  background: `${c}22`,
                  color: c,
                  border: `1px solid ${c}55`,
                  letterSpacing: '0.03em',
                }}
              >
                {sym}
              </span>
            )
          })}
          {matchedSymbols.length > 3 && (
            <span className="text-[10px] font-semibold" style={{ color: accentColor ?? '#ff8210' }}>
              +{matchedSymbols.length - 3}
            </span>
          )}
        </span>

        <span className="hidden sm:flex items-center gap-4 shrink-0">
          <span className="text-xs tabular-nums w-14 text-right" style={{ color: 'var(--fg-4)' }}>
            {event.previous ?? '—'}
          </span>
          <span className="text-xs tabular-nums w-14 text-right" style={{ color: 'var(--fg-3)' }}>
            {event.forecast ?? '—'}
          </span>
          <span className="w-14 text-right">
            <ActualValue actual={event.actual} forecast={event.forecast} />
          </span>
        </span>

        <ChevronDown
          size={13}
          className={cn('shrink-0 transition-transform', expanded && 'rotate-180')}
          style={{ color: 'var(--fg-4)' }}
        />
      </button>

      {expanded && (
        <EconomicEventDetail
          event={event}
          watchlistSymbols={watchlistSymbols}
          matchedSymbols={matchedSymbols}
          watchlistColorMap={watchlistColorMap}
        />
      )}
    </div>
  )
}
