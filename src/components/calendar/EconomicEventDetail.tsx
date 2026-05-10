'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, TrendingUp, Zap } from 'lucide-react'
import type { EconomicEvent } from '@/types/calendar'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ActualValue } from './ActualValue'

interface HistoryEntry {
  date: string
  actual: string | null
  forecast: string | null
  previous: string | null
}

// Static descriptions for the most common economic events
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
  'Existing Home Sales': 'Verkäufe bestehender Häuser — Indikator für den Immobilienmarkt.',
  'New Home Sales': 'Verkäufe neuer Häuser — sensitiver Vorlaufindikator für den Wohnungsmarkt.',
  'Durable Goods Orders m/m': 'Bestellungen langlebiger Güter — Indikator für Unternehmensinvestitionen.',
  'Empire State Manufacturing Index': 'Monatlicher Wirtschaftsindex für das verarbeitende Gewerbe im Staat New York.',
  'Philly Fed Manufacturing Index': 'Wirtschaftsindex der Federal Reserve Bank Philadelphia für das verarbeitende Gewerbe.',
  'Flash Manufacturing PMI': 'Schnellschätzung des Manufacturing PMI — erste Einschätzung der Industrieaktivität.',
  'Flash Services PMI': 'Schnellschätzung des Services PMI — erste Einschätzung der Dienstleistungsaktivität.',
  'BOE Official Bank Rate': 'Leitzins der Bank of England — beeinflusst GBP und UK-Märkte direkt.',
  'ECB Main Refinancing Rate': 'Leitzins der Europäischen Zentralbank — bestimmt EUR-Liquiditätsbedingungen.',
  'BOJ Policy Rate': 'Leitzins der Bank of Japan — maßgeblich für JPY-Bewertung und globale Carry-Trades.',
  'RBA Cash Rate': 'Leitzins der Reserve Bank of Australia — beeinflusst AUD und Rohstoffmärkte.',
  'Crude Oil Inventories': 'Wöchentliche US-Rohölvorräte (EIA). Direkte Auswirkung auf den Ölpreis.',
  'Natural Gas Storage': 'Wöchentliche US-Erdgasvorräte — beeinflusst den Energiemarkt.',
  'Employment Change': 'Veränderung der Beschäftigtenzahl — länderspezifischer Arbeitsmarktindikator.',
  'Unemployment Rate': 'Prozentualer Anteil der Arbeitslosen an der Erwerbsbevölkerung.',
  'Inflation Rate m/m': 'Monatliche Inflationsrate — misst kurzfristige Preisveränderungen.',
  'Inflation Rate y/y': 'Jährliche Inflationsrate im Ländervergleich.',
}

function getEventDescription(title: string): string | null {
  // Exact match first
  if (EVENT_DESCRIPTIONS[title]) return EVENT_DESCRIPTIONS[title]
  // Partial match for variations (e.g. "Core CPI m/m" matches "CPI m/m")
  for (const [key, desc] of Object.entries(EVENT_DESCRIPTIONS)) {
    if (title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(title.toLowerCase())) {
      return desc
    }
  }
  return null
}

// Known affected assets per currency
const AFFECTED_ASSETS: Record<string, string[]> = {
  USD: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'Gold', 'US Treasuries', 'DXY'],
  EUR: ['EUR/USD', 'EUR/GBP', 'EUR/JPY', 'DAX'],
  GBP: ['GBP/USD', 'EUR/GBP', 'FTSE 100'],
  JPY: ['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'Nikkei 225'],
  CAD: ['USD/CAD', 'Oil'],
  AUD: ['AUD/USD', 'AUD/JPY', 'ASX 200'],
  NZD: ['NZD/USD', 'NZD/JPY'],
  CHF: ['USD/CHF', 'EUR/CHF'],
  CNY: ['AUD/USD', 'Copper', 'China H-Shares'],
}

interface Props {
  event: EconomicEvent
}

