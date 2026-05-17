'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { EconomicEvent } from '@/types/calendar'
import { CountryFlag } from './CountryFlag'

type AnalysisState = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

function EventCard({ event, watchlistSymbols }: { event: EconomicEvent; watchlistSymbols: string[] }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<AnalysisState>('idle')
  const [open, setOpen] = useState(false)

  const handleAnalyze = async () => {
    if (state !== 'idle') { setOpen(o => !o); return }
    setState('loading')
    setText('')
    setOpen(true)
    try {
      const res = await fetch('/api/ai/calendar-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: event.title,
          country: event.currency,
          impactLevel: event.impact,
          actual: event.actual ?? null,
          forecast: event.forecast ?? null,
          previous: event.previous ?? null,
          watchlistSymbols,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setText(err.error?.includes('API-Key')
          ? 'Kein KI API-Key hinterlegt. Bitte unter Einstellungen → KI-Provider eintragen.'
          : (err.error ?? 'Fehler bei der Analyse.'))
        setState('error')
        return
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let first = true
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setText(accumulated)
        if (first) { setState('streaming'); first = false }
      }
      setState('done')
    } catch {
      setText('Verbindungsfehler. Bitte erneut versuchen.')
      setState('error')
    }
  }

  const timeStr = event.time_utc
    ? format(new Date(event.time_utc), 'HH:mm', { locale: de }) + ' UTC'
    : 'TBD'

  return (
    <div
      className="rounded-lg p-3"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CountryFlag countryCode={event.country_code} currency={event.currency} />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-1)' }}>
              {event.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--fg-4)' }}>{timeStr}</span>
              {event.actual && (
                <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>
                  A: {event.actual}
                </span>
              )}
              {event.forecast && (
                <span className="text-xs" style={{ color: 'var(--fg-4)' }}>
                  P: {event.forecast}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={state === 'loading'}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium shrink-0 transition-opacity disabled:opacity-60"
          style={{
            background: 'rgba(41,98,255,0.10)',
            border: '1px solid rgba(41,98,255,0.25)',
            color: 'var(--brand-blue)',
          }}
        >
          {state === 'loading' ? (
            <Loader2 size={11} className="animate-spin" />
          ) : state === 'idle' ? (
            <Sparkles size={11} />
          ) : open ? (
            <ChevronUp size={11} />
          ) : (
            <ChevronDown size={11} />
          )}
          {state === 'idle' ? 'Watchlist-Impact' : state === 'loading' ? 'Analysiere…' : 'Analyse'}
        </button>
      </div>

      {open && text && (
        <div
          className="mt-3 pt-3 text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--fg-2)', borderTop: '1px solid var(--border-1)' }}
        >
          {text}
          {state === 'streaming' && <span className="animate-pulse ml-0.5">▋</span>}
        </div>
      )}
    </div>
  )
}

interface Props {
  events: EconomicEvent[]
  watchlistSymbols: string[]
  isLoading: boolean
}

export function KalenderKiSection({ events, watchlistSymbols, isLoading }: Props) {
  if (isLoading || events.length === 0) return null

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Sparkles size={14} style={{ color: 'var(--brand-blue)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
          High-Impact Events — KI-Analyse
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: 'rgba(239,68,68,0.12)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          {events.length}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
        Klicke auf "Watchlist-Impact" für eine personalisierte KI-Analyse.
      </p>
      <div className="space-y-2">
        {events.map(event => (
          <EventCard key={event.id} event={event} watchlistSymbols={watchlistSymbols} />
        ))}
      </div>
    </div>
  )
}
