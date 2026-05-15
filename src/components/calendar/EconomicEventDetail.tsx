'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, TrendingUp, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import type { EconomicEvent } from '@/types/calendar'
import type { TradeHistoryEntry, TradeStats } from '@/app/api/calendar/event-trade-history/route'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ActualValue } from './ActualValue'

const EVENT_DESCRIPTIONS: Record<string, string> = {
  'Non-Farm Payrolls': 'Misst die Anzahl neuer Stellen außerhalb der Landwirtschaft in den USA. Einer der wichtigsten Indikatoren für die Gesundheit des US-Arbeitsmarkts.',
  'CPI m/m': 'Consumer Price Index (monatlich) — misst die Veränderung des Preisniveaus eines Warenkorbs. Kernindikator für Inflation.',
  'Core CPI m/m': 'CPI ohne volatile Energie- und Lebensmittelpreise. Maßgeblich für Fed-Zinsentscheidungen.',
  'CPI y/y': 'Consumer Price Index im Jahresvergleich — zeigt die annualisierte Inflationsrate.',
  'Core CPI y/y': 'Kernrate der Jahresinflation ohne Energie und Lebensmittel.',
  'PPI m/m': 'Producer Price Index — misst Preisveränderungen auf Produzenten-Ebene, oft ein Vorläufer der CPI.',
  'FOMC Statement': 'Statement der US-Notenbank nach der Zinssitzung. Enthält Zinsentscheidung und wirtschaftlichen Ausblick.',
  'Federal Funds Rate': 'US-Leitzins der Federal Reserve. Bestimmt maßgeblich globale Kapitalflüsse und Währungsbewegungen.',
  'ISM Manufacturing PMI': 'Index für das verarbeitende Gewerbe der USA. Über 50 = Expansion, unter 50 = Kontraktion.',
  'ISM Services PMI': 'Index für den Dienstleistungssektor der USA. Misst Aktivität im größten Sektor der US-Wirtschaft.',
  'GDP q/q': 'Bruttoinlandsprodukt (Quartalsveränderung) — misst das Wirtschaftswachstum der USA.',
  'Retail Sales m/m': 'Monatliche Veränderung der Einzelhandelsumsätze — Indikator für Konsumentenausgaben.',
  'Core Retail Sales m/m': 'Einzelhandelsumsätze ohne Autos — weniger volatil, besserer Trendindikator.',
  'Unemployment Claims': 'Wöchentliche Erstanträge auf Arbeitslosenhilfe. Zeitnaher Indikator für den Arbeitsmarkt.',
  'ADP Non-Farm Employment Change': 'Private-Sektor-Beschäftigungsänderung — Vorläufer des offiziellen NFP-Berichts.',
  'Trade Balance': 'Differenz zwischen Exporten und Importen. Beeinflusst die Nachfrage nach der Währung.',
  'Building Permits': 'Bewilligte Baugenehmigungen — Frühindikator für den Immobilienmarkt.',
  'Housing Starts': 'Begonnene Neubauprojekte — Indikator für Investitionen im Immobiliensektor.',
  'CB Consumer Confidence': 'Conference Board Verbrauchervertrauen — misst Konsumentenstimmung in den USA.',
  'Crude Oil Inventories': 'Wöchentliche US-Rohölvorräte (EIA). Direkte Auswirkung auf den Ölpreis.',
  'BOE Official Bank Rate': 'Leitzins der Bank of England — beeinflusst GBP und UK-Märkte direkt.',
  'ECB Main Refinancing Rate': 'Leitzins der Europäischen Zentralbank — bestimmt EUR-Liquiditätsbedingungen.',
}

function getEventDescription(title: string): string | null {
  if (EVENT_DESCRIPTIONS[title]) return EVENT_DESCRIPTIONS[title]
  for (const [key, desc] of Object.entries(EVENT_DESCRIPTIONS)) {
    if (title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(title.toLowerCase())) {
      return desc
    }
  }
  return null
}


interface HistoryEntry {
  date: string
  actual: string | null
  forecast: string | null
  previous: string | null
}

