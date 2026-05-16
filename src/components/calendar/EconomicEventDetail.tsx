'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, TrendingUp, Zap, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { EconomicEvent } from '@/types/calendar'
import type { TradeHistoryEntry, TradeStats } from '@/app/api/calendar/event-trade-history/route'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ActualValue } from './ActualValue'

const EVENT_DESCRIPTIONS: Record<string, string> = {
  // ── USA: Arbeitsmarkt ─────────────────────────────────────────────────────
  'Non-Farm Payrolls': 'Misst die Veränderung der Beschäftigung außerhalb der Landwirtschaft im Vormonat. Der NFP gilt als wichtigster monatlicher Indikator für den US-Arbeitsmarkt und hat regelmäßig starke Auswirkungen auf USD, Aktien und Anleihen.',
  'Non-Farm Employment Change': 'Misst die Veränderung der Beschäftigung außerhalb der Landwirtschaft im Vormonat. Der NFP gilt als wichtigster monatlicher Indikator für den US-Arbeitsmarkt.',
  'ADP Non-Farm Employment Change': 'Misst die Veränderung der Beschäftigung im privaten Sektor, veröffentlicht zwei Tage vor dem offiziellen NFP-Bericht. Gilt als Vorindikator für den Regierungsbericht.',
  'Unemployment Rate': 'Anteil der arbeitslosen Erwerbspersonen an der Gesamtzahl der Erwerbspersonen. Veröffentlicht zusammen mit dem NFP-Bericht vom Bureau of Labor Statistics.',
  'Average Hourly Earnings m/m': 'Monatliche Veränderung der durchschnittlichen Stundenlöhne. Wichtiger Lohninflationsindikator — beeinflusst direkt die Fed-Zinsentscheidungen.',
  'Average Hourly Earnings y/y': 'Jährliche Veränderung der durchschnittlichen Stundenlöhne gegenüber dem Vorjahr. Lohnwachstum über 3,5% gilt als inflationär.',
  'JOLTS Job Openings': 'Job Openings and Labor Turnover Survey — misst die Anzahl offener Stellen. Hohe Werte zeigen einen angespannten Arbeitsmarkt und stützen USD.',
  'Unemployment Claims': 'Erstanträge auf Arbeitslosenhilfe der vergangenen Woche. Als wöchentlicher Datenpunkt einer der zeitnahsten Indikatoren für den Arbeitsmarkt.',
  'Continuing Claims': 'Anzahl der Personen, die fortlaufend Arbeitslosenhilfe beziehen. Steigt dieser Wert, deutet dies auf eine Verlängerung der Arbeitslosigkeit hin.',
  'Challenger Job Cuts': 'Monatliche Anzahl angekündigter Entlassungen von Challenger, Gray & Christmas. Frühindikator für Schwächen im Arbeitsmarkt.',

  // ── USA: Inflation ───────────────────────────────────────────────────────
  'CPI m/m': 'Consumer Price Index (monatlich) — misst die durchschnittliche Preisveränderung eines repräsentativen Warenkorbs. Hauptindikator für Verbraucherinflation, vom Bureau of Labor Statistics veröffentlicht.',
  'CPI y/y': 'Consumer Price Index im Jahresvergleich. Zeigt die Inflationsrate gegenüber dem Vorjahr und ist maßgeblich für Fed-Zinsentscheidungen.',
  'Core CPI m/m': 'Kernrate des CPI — ohne volatile Lebensmittel- und Energiepreise. Bevorzugter Inflationsindikator der US-Notenbank für die Geldpolitik.',
  'Core CPI y/y': 'Kernrate der Jahresinflation ohne Energie und Lebensmittel. Fed-Ziel liegt bei ~2%; Abweichungen lösen Zinsdiskussionen aus.',
  'PPI m/m': 'Producer Price Index (monatlich) — misst Preisveränderungen auf Produzentenstufe. Gilt als Vorläufer des CPI, da Produktionskosten oft mit Verzögerung an Verbraucher weitergegeben werden.',
  'PPI y/y': 'Producer Price Index im Jahresvergleich. Zeigt, wie stark die Produktionskosten gegenüber dem Vorjahr gestiegen sind.',
  'Core PPI m/m': 'Kernrate des PPI ohne Nahrungsmittel und Energie. Gibt ein klareres Bild der zugrundeliegenden Preistrends auf Produzentenstufe.',
  'Core PPI y/y': 'Jährlicher Kern-PPI ohne volatile Komponenten. Wichtiger Vorläufer für zukünftige Verbraucherpreisentwicklungen.',
  'PCE Price Index m/m': 'Personal Consumption Expenditures Price Index — der von der Fed bevorzugte Inflationsindikator. Breiter gefasst als der CPI.',
  'Core PCE Price Index m/m': 'Kern-PCE ohne Nahrungsmittel und Energie — das primäre Inflationsziel der Federal Reserve (Ziel: 2%).',
  'Core PCE Price Index y/y': 'Jahresrate des Kern-PCE. Direkt im Fokus der Fed; Werte deutlich über 2% erhöhen Zinssenkungshürden.',
  'Import Prices m/m': 'Preisveränderung importierter Güter. Indikator für importierte Inflation, besonders relevant bei starken USD-Schwankungen.',

  // ── USA: Notenbank / Fed ──────────────────────────────────────────────────
  'FOMC Statement': 'Statement der Federal Reserve nach jeder FOMC-Sitzung. Enthält die Zinsentscheidung, wirtschaftliche Einschätzung und Hinweise auf zukünftige Maßnahmen (Forward Guidance). Marktbewegender Event.',
  'Federal Funds Rate': 'US-Leitzins der Federal Reserve. Bestimmt maßgeblich globale Kapitalflüsse, Kreditkosten und Währungsbewegungen weltweit.',
  'FOMC Meeting Minutes': 'Detailliertes Protokoll der FOMC-Sitzung, veröffentlicht drei Wochen nach der Entscheidung. Gibt Einblick in interne Diskussionen und Zukunftsaussichten.',
  'Fed Chair Press Conference': 'Pressekonferenz des Fed-Vorsitzenden nach FOMC-Sitzungen. Bietet Kontext zur Zinsentscheidung und wird auf Hinweise zur zukünftigen Politik analysiert.',
  'Fed Chair Powell Speaks': 'Rede des Fed-Vorsitzenden Jerome Powell. Jede Aussage zur Geldpolitik kann zu sofortigen Marktreaktionen führen.',
  'FOMC Member Speaks': 'Rede eines stimmberechtigten FOMC-Mitglieds. Kann Hinweise auf die zukünftige Geldpolitik liefern.',
  'Beige Book': 'Fed-Wirtschaftsbericht aus allen 12 Bezirken, veröffentlicht acht Mal jährlich. Qualitative Übersicht der wirtschaftlichen Bedingungen in den USA.',

  // ── USA: Wachstum / BIP ───────────────────────────────────────────────────
  'GDP q/q': 'Bruttoinlandsprodukt (Quartalsveränderung) — misst den Marktwert aller produzierten Güter und Dienstleistungen der USA. Zwei aufeinanderfolgende negative Quartale gelten als Rezession.',
  'Prelim GDP q/q': 'Vorläufige BIP-Schätzung für das Quartal — erste Revision der Vorabschätzung. Kann vom Vorabwert abweichen und zu starken Marktreaktionen führen.',
  'Final GDP q/q': 'Endgültige BIP-Revision für das Quartal. Enthält vollständige Daten und ist die definitive Messung des Wirtschaftswachstums.',
  'GDP Price Index q/q': 'BIP-Deflator — misst Inflation innerhalb der Gesamtwirtschaft. Wichtiger Indikator für die Kaufkraftentwicklung.',

  // ── USA: Konsum & Handel ──────────────────────────────────────────────────
  'Retail Sales m/m': 'Monatliche Veränderung der Einzelhandelsumsätze. Da Konsumausgaben ~70% des US-BIP ausmachen, ist dies ein zentraler Indikator für die Wirtschaftsstärke.',
  'Core Retail Sales m/m': 'Einzelhandelsumsätze ohne Autos — weniger volatil und besserer Indikator für den zugrunde liegenden Konsumtrend.',
  'CB Consumer Confidence': 'Conference Board Verbrauchervertrauen — monatliche Umfrage zur Einschätzung der Wirtschaftslage. Höhere Werte deuten auf stärkere Konsumausgaben hin.',
  'UoM Consumer Sentiment': 'University of Michigan Consumer Sentiment — monatliche Umfrage zur Verbraucherstimmung. Früh im Monat veröffentlicht, daher als Frühindikator genutzt.',
  'Trade Balance': 'Differenz zwischen US-Exporten und -Importen. Ein Defizit bedeutet mehr Importe als Exporte und erhöht die Nachfrage nach Fremdwährungen.',
  'Current Account': 'Breitester Maßstab des Außenhandels — umfasst Waren, Dienstleistungen, Transfers und Kapitaleinkommen.',

  // ── USA: Immobilien ───────────────────────────────────────────────────────
  'Building Permits': 'Anzahl neuer Baugenehmigungen. Frühindikator für Bauaktivität und den Immobilienmarkt; gibt Einblick in zukünftige Wohnungsnachfrage.',
  'Housing Starts': 'Anzahl neu begonnener Wohnbauprojekte. Direkte Messung der Bauaktivität im Wohnungssektor.',
  'Existing Home Sales': 'Anzahl der Verkäufe bestehender Häuser. ~90% aller US-Hausverkäufe sind Bestandsimmobilien — wichtiger Indikator für Immobilienmarkt und Konjunktur.',
  'New Home Sales': 'Anzahl der Verkäufe neuer Einfamilienhäuser. Direkte Messung der Nachfrage nach Neubauten — volatiler als Existing Home Sales.',
  'Pending Home Sales m/m': 'Veränderung der unterzeichneten Kaufverträge für Bestandsimmobilien. Führender Indikator für zukünftige Hausverkäufe.',
  'Case-Shiller Home Price Index m/m': 'S&P/Case-Shiller Hauspreisindex für 20 US-Großstädte. Wichtigstes Barometer für die Entwicklung der US-Immobilienpreise.',

  // ── USA: Industrie & Produktion ───────────────────────────────────────────
  'ISM Manufacturing PMI': 'Institute for Supply Management Einkaufsmanagerindex für das verarbeitende Gewerbe. Über 50 = Expansion, unter 50 = Kontraktion. Einer der ältesten und zuverlässigsten US-Konjunkturindikatoren.',
  'ISM Services PMI': 'ISM Einkaufsmanagerindex für den Dienstleistungssektor. Da ~80% der US-Wirtschaft aus Dienstleistungen bestehen, ist dieser Wert besonders bedeutsam.',
  'ISM Non-Manufacturing PMI': 'ISM Einkaufsmanagerindex für Nicht-Fertigungssektoren. Über 50 = Expansion, unter 50 = Kontraktion im Dienstleistungssektor.',
  'Industrial Production m/m': 'Veränderung der Produktionsleistung in Industrie, Bergbau und Versorgungsunternehmen. Direkte Messung der realen Wirtschaftsleistung.',
  'Capacity Utilization Rate': 'Anteil der genutzten Produktionskapazitäten in der Industrie. Hohe Auslastung (~80%+) kann auf inflationären Druck hinweisen.',
  'Empire State Manufacturing Index': 'Monatliche Umfrage zur Fertigungsaktivität im New Yorker Bezirk. Frühindikator für den breiteren ISM Manufacturing PMI.',
  'Philly Fed Manufacturing Index': 'Philadelphia Fed Herstellungsumfrage — regionaler Indikator für die Fertigungsaktivität im Third Federal Reserve District.',
  'Chicago PMI': 'Einkaufsmanagerindex für die Chicagoer Region. Gilt als Vorläufer des nationalen ISM Manufacturing PMI.',
  'Flash Manufacturing PMI': 'Vorabschätzung des S&P Global Einkaufsmanagerindex für das verarbeitende Gewerbe. Erste Einschätzung der monatlichen Produktionsaktivität.',
  'Flash Services PMI': 'Vorabschätzung des S&P Global Einkaufsmanagerindex für den Dienstleistungssektor.',

  // ── USA: Energie ──────────────────────────────────────────────────────────
  'Crude Oil Inventories': 'Wöchentliche Veränderung der US-Rohölvorräte, veröffentlicht von der EIA. Direkte Auswirkung auf den WTI-Ölpreis und Energiewährungen (CAD, NOK).',
  'Natural Gas Storage': 'Wöchentliche Veränderung der US-Erdgasvorräte. Beeinflusst Energiepreise, besonders relevant im Winter.',

  // ── USA: Sonstige ─────────────────────────────────────────────────────────
  'Durable Goods Orders m/m': 'Monatliche Veränderung der Aufträge für langlebige Güter. Indikator für unternehmerische Investitionsnachfrage.',
  'Core Durable Goods Orders m/m': 'Durable Goods ohne volatile Transportgüter. Besserer Indikator für das zugrunde liegende Investitionsverhalten.',
  'Factory Orders m/m': 'Monatliche Veränderung der Aufträge des verarbeitenden Gewerbes. Kombination aus langlebigen und kurzlebigen Güteraufträgen.',
  'Business Inventories m/m': 'Monatliche Veränderung der unternehmerischen Lagerbestände. Hilft bei der Einschätzung zukünftiger Produktionsänderungen.',

  // ── UK: Bank of England ────────────────────────────────────────────────────
  'BOE Official Bank Rate': 'Leitzins der Bank of England. Änderungen beeinflussen direkt GBP, UK-Anleihen und britische Aktienmärkte.',
  'BOE Rate Decision': 'Zinsentscheidung der Bank of England. Bestimmt die Kreditkosten im Vereinigten Königreich und hat direkte Auswirkung auf GBP.',
  'MPC Official Bank Rate Votes': 'Abstimmungsprotokoll des Monetary Policy Committee der Bank of England (9 Mitglieder). Das Stimmenverhältnis gibt Hinweise auf zukünftige Zinsentscheidungen.',
  'BOE Monetary Policy Summary': 'Zusammenfassung der geldpolitischen Entscheidung der Bank of England. Enthält wirtschaftliche Einschätzung und Forward Guidance.',
  'BOE Quarterly Bulletin': 'Vierteljährlicher Bericht der Bank of England über wirtschaftliche und finanzielle Entwicklungen im Vereinigten Königreich.',
  'UK CPI y/y': 'Consumer Price Index UK im Jahresvergleich — wichtigster Inflationsindikator Großbritanniens. BoE-Ziel: 2%.',
  'UK GDP m/m': 'Monatliche BIP-Veränderung Großbritanniens. Schnelleres Maß für die Wirtschaftsleistung als die Quartalsdaten.',
  'UK Retail Sales m/m': 'Monatliche Veränderung der britischen Einzelhandelsumsätze — Indikator für Konsumentennachfrage.',
  'Claimant Count Change': 'Monatliche Veränderung der Anzahl von Arbeitslosen in Großbritannien. Direkte Messung der britischen Arbeitslosigkeit.',
  'Average Earnings Index 3m/y': 'Britischer Lohnwachstumsindikator — Durchschnittseinkommen über 3 Monate im Jahresvergleich. Maßgeblich für BoE-Inflation-Einschätzung.',

  // ── Eurozone: EZB ──────────────────────────────────────────────────────────
  'ECB Main Refinancing Rate': 'Hauptrefinanzierungszinssatz der Europäischen Zentralbank. Der wichtigste Leitzins der EZB — bestimmt Kreditkosten für Banken und beeinflußt EUR stark.',
  'ECB Rate Decision': 'Zinsentscheidung der EZB. Bekanntgabe des Haupt-Refinanzierungssatzes und der Einlagenfazilität. Marktbewegender Event für EUR.',
  'ECB Press Conference': 'Pressekonferenz der EZB-Präsidentin nach Zinsentscheidungen. Lagarde-Kommentare zur Inflation und Wirtschaft beeinflussen EUR stark.',
  'ECB Monetary Policy Statement': 'Geldpolitisches Statement der EZB. Enthält wirtschaftliche Beurteilung und Forward Guidance zu zukünftigen Zinsentscheidungen.',
  'German Ifo Business Climate': 'IFO Institut Geschäftsklimaindex — monatliche Umfrage unter 9.000 deutschen Unternehmen. Wichtigster Frühindikator für die deutsche und europäische Wirtschaft.',
  'German CPI m/m': 'Verbraucherpreisindex Deutschland (monatlich). Als größte Volkswirtschaft der Eurozone starker Indikator für EZB-Inflation.',
  'German Prelim CPI m/m': 'Vorläufiger CPI Deutschland — erster Hinweis auf die monatliche Inflationsentwicklung in Deutschland.',
  'German GDP q/q': 'Quartals-BIP Deutschland. Als größte Volkswirtschaft der Eurozone maßgeblich für Eurozone-Wachstumseinschätzung.',
  'German Factory Orders m/m': 'Monatliche Veränderung der deutschen Fabrikaufträge. Frühindikator für die industrielle Produktionsleistung.',
  'German Industrial Production m/m': 'Monatliche Veränderung der deutschen Industrieproduktion. Zeigt die Stärke des verarbeitenden Gewerbes in der Eurozone.',
  'German ZEW Economic Sentiment': 'ZEW Konjunkturerwartungen — monatliche Umfrage unter ca. 300 deutschen Finanzexperten über die Wirtschaftsaussichten der nächsten 6 Monate.',
  'Flash GDP q/q': 'Vorabschätzung des BIP für die Eurozone. Erste Einschätzung des vierteljährlichen Wirtschaftswachstums.',
  'Eurozone CPI y/y': 'Harmonisierter Verbraucherpreisindex (HICP) der Eurozone. EZB-Ziel: nahe 2%. Hauptindikator für EZB-Zinsentscheidungen.',
  'Core CPI Flash Estimate y/y': 'Vorab-Kernrate der Eurozone-Inflation. Erste Einschätzung des monatlichen Inflationsdrucks ohne volatile Komponenten.',
  'ZEW Economic Sentiment': 'ZEW Konjunkturerwartungen Eurozone — monatliche Umfrage unter Finanzexperten. Frühindikator für die wirtschaftliche Entwicklung.',
  'Current Account': 'Leistungsbilanzsaldo der Eurozone. Zeigt das Verhältnis zwischen Exporten und Importen sowie Kapitaltransfers.',

  // ── Japan ─────────────────────────────────────────────────────────────────
  'BOJ Policy Rate': 'Leitzins der Bank of Japan. Nach Jahrzehnten der Nullzinspolitik ist jede Änderung besonders marktbewegend für JPY.',
  'BOJ Rate Decision': 'Zinsentscheidung der Bank of Japan. Nach jahrelanger Negativzinspolitik sind Änderungen stark marktbewegend für JPY und globale Carry-Trades.',
  'Bank Holiday': 'Feiertag — kein Handel für diese Währung, typischerweise reduzierte Liquidität.',
  'Tokyo Core CPI y/y': 'Kern-Verbraucherpreisindex Tokios im Jahresvergleich. Gilt als Frühindikator für den nationalen japanischen CPI.',
  'Tankan Large Manufacturers Index': 'Vierteljährliche BoJ-Umfrage unter Großunternehmen im verarbeitenden Gewerbe. Wichtigster Konjunkturindikator Japans.',

  // ── Kanada ────────────────────────────────────────────────────────────────
  'BOC Rate Decision': 'Zinsentscheidung der Bank of Canada. Direkte Auswirkung auf CAD. Die BoC folgt oft der Fed-Politik mit leichter Verzögerung.',
  'BOC Monetary Policy Statement': 'Geldpolitisches Statement der Bank of Canada mit wirtschaftlicher Einschätzung und Ausblick.',
  'Employment Change': 'Monatliche Veränderung der Beschäftigung in Kanada. Äquivalent zum US-NFP — wichtigster monatlicher Arbeitsmarktindikator.',
  'Canada CPI m/m': 'Kanadischer Verbraucherpreisindex (monatlich). Hauptindikator für kanadische Inflation; beeinflusst BoC-Zinsentscheidungen.',
  'Canada GDP m/m': 'Monatliche BIP-Veränderung Kanadas. Detaillierteres Bild der Wirtschaftsleistung als Quartalsdaten.',

  // ── Australien / Neuseeland ────────────────────────────────────────────────
  'RBA Rate Decision': 'Zinsentscheidung der Reserve Bank of Australia. Direkte Auswirkung auf AUD; beeinflusst auch NZD durch enge Wirtschaftsbeziehungen.',
  'RBA Rate Statement': 'Geldpolitisches Statement der Reserve Bank of Australia nach jeder Zinssitzung.',
  'RBNZ Rate Decision': 'Zinsentscheidung der Reserve Bank of New Zealand. Direkte Auswirkung auf NZD.',
  'CPI q/q': 'Vierteljährlicher Verbraucherpreisindex (Australien/Neuseeland). Hauptinflationsindikator für RBA/RBNZ-Entscheidungen.',
  'NAB Business Confidence': 'National Australia Bank Business Confidence Index — monatliche Umfrage unter australischen Unternehmen.',
  'Westpac Consumer Sentiment': 'Westpac Consumer Sentiment Index für Australien — monatliche Umfrage zur Verbraucherstimmung.',

  // ── Schweiz ────────────────────────────────────────────────────────────────
  'SNB Policy Rate': 'Leitzins der Schweizerischen Nationalbank. Änderungen sind selten aber stark marktbewegend für CHF.',
  'SNB Quarterly Bulletin': 'Vierteljährlicher Wirtschaftsbericht der Schweizerischen Nationalbank mit geldpolitischer Einschätzung.',
}