export function EconomicEventDetail({ event }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const affectedAssets = AFFECTED_ASSETS[event.currency] ?? []
  const description = getEventDescription(event.title)

  useEffect(() => {
    const params = new URLSearchParams({ title: event.title, currency: event.currency })
    fetch(`/api/calendar/event-history?${params}`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(d => setHistory(d.history ?? []))
      .finally(() => setHistoryLoading(false))
  }, [event.title, event.currency])

  const handleAnalyze = async () => {
    setAnalysisLoading(true)
    setAnalysisError(null)
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
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (err.error?.includes('API-Key')) {
          setAnalysisError('Kein KI API-Key hinterlegt. Bitte in Einstellungen → KI-Provider eintragen.')
        } else {
          setAnalysisError(err.error ?? 'Fehler bei der Analyse.')
        }
        return
      }
      // Stream the response — keep loading spinner until first chunk arrives
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
      {/* Event description */}
      {description && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-3)' }}>
          {description}
        </p>
      )}

      {/* Affected assets */}
      {affectedAssets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {affectedAssets.map(asset => (
            <span
              key={asset}
              className="px-2 py-0.5 rounded text-xs"
              style={{
                background: 'var(--bg-3)',
                color: 'var(--fg-2)',
                border: '1px solid var(--border-raw)',
              }}
            >
              {asset}
            </span>
          ))}
        </div>
      )}

      {/* Data summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Previous', value: event.previous },
          { label: 'Forecast', value: event.forecast },
          { label: 'Actual', value: null, isActual: true },
        ].map(({ label, value, isActual }) => (
          <div
            key={label}
            className="rounded-md p-2 text-center"
            style={{ background: 'var(--bg-3)' }}
          >
            <div className="text-xs mb-1" style={{ color: 'var(--fg-4)' }}>{label}</div>
            {isActual ? (
              <ActualValue actual={event.actual} forecast={event.forecast} />
            ) : (
              <div className="text-xs tabular-nums" style={{ color: value ? 'var(--fg-2)' : 'var(--fg-4)' }}>
                {value ?? '—'}
              </div>
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
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-raw)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-3)' }}>
                    {['Datum', 'Previous', 'Forecast', 'Actual'].map(h => (
                      <th key={h} className="px-2 py-1 text-right first:text-left font-medium tabular-nums" style={{ color: 'var(--fg-4)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => (
                    <tr key={row.date} style={{ background: i % 2 === 0 ? 'var(--bg-2)' : 'var(--bg-1)' }}>
                      <td className="px-2 py-1" style={{ color: 'var(--fg-3)' }}>
                        {format(parseISO(row.date), 'd. MMM yy', { locale: de })}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums" style={{ color: 'var(--fg-4)' }}>{row.previous ?? '—'}</td>
                      <td className="px-2 py-1 text-right tabular-nums" style={{ color: 'var(--fg-3)' }}>{row.forecast ?? '—'}</td>
                      <td className="px-2 py-1 text-right">
                        <ActualValue actual={row.actual} forecast={row.forecast} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Related trade */}
      {event.trade_indicator && (
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs"
          style={{ background: 'var(--brand-blue-soft)', border: '1px solid rgba(255,130,16,0.2)' }}
        >
          <TrendingUp size={12} style={{ color: 'var(--brand-blue)' }} />
          <span style={{ color: 'var(--fg-2)' }}>
            Trade um dieses Event:&nbsp;
            <strong style={{ color: 'var(--fg-1)' }}>
              {event.trade_indicator.asset} {event.trade_indicator.direction === 'long' ? 'Long' : 'Short'}
            </strong>
            {event.trade_indicator.rr_ratio !== null && (
              <>, {event.trade_indicator.rr_ratio > 0 ? '+' : ''}{event.trade_indicator.rr_ratio.toFixed(1)}R</>
            )}
            {event.trade_indicator.result_currency !== null && (
              <>, {event.trade_indicator.result_currency > 0 ? '+' : ''}{event.trade_indicator.result_currency.toFixed(0)}€</>
            )}
            &nbsp;·&nbsp;{format(parseISO(event.trade_indicator.entry_time), 'HH:mm', { locale: de })}
          </span>
        </div>
      )}

      {/* KI-Analyse */}
      <div>
        {analysis === null && !analysisLoading && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7"
            onClick={handleAnalyze}
          >
            <Zap size={11} />
            Mit KI analysieren
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
        {analysis && (
          <div
            className="text-xs leading-relaxed rounded-md p-3"
            style={{
              background: 'var(--bg-2)',
              color: 'var(--fg-2)',
              border: '1px solid var(--border-raw)',
            }}
          >
            {analysis}
          </div>
        )}
      </div>
    </div>
  )
}