interface Props {
  event: EconomicEvent
  watchlistSymbols?: string[]
  matchedSymbols?: string[]
  watchlistColorMap?: Record<string, string>
}

const LS_KEY = (eventId: string) => `ki-briefing-${eventId}`

export function EconomicEventDetail({ event, watchlistSymbols = [], matchedSymbols = [], watchlistColorMap = {} }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(LS_KEY(event.id)) ?? null
  })
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showGrounding, setShowGrounding] = useState(false)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // undefined = still loading, null = loaded with no stats (< 3 trades)
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryEntry[]>([])
  const [tradeStats, setTradeStats] = useState<TradeStats | null | undefined>(undefined)
  const [tradeHistoryLoading, setTradeHistoryLoading] = useState(true)

  const description = getEventDescription(event.title)

  // On mount: if no local cache, fetch from DB (syncs across devices)
  useEffect(() => {
    if (analysis) return
    fetch(`/api/calendar/ki-briefing?event_id=${encodeURIComponent(event.id)}`)
      .then(r => r.ok ? r.json() : { content: null })
      .then(d => {
        if (d.content) {
          setAnalysis(d.content)
          localStorage.setItem(LS_KEY(event.id), d.content)
        }
      })
      .catch(() => {})
  }, [event.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams({ title: event.title, currency: event.currency })
    fetch(`/api/calendar/event-history?${params}`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(d => setHistory(d.history ?? []))
      .finally(() => setHistoryLoading(false))
  }, [event.title, event.currency])

  useEffect(() => {
    const params = new URLSearchParams({ title: event.title, currency: event.currency })
    fetch(`/api/calendar/event-trade-history?${params}`)
      .then(r => r.ok ? r.json() : { trades: [], stats: null })
      .then(d => {
        setTradeHistory(d.trades ?? [])
        setTradeStats(d.stats ?? null)
      })
      .finally(() => setTradeHistoryLoading(false))
  }, [event.title, event.currency])

  const handleAnalyze = async () => {
    setAnalysisLoading(true)
    setAnalysisError(null)
    setShowGrounding(true)
    try {
      const res = await fetch('/api/ai/calendar-event-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_title: event.title,
          event_currency: event.currency,
          event_impact: event.impact,
          actual: event.actual,
          forecast: event.forecast,
          previous: event.previous,
          event_date: event.date,
          watchlist_matches: matchedSymbols,
          trade_stats: tradeStats ?? null,
          recent_trades: tradeHistory.slice(0, 8).map(t => ({
            event_date: t.event_date,
            asset: t.asset,
            direction: t.direction,
            rr_ratio: t.rr_ratio,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setAnalysisError(err.error?.includes('API-Key')
          ? 'Kein KI API-Key hinterlegt. Bitte in Einstellungen → KI-Provider eintragen.'
          : (err.error ?? 'Fehler bei der Analyse.'))
        return
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let firstChunk = true
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setAnalysis(accumulated)
        if (firstChunk) { setAnalysisLoading(false); firstChunk = false }
      }
      if (accumulated) {
        localStorage.setItem(LS_KEY(event.id), accumulated)
        // Sync to DB so all devices see the same briefing
        fetch('/api/calendar/ki-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: event.id, content: accumulated }),
        }).catch(() => {})
      }
    } catch {
      setAnalysisError('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  return (
    <div
      className="px-4 pb-4 pt-3 space-y-4"
      style={{ borderTop: '1px solid var(--border-raw)', background: 'var(--bg-1)' }}
    >
      {description && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-3)' }}>
          {description}
        </p>
      )}

      {/* Assets: watchlist matches highlighted, generic assets dimmer */}
      <div className="flex flex-wrap gap-1.5">
        {matchedSymbols.map(asset => {
          const c = watchlistColorMap[asset] ?? '#ff8210'
          return (
            <span
              key={`wl-${asset}`}
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: `${c}22`, color: c, border: `1px solid ${c}55` }}
            >
              {asset} ★
            </span>
          )
        })}
      </div>

      {/* Data summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Vorherig', value: event.previous },
          { label: 'Prognose', value: event.forecast },
          { label: 'Aktuell', isActual: true },
        ].map(({ label, value, isActual }) => (
          <div key={label} className="rounded-md p-2 text-center" style={{ background: 'var(--bg-3)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--fg-4)' }}>{label}</div>
            {isActual ? (
              <ActualValue actual={event.actual} forecast={event.forecast} />
            ) : (
              <div className="text-xs tabular-nums" style={{ color: value ? 'var(--fg-2)' : 'var(--fg-4)' }}>{value ?? '—'}</div>
            )}
          </div>
        ))}
      </div>

      {/* Historical releases */}
      {(historyLoading || history.length > 0) && (
        <div>
          <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--fg-4)' }}>
            Letzte Releases
          </p>
          {historyLoading ? (
            <div className="space-y-1">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
          ) : (
            <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-raw)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-3)' }}>
                    {['Datum', 'Vorherig', 'Prognose', 'Aktuell'].map(h => (
                      <th key={h} className="px-2 py-1 text-right first:text-left font-medium" style={{ color: 'var(--fg-4)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => (
                    <tr key={row.date} style={{ background: i % 2 === 0 ? 'var(--bg-2)' : 'var(--bg-1)' }}>
                      <td className="px-2 py-1" style={{ color: 'var(--fg-3)' }}>{format(parseISO(row.date), 'd. MMM yy', { locale: de })}</td>
                      <td className="px-2 py-1 text-right tabular-nums" style={{ color: 'var(--fg-4)' }}>{row.previous ?? '—'}</td>
                      <td className="px-2 py-1 text-right tabular-nums" style={{ color: 'var(--fg-3)' }}>{row.forecast ?? '—'}</td>
                      <td className="px-2 py-1 text-right"><ActualValue actual={row.actual} forecast={row.forecast} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Deine Geschichte ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--fg-4)' }}>
          Deine Geschichte mit diesem Event
        </p>
        {tradeHistoryLoading ? (
          <div className="space-y-1">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
        ) : tradeHistory.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
            Keine Trades ±60 Minuten um bisherige {event.title}-Events.
          </p>
        ) : (
          <div className="space-y-2">
            {tradeStats ? (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Trades', value: String(tradeStats.total) },
                  { label: 'Win-Rate', value: tradeStats.win_rate !== null ? `${tradeStats.win_rate}%` : '—' },
                  { label: 'Ø R', value: tradeStats.avg_rr !== null ? (tradeStats.avg_rr > 0 ? '+' : '') + tradeStats.avg_rr : '—' },
                  { label: 'W / L', value: `${tradeStats.wins} / ${tradeStats.losses}` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-md p-2 text-center" style={{ background: 'var(--bg-3)' }}>
                    <div className="text-[10px] mb-0.5" style={{ color: 'var(--fg-4)' }}>{label}</div>
                    <div className="text-xs font-semibold tabular-nums" style={{ color: 'var(--fg-1)' }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--fg-4)' }}>
                {tradeHistory.length} Trade{tradeHistory.length !== 1 ? 's' : ''} — mindestens 3 für Statistik nötig.
              </p>
            )}

            <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-raw)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-3)' }}>
                    {['Event-Datum', 'Asset', 'Richtung', 'R'].map(h => (
                      <th key={h} className="px-2 py-1 text-left font-medium" style={{ color: 'var(--fg-4)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.slice(0, 8).map((t, i) => (
                    <tr key={t.trade_id} style={{ background: i % 2 === 0 ? 'var(--bg-2)' : 'var(--bg-1)' }}>
                      <td className="px-2 py-1 tabular-nums" style={{ color: 'var(--fg-3)' }}>
                        {format(parseISO(t.event_date), 'd. MMM yy', { locale: de })}
                      </td>
                      <td className="px-2 py-1 font-medium" style={{ color: 'var(--fg-2)' }}>{t.asset}</td>
                      <td className="px-2 py-1" style={{ color: 'var(--fg-3)' }}>
                        {t.direction === 'long' ? 'Long' : 'Short'}
                      </td>
                      <td
                        className="px-2 py-1 tabular-nums font-semibold"
                        style={{ color: t.rr_ratio === null ? 'var(--fg-4)' : t.rr_ratio > 0 ? 'var(--long)' : 'var(--short)' }}
                      >
                        {t.rr_ratio === null ? '—' : (t.rr_ratio > 0 ? '+' : '') + t.rr_ratio + 'R'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Trade indicator for current week */}
      {event.trade_indicator && (
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs"
          style={{ background: 'var(--brand-blue-soft)', border: '1px solid rgba(255,130,16,0.2)' }}
        >
          <TrendingUp size={12} style={{ color: 'var(--brand-blue)' }} />
          <span style={{ color: 'var(--fg-2)' }}>
            Trade diese Woche:&nbsp;
            <strong style={{ color: 'var(--fg-1)' }}>
              {event.trade_indicator.asset} {event.trade_indicator.direction === 'long' ? 'Long' : 'Short'}
            </strong>
            {event.trade_indicator.rr_ratio !== null && (
              <>, {event.trade_indicator.rr_ratio > 0 ? '+' : ''}{event.trade_indicator.rr_ratio.toFixed(1)}R</>
            )}
            &nbsp;·&nbsp;{format(parseISO(event.trade_indicator.entry_time), 'HH:mm', { locale: de })}
          </span>
        </div>
      )}

      {/* ── KI-Briefing ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {analysis === null && !analysisLoading && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={handleAnalyze}>
            <Zap size={11} />
            KI-Briefing anfordern
          </Button>
        )}
        {analysisLoading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-3)' }}>
            <Loader2 size={12} className="animate-spin" />
            Analysiere…
          </div>
        )}
        {analysisError && (
          <p className="text-xs" style={{ color: 'var(--short)' }}>{analysisError}</p>
        )}

        {/* Datengrundlage toggle — shows exactly what was sent to the AI */}
        {(analysis !== null || analysisLoading) && (
          <div>
            <button
              onClick={() => setShowGrounding(v => !v)}
              className="flex items-center gap-1 text-[11px] transition-opacity active:opacity-60"
              style={{ color: 'var(--fg-4)' }}
            >
              {showGrounding ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              Datengrundlage {showGrounding ? 'ausblenden' : 'prüfen'}
            </button>
            {showGrounding && (
              <div
                className="mt-1.5 rounded-md p-3 space-y-1 text-[11px] leading-relaxed"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)', color: 'var(--fg-3)' }}
              >
                <p>
                  <strong style={{ color: 'var(--fg-2)' }}>Event-Daten:</strong>{' '}
                  Aktuell: {event.actual ?? '—'} · Prognose: {event.forecast ?? '—'} · Vorherig: {event.previous ?? '—'}
                </p>
                <p>
                  <strong style={{ color: 'var(--fg-2)' }}>Watchlist-Matches:</strong>{' '}
                  {matchedSymbols.length > 0 ? matchedSymbols.join(', ') : 'keine'}
                </p>
                <p>
                  <strong style={{ color: 'var(--fg-2)' }}>Trade-Statistik:</strong>{' '}
                  {tradeStats
                    ? `${tradeStats.total} Trades · Win-Rate ${tradeStats.win_rate ?? '—'}% · Ø R ${tradeStats.avg_rr ?? '—'}`
                    : tradeHistory.length > 0
                      ? `${tradeHistory.length} Trade(s) — zu wenig für Statistik`
                      : 'keine Trade-Daten'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--fg-4)' }}>
                  Die KI darf nur diese Zahlen verwenden. Steht hier etwas anderes als im KI-Text → Halluzination.
                </p>
              </div>
            )}
          </div>
        )}

        {analysis && (
          <div
            className="text-xs leading-relaxed rounded-md p-3 space-y-2"
            style={{ background: 'var(--bg-2)', color: 'var(--fg-2)', border: '1px solid var(--border-raw)' }}
          >
            {analysis.split('\n').map((line, i) => {
              if (!line.trim()) return null
              const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              return (
                <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