// Also check for partial title matches (e.g. "Unemployment Claims" matches "Initial Unemployment Claims")
const EVENT_DESCRIPTIONS_PARTIAL: [string, string][] = [
  ['Non-Farm', 'Misst die Beschäftigungsveränderung außerhalb der Landwirtschaft. Einer der marktbewegendsten US-Wirtschaftsindikatoren.'],
  ['Unemployment Claims', 'Wöchentliche oder monatliche Erstanträge auf Arbeitslosenhilfe — zeitnaher Indikator für den Arbeitsmarkt.'],
  ['CPI', 'Consumer Price Index — misst die Inflationsrate anhand eines repräsentativen Warenkorbs.'],
  ['PPI', 'Producer Price Index — misst Preisveränderungen auf Produzenten-Ebene. Vorläufer des CPI.'],
  ['PMI', 'Purchasing Managers Index — Umfrage unter Einkaufsmanagern. Über 50 = Expansion, unter 50 = Kontraktion.'],
  ['GDP', 'Bruttoinlandsprodukt — Gesamtwert aller produzierten Güter und Dienstleistungen in einem Land.'],
  ['PCE', 'Personal Consumption Expenditures — vom der Fed bevorzugter Inflationsindikator.'],
  ['Retail Sales', 'Monatliche Veränderung der Einzelhandelsumsätze — direkter Indikator für Konsumentenausgaben.'],
  ['Interest Rate', 'Zinsentscheidung der Zentralbank. Bestimmt Kreditkosten und beeinflusst Kapitalflüsse in die Währung.'],
  ['Rate Decision', 'Zinsentscheidung der Zentralbank. Jede Änderung hat direkte Auswirkungen auf die betreffende Währung.'],
  ['Employment', 'Beschäftigungsdaten — misst die Veränderung der Erwerbstätigkeit. Kerindikator für Wirtschaftsstärke.'],
  ['Housing', 'Immobilienmarkt-Indikator — misst Aktivität im Wohnungsbausektor.'],
  ['Manufacturing', 'Industrieproduktion oder Herstelleraufträge — Indikator für die Stärke des verarbeitenden Gewerbes.'],
  ['Consumer Confidence', 'Verbrauchervertrauen — misst die Konsumentenstimmung zur aktuellen und zukünftigen Wirtschaftslage.'],
  ['Trade Balance', 'Handelsbilanz — Differenz zwischen Exporten und Importen. Beeinflusst Währungsnachfrage.'],
  ['Inflation', 'Inflationsindikator — misst den Anstieg des allgemeinen Preisniveaus.'],
  ['Oil Inventories', 'Rohölvorräte — wöchentliche Bestandsveränderung. Direkte Auswirkung auf den Ölpreis.'],
]

