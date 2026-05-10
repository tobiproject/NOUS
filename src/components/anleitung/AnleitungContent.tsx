'use client'

import { useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import Link from 'next/link'
import {
  Rocket, BookOpen, LayoutDashboard, Brain, ShieldCheck,
  TrendingUp, Library, Telescope, Bell, Settings, ArrowUp,
  ExternalLink, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { markSectionRead, getAnleitungProgress, ANLEITUNG_SECTION_IDS } from '@/lib/anleitung-progress'

interface Step {
  title: string
  text: string
  link?: string
}

interface Section {
  id: string
  icon: LucideIcon
  title: string
  description: string
  was: string
  wozu: string
  steps: Step[]
}

const sections: Section[] = [
  {
    id: 'erste-schritte',
    icon: Rocket,
    title: 'Erste Schritte',
    description: 'Profil, Konto, Strategie und API Key einrichten',
    was: 'Der Startbereich führt dich Schritt für Schritt durch die Grundkonfiguration deiner persönlichen Trading-Umgebung in NOUS.',
    wozu: 'Ohne diese Einrichtung fehlen NOUS wichtige Daten für KI-Analyse, Risikokalkulation und Performance-Tracking.',
    steps: [
      {
        title: 'Profil einrichten',
        text: 'Gehe zu Einstellungen → Profil. Hinterlege deinen Display-Namen und lade optional ein Profilbild hoch.',
        link: '/einstellungen?tab=profil&solo=1',
      },
      {
        title: 'Konto anlegen',
        text: 'Gehe zu Einstellungen → Konten. Erstelle ein Konto mit Kontoname, Startkapital, Währung und Kontotyp (Eigenhandel oder Fremdkapital/Prop Firm).',
        link: '/einstellungen?tab=konten&solo=1',
      },
      {
        title: 'Strategie definieren',
        text: 'Gehe zu Einstellungen → Strategie. Beschreibe deine Trading-Strategie, bevorzugte Zeitrahmen und Setup-Typen — das ist der Kontext für jede KI-Analyse.',
        link: '/einstellungen?tab=strategie&solo=1',
      },
      {
        title: 'API Key hinterlegen',
        text: 'Für alle KI-Funktionen brauchst du einen Anthropic (Claude) oder OpenAI (GPT-4o) API Key. Gehe zu Einstellungen → API Key und füge deinen Schlüssel ein.',
        link: '/einstellungen?tab=api-key&solo=1',
      },
      {
        title: 'Watchlist befüllen',
        text: 'Gehe zur Watchlist und füge die Assets hinzu, die du regelmäßig tradest. Hinterlege Kontraktwerte für präzise Risikoberechnungen.',
        link: '/watchlist',
      },
      {
        title: 'Risk Management einrichten',
        text: 'Gehe zu Risk und definiere dein maximales Tagesrisiko, Max-Drawdown und ggf. Prop-Firm-Regeln. Diese Limits werden bei jedem Trade überwacht.',
        link: '/risk',
      },
    ],
  },
  {
    id: 'journal',
    icon: BookOpen,
    title: 'Trading Journal',
    description: 'Trades erfassen, dokumentieren und mit KI analysieren',
    was: 'Das Journal ist der Kern von NOUS. Hier erfasst du jeden Trade mit allen relevanten Daten — von Entry bis Exit.',
    wozu: 'Nur vollständig dokumentierte Trades fließen korrekt in deine Performance-Statistiken ein und können von der KI analysiert werden.',
    steps: [
      {
        title: 'Neuen Trade erfassen',
        text: 'Klicke auf "+ Log trade" in der Sidebar oder den blauen Button unten rechts auf Mobile. Wähle Asset, Richtung (Long/Short), Entry-Preis, Stop Loss und Take Profit.',
        link: '/journal?new=1',
      },
      {
        title: 'Pflichtfelder ausfüllen',
        text: 'Datum, Instrument, Richtung und Entry-Preis sind Pflicht. SL und TP werden für die R/R-Berechnung benötigt. Die Positionsgröße wird automatisch berechnet, wenn Kontraktwerte in der Watchlist gepflegt sind.',
      },
      {
        title: 'Setup-Typ und Emotion angeben',
        text: 'Wähle deinen Setup-Typ (z.B. Breakout, Reversal, Range) und deine emotionale Verfassung vor dem Trade. Diese Felder sind entscheidend für die KI-Mustererkennung über mehrere Trades hinweg.',
      },
      {
        title: 'Screenshot hochladen',
        text: 'Lade den Chart-Screenshot deines Setups hoch. Klicke auf das Bild-Icon oder ziehe die Datei direkt in das Upload-Feld. Unterstützte Formate: PNG, JPG, WebP.',
      },
      {
        title: 'Exit dokumentieren',
        text: 'Nach dem Trade: Trage Exit-Preis und Ergebnis ein. Das PnL wird automatisch berechnet. Füge in der Notiz hinzu, was gut und was schlecht lief.',
      },
      {
        title: 'Trade bearbeiten',
        text: 'Öffne einen Trade im Journal und klicke auf das Stift-Icon. Alle Felder sind nachträglich bearbeitbar — auch nach dem Abschließen.',
        link: '/journal',
      },
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'KPIs, Equity Curve und Tagesplan auf einen Blick',
    was: 'Das Dashboard ist dein täglicher Startpunkt. Es zeigt deine Performance-KPIs, aktuelle Kontostand-Entwicklung und tagesaktuelle Informationen.',
    wozu: 'Mit dem Dashboard erkennst du auf einen Blick ob du im Plan bist — ohne durch mehrere Seiten navigieren zu müssen.',
    steps: [
      {
        title: 'KPIs lesen',
        text: 'Oben siehst du: Gesamt-PnL, Win Rate, Durchschnitts-RRR und Anzahl Trades — für den gewählten Zeitraum. Grün = positiv, Rot = negativ.',
        link: '/dashboard',
      },
      {
        title: 'Equity Curve interpretieren',
        text: 'Die Equity-Kurve zeigt deine Kapitalentwicklung über Zeit. Ein gleichmäßiger Anstieg signalisiert konsistentes Trading. Starke Schwankungen deuten auf mangelnde Disziplin hin.',
      },
      {
        title: 'Tagesplan aufrufen',
        text: 'Klicke auf "Tagesplan" um die Morning Briefing Seite zu öffnen. Hier erfasst du Pre-Market Checklist, Fokus-Assets für den Tag und Tagesnotizen.',
        link: '/tagesplan',
      },
      {
        title: 'Wochenvorbereitung starten',
        text: 'Die Weekly Prep Card erscheint am Wochenende als Erinnerung. Klicke darauf um die nächste Tradingwoche vorzubereiten.',
        link: '/wochenvorbereitung',
      },
    ],
  },
  {
    id: 'ki-analyse',
    icon: Brain,
    title: 'KI-Analyse',
    description: 'Wie du KI-Feedback zu deinen Trades abrufst',
    was: 'NOUS nutzt Claude (Anthropic) oder GPT-4o (OpenAI) um jeden Trade zu analysieren und übergreifende Muster in deinem Trading zu erkennen.',
    wozu: 'Die KI gibt konkretes Feedback zu Setup, Einstieg, Management und Emotionen — und identifiziert systematische Schwächen die du selbst nicht siehst.',
    steps: [
      {
        title: 'API Key erforderlich',
        text: 'Du brauchst einen eigenen API Key: Anthropic (Claude) oder OpenAI (GPT-4o). Hinterlege ihn unter Einstellungen → API Key. NOUS verwendet deinen Key — keine eigenen Kosten entstehen.',
        link: '/einstellungen?tab=api-key&solo=1',
      },
      {
        title: 'Einzelnen Trade analysieren',
        text: 'Öffne einen Trade im Journal und klicke auf den "KI-Analyse" Button. Die KI bewertet Setup-Qualität, Timing, Trade-Management und gibt konkrete Verbesserungsempfehlungen.',
        link: '/journal',
      },
      {
        title: 'Übergreifende Analysen abrufen',
        text: 'Unter Analysen siehst du KI-Auswertungen über mehrere Trades hinweg: Welche Setups funktionieren, wann Fehler entstehen und wie Emotionen dein Trading beeinflussen.',
        link: '/analysen',
      },
      {
        title: 'Knowledge Base für mehr Präzision',
        text: 'Lade deine eigenen Strategie-Dokumente hoch (Einstellungen → Knowledge Base). Die KI berücksichtigt diese beim Analysieren — so wird das Feedback auf dein System zugeschnitten.',
        link: '/einstellungen?tab=knowledge-base&solo=1',
      },
    ],
  },
  {
    id: 'risk',
    icon: ShieldCheck,
    title: 'Risk Management',
    description: 'Risiko-Regeln einrichten und Limits überwachen',
    was: 'Der Risk-Bereich überwacht automatisch deine definierten Risikolimits und warnt dich bevor du sie übertrittst.',
    wozu: 'Ohne definierte Limits kann ein schlechter Tag das Konto gefährden. NOUS schafft Bewusstsein für Risiko ohne dich einzuschränken.',
    steps: [
      {
        title: 'Tagesrisikolimit setzen',
        text: 'Gehe zu Risk → Einstellungen. Setze dein maximales Tagesverlust-Limit in Prozent oder als absoluten EUR/USD Betrag. NOUS zeigt eine Warnung wenn du dich dem Limit näherst.',
        link: '/risk',
      },
      {
        title: 'Max-Drawdown definieren',
        text: 'Definiere den maximalen Gesamtverlust (z.B. 5% des Kontokapitals). Wenn dieser Wert erreicht wird, erscheint eine prominente rote Warnung auf dem Dashboard.',
      },
      {
        title: 'Prop-Firm-Regeln hinterlegen',
        text: 'Hast du ein Prop-Firm-Konto (FTMO, MyForexFunds etc.)? Unter Prop-Firm-Regeln hinterlegst du die spezifischen Drawdown-Grenzen deiner Firma, die dann separat überwacht werden.',
        link: '/risk',
      },
      {
        title: 'Warnungen verstehen',
        text: 'Gelbe Warnung = Du näherst dich dem Limit (80%+ erreicht). Rote Warnung = Limit überschritten. NOUS blockiert keine Trades — die Entscheidung liegt immer bei dir.',
      },
    ],
  },
  {
    id: 'performance',
    icon: TrendingUp,
    title: 'Performance & Statistik',
    description: 'Statistiken lesen, filtern und exportieren',
    was: 'Die Performance-Seite zeigt detaillierte Statistiken über alle deine Trades — aufgeschlüsselt nach Zeitraum, Setup-Typ, Asset und mehr.',
    wozu: 'Nur wer seine Zahlen kennt, kann systematisch besser werden. Performance-Daten zeigen dir klar, was funktioniert und was nicht.',
    steps: [
      {
        title: 'Zeitraum wählen',
        text: 'Nutze den Filter oben um zwischen dieser Woche, diesem Monat, diesem Quartal und dem gesamten Zeitraum zu wechseln.',
        link: '/performance',
      },
      {
        title: 'KPIs interpretieren',
        text: 'Win Rate, Profit Factor, durchschnittliches R/R, Erwartungswert (Expectancy) — alle Metriken zeigen dir ob dein Trading profitabel und skalierbar ist.',
      },
      {
        title: 'Setup-Auswertung nutzen',
        text: 'Scrolle zu "Performance nach Setup-Typ". Hier siehst du welche Setups profitabel sind und welche du reduzieren oder einstellen solltest.',
      },
      {
        title: 'Trades exportieren',
        text: 'Klicke auf "Exportieren" um alle Trades als CSV oder PDF herunterzuladen — nützlich für Steuererklärungen, Broker-Auswertungen oder eigene Excel-Analysen.',
      },
    ],
  },
  {
    id: 'knowledge-base',
    icon: Library,
    title: 'Knowledge Base',
    description: 'Eigene Dokumente hochladen und als KI-Kontext nutzen',
    was: 'Die Knowledge Base erlaubt dir, eigene Dokumente (Trading-Plan, Regelwerk, Strategie-PDFs) hochzuladen, die die KI beim Analysieren berücksichtigt.',
    wozu: 'Wenn die KI dein persönliches Regelwerk kennt, wird das Feedback präziser und direkt auf dein System zugeschnitten statt generisch.',
    steps: [
      {
        title: 'Dokument hochladen',
        text: 'Gehe zu Einstellungen → Knowledge Base. Klicke auf "Datei hochladen" und wähle ein PDF oder Textdokument (max. 10 MB pro Datei).',
        link: '/einstellungen?tab=knowledge-base&solo=1',
      },
      {
        title: 'Inhalt beschreiben',
        text: 'Füge eine kurze Beschreibung hinzu (z.B. "Mein ICT-Regelwerk" oder "Prop-Firm Tradingplan"). Das hilft der KI, den Kontext korrekt einzuordnen.',
      },
      {
        title: 'Als KI-Kontext aktivieren',
        text: 'Aktiviere den Toggle neben jedem Dokument damit es bei der nächsten KI-Analyse berücksichtigt wird. Deaktivierte Dokumente werden ignoriert.',
      },
      {
        title: 'Dokumente aktuell halten',
        text: 'Du kannst Dokumente jederzeit löschen und durch neue Versionen ersetzen. Veraltete Regelwerke können das KI-Feedback verfälschen — halte die Knowledge Base aktuell.',
      },
    ],
  },
  {
    id: 'wochenvorbereitung',
    icon: Telescope,
    title: 'Wochenvorbereitung',
    description: 'Die nächste Tradingwoche gezielt vorbereiten',
    was: 'Die Wochenvorbereitung ist dein wöchentliches Ritual, um fokussiert und vorbereitet in die neue Handelswoche zu starten.',
    wozu: 'Trader die sich vorbereiten treffen bessere Entscheidungen in Echtzeit — weil sie bereits wissen was sie handeln und warum.',
    steps: [
      {
        title: 'Weekly Prep öffnen',
        text: 'Gehe zu Wochenvorbereitung. Die Seite führt dich durch einen strukturierten Prep-Prozess mit klaren Abschnitten.',
        link: '/wochenvorbereitung',
      },
      {
        title: 'Fokus-Assets definieren',
        text: 'Wähle 2–3 Assets auf die du dich in der kommenden Woche konzentrierst. Weniger ist mehr — zu viele Märkte erhöhen Fehler und Overtrading.',
      },
      {
        title: 'KI-Marktausblick abrufen',
        text: 'Klicke auf "KI-Analyse" um einen automatisch generierten Marktausblick zu erhalten. Die KI berücksichtigt deine Fokus-Assets und gibt strukturiertes Feedback zur Marktlage.',
      },
      {
        title: 'Wochenziele festlegen',
        text: 'Definiere konkrete Regeln für die Woche: z.B. "Maximal 3 Trades/Tag", "Kein Trading bei High-Impact-News" oder "Mindest-RRR: 2". Das schafft Accountability.',
      },
    ],
  },
  {
    id: 'benachrichtigungen',
    icon: Bell,
    title: 'Benachrichtigungen',
    description: 'Push-Notifications einrichten und konfigurieren',
    was: 'NOUS kann dir Browser-Push-Benachrichtigungen schicken — z.B. als Erinnerung für die Wochenvorbereitung oder den Journal-Eintrag.',
    wozu: 'Regelmäßige Erinnerungen helfen dabei, konsistente Trading-Routinen aufzubauen und aufrechtzuerhalten.',
    steps: [
      {
        title: 'Benachrichtigungen aktivieren',
        text: 'Gehe zu Einstellungen → Benachrichtigungen. Klicke auf "Push-Benachrichtigungen aktivieren" und bestätige die Browser-Anfrage. Funktioniert auf Desktop und Mobile (als installierte PWA).',
        link: '/einstellungen?tab=benachrichtigungen&solo=1',
      },
      {
        title: 'Erinnerungstypen wählen',
        text: 'Wähle welche Erinnerungen du empfangen möchtest: Wochenvorbereitung (Sonntag/Montag), Tagesabschluss oder Journal-Reminder nach Trading-Sessions.',
      },
      {
        title: 'Uhrzeit anpassen',
        text: 'Stelle die Uhrzeiten deiner Erinnerungen ein. Wähle Zeiten die zu deiner Trading-Routine passen — z.B. Abend-Erinnerung um 18:00 Uhr.',
      },
      {
        title: 'Einzelne Typen deaktivieren',
        text: 'Du kannst einzelne Erinnerungstypen deaktivieren ohne alle Notifications auszuschalten. Gehe zu Einstellungen → Benachrichtigungen und deaktiviere die jeweiligen Toggles.',
      },
    ],
  },
  {
    id: 'einstellungen',
    icon: Settings,
    title: 'Einstellungen',
    description: 'Alle Konfigurationsmöglichkeiten im Überblick',
    was: 'Die Einstellungen-Seite enthält alle Konfigurationsmöglichkeiten von NOUS in einem übersichtlichen Tab-Layout.',
    wozu: 'Hier personalisierst du die App und passt sie an dein Trading-System und deine Arbeitsweise an.',
    steps: [
      {
        title: 'Profil',
        text: 'Name, E-Mail, Profilbild, Display-Name und Schriftgröße der App.',
        link: '/einstellungen?tab=profil&solo=1',
      },
      {
        title: 'Strategie',
        text: 'Deine Trading-Strategie, bevorzugte Zeitrahmen, Setup-Typen und persönliche Regeln — der Grundkontext für alle KI-Analysen.',
        link: '/einstellungen?tab=strategie&solo=1',
      },
      {
        title: 'Konten',
        text: 'Alle deine Trading-Konten: Eigenhandel und Fremdkapital (Prop Firm). Kontotyp, Währung, Startkapital, aktuelles Kapital und Prop-Firm-Regeln.',
        link: '/einstellungen?tab=konten&solo=1',
      },
      {
        title: 'API Key',
        text: 'Hinterlege deinen Anthropic Claude oder OpenAI API Key für alle KI-Funktionen. Der Schlüssel wird verschlüsselt gespeichert und nie an Dritte weitergegeben.',
        link: '/einstellungen?tab=api-key&solo=1',
      },
      {
        title: 'Knowledge Base',
        text: 'Eigene Dokumente und PDFs hochladen, die als Kontext bei KI-Analysen genutzt werden.',
        link: '/einstellungen?tab=knowledge-base&solo=1',
      },
      {
        title: 'Benachrichtigungen',
        text: 'Push-Notifications konfigurieren: welche Erinnerungen du wann empfängst.',
        link: '/einstellungen?tab=benachrichtigungen&solo=1',
      },
    ],
  },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function AnleitungContent() {
  const [readSections, setReadSections] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    return getAnleitungProgress().read
  })

  const handleAccordionChange = (openValues: string[]) => {
    openValues.forEach(id => {
      if (ANLEITUNG_SECTION_IDS.includes(id) && !readSections.includes(id)) {
        markSectionRead(id)
        setReadSections(prev => [...prev, id])
      }
    })
  }

  const progress = getAnleitungProgress()
  const percent = readSections.length > 0
    ? Math.round((readSections.length / ANLEITUNG_SECTION_IDS.length) * 100)
    : progress.percent

  return (
    <div id="anleitung-top">
      {/* Page header */}
      <div className="mb-8">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--brand-blue)' }}
        >
          Hilfe & Dokumentation
        </p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--fg-1)' }}>
          Anleitung
        </h1>
        <p className="text-[14px] mb-4" style={{ color: 'var(--fg-3)' }}>
          Alles was du über NOUS wissen musst — von der Ersteinrichtung bis zu den fortgeschrittenen Features.
        </p>

        {/* Progress bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
        >
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium" style={{ color: 'var(--fg-2)' }}>
                Fortschritt
              </span>
              <span className="text-[12px] font-semibold" style={{ color: percent === 100 ? 'rgb(134,239,172)' : 'var(--brand-blue)' }}>
                {readSections.length}/{ANLEITUNG_SECTION_IDS.length} Abschnitte · {percent}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-3)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percent}%`,
                  background: percent === 100
                    ? 'rgb(34,197,94)'
                    : 'var(--brand-blue)',
                }}
              />
            </div>
          </div>
          {percent === 100 && (
            <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'rgb(134,239,172)' }} />
          )}
        </div>
      </div>

      {/* Desktop 2-column / Mobile 1-column */}
      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8 lg:items-start">

        {/* Sticky TOC — desktop only */}
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-2"
              style={{ color: 'var(--fg-4)' }}
            >
              Inhalt
            </p>
            <nav className="space-y-0.5">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-[13px] transition-colors duration-100"
                  style={{ color: 'var(--fg-3)' }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--fg-1)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--fg-3)'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <s.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Accordion sections */}
        <div>
          <Accordion type="multiple" className="space-y-2" onValueChange={handleAccordionChange}>
            {sections.map(s => {
              const isRead = readSections.includes(s.id)
              return (
              <AccordionItem
                key={s.id}
                value={s.id}
                id={s.id}
                className="rounded-lg border-0 scroll-mt-4"
                style={{
                  background: 'var(--bg-2)',
                  border: `1px solid ${isRead ? 'rgba(34,197,94,0.2)' : 'var(--border-raw)'}`,
                }}
              >
                <AccordionTrigger
                  className="px-4 py-4 hover:no-underline rounded-lg"
                  style={{ color: 'var(--fg-1)' }}
                >
                  <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                    <div
                      className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: isRead ? 'rgba(34,197,94,0.1)' : 'var(--bg-3)' }}
                    >
                      {isRead
                        ? <CheckCircle2 className="h-4 w-4" style={{ color: 'rgb(134,239,172)' }} />
                        : <s.icon className="h-4 w-4" style={{ color: 'var(--brand-blue)' }} />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold leading-tight" style={{ color: 'var(--fg-1)' }}>
                        {s.title}
                      </div>
                      <div className="text-[12px] leading-tight mt-0.5 truncate" style={{ color: 'var(--fg-3)' }}>
                        {s.description}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-5">
                  {/* Was / Wozu */}
                  <div
                    className="rounded-md px-4 py-3 mb-5 space-y-2"
                    style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}
                  >
                    <div>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: 'var(--fg-4)' }}
                      >
                        Was ist das?
                      </span>
                      <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--fg-2)' }}>
                        {s.was}
                      </p>
                    </div>
                    <div
                      className="pt-2"
                      style={{ borderTop: '1px solid var(--border-raw)' }}
                    >
                      <span
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: 'var(--fg-4)' }}
                      >
                        Wozu dient es?
                      </span>
                      <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--fg-2)' }}>
                        {s.wozu}
                      </p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-4">
                    {s.steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                          style={{ background: 'rgba(41,98,255,0.15)', color: 'var(--brand-blue)' }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13px] font-semibold" style={{ color: 'var(--fg-1)' }}>
                              {step.title}
                            </p>
                            {step.link && (
                              <Link
                                href={step.link}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded"
                                style={{
                                  color: 'var(--brand-blue)',
                                  background: 'rgba(41,98,255,0.1)',
                                }}
                              >
                                Öffnen
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}
                          </div>
                          <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: 'var(--fg-3)' }}>
                            {step.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Back to top */}
                  <button
                    onClick={() => scrollTo('anleitung-top')}
                    className="mt-6 flex items-center gap-1.5 text-[12px] transition-colors"
                    style={{ color: 'var(--fg-4)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg-2)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--fg-4)' }}
                  >
                    <ArrowUp className="h-3 w-3" />
                    Nach oben
                  </button>
                </AccordionContent>
              </AccordionItem>
            )
          })}
          </Accordion>
        </div>
      </div>
    </div>
  )
}