function getEventDescription(title: string): string | null {
  // Exact match first
  if (EVENT_DESCRIPTIONS[title]) return EVENT_DESCRIPTIONS[title]
  // Case-insensitive exact match
  const lower = title.toLowerCase()
  for (const [key, desc] of Object.entries(EVENT_DESCRIPTIONS)) {
    if (key.toLowerCase() === lower) return desc
  }
  // Substring match (key contained in title)
  for (const [key, desc] of Object.entries(EVENT_DESCRIPTIONS)) {
    if (lower.includes(key.toLowerCase())) return desc
  }
  // Partial keyword fallback
  for (const [keyword, desc] of EVENT_DESCRIPTIONS_PARTIAL) {
    if (lower.includes(keyword.toLowerCase())) return desc
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

type WatchlistAnalysisState = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export function EconomicEventDetail({ event, watchlistSymbols = [], matchedSymbols = [], watchlistColorMap = {} }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(LS_KEY(event.id)) ?? null
  })
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showGrounding, setShowGrounding] = useState(false)

  const [watchlistAnalysis, setWatchlistAnalysis] = useState<string>('')
  const [watchlistAnalysisState, setWatchlistAnalysisState] = useState<WatchlistAnalysisState>('idle')

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

  const showWatchlistButton = event.impact === 'High' || matchedSymbols.length > 0

  const handleWatchlistAnalysis = async () => {
    setWatchlistAnalysisState('loading')
    setWatchlistAnalysis('')
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
        setWatchlistAnalysis(err.error?.includes('API-Key')
          ? 'Kein KI API-Key hinterlegt. Bitte in Einstellungen → KI-Provider eintragen.'
          : (err.error ?? 'Fehler bei der Analyse.'))
        setWatchlistAnalysisState('error')
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
        setWatchlistAnalysis(accumulated)
        if (firstChunk) { setWatchlistAnalysisState('streaming'); firstChunk = false }
      }
      setWatchlistAnalysisState('done')
    } catch {
      setWatchlistAnalysis('Verbindungsfehler. Bitte erneut versuchen.')
      setWatchlistAnalysisState('error')
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

      {/* ── Watchlist Impact ─────────────────────────────────────────── */}
      {showWatchlistButton && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-4)' }}>
            Watchlist Impact
          </p>

          {watchlistAnalysisState === 'idle' && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={handleWatchlistAnalysis}>
              <Sparkles size={11} />
              KI-Analyse: Auswirkung auf meine Watchlist
            </Button>
          )}

          {watchlistAnalysisState === 'loading' && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" disabled>
              <Loader2 size={11} className="animate-spin" />
              Analysiere…
            </Button>
          )}

          {(watchlistAnalysisState === 'streaming' || watchlistAnalysisState === 'done' || watchlistAnalysisState === 'error') && (
            <div
              className="rounded-md p-3 text-xs leading-relaxed space-y-2"
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border-raw)',
                color: watchlistAnalysisState === 'error' ? 'var(--short)' : 'var(--fg-2)',
              }}
            >
              {watchlistAnalysis.split('\n').map((line, i) => {
                if (!line.trim()) return null
                const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
              })}
              {watchlistAnalysisState === 'streaming' && (
                <span
                  className="inline-block w-1.5 h-3 ml-0.5 animate-pulse rounded-sm"
                  style={{ background: 'var(--fg-3)' }}
                />
              )}
              {(watchlistAnalysisState === 'done' || watchlistAnalysisState === 'error') && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => { setWatchlistAnalysisState('idle'); setWatchlistAnalysis('') }}
                    className="text-[11px] transition-opacity hover:opacity-80"
                    style={{ color: 'var(--fg-4)' }}
                  >
                    {watchlistAnalysisState === 'error' ? 'Erneut versuchen' : 'Neu analysieren'}
                  </button>
                </div>
              )}
            </div>
          )}
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
