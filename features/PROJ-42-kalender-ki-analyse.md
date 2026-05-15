# PROJ-42 — Kalender: KI-Analyse "Auswirkung auf meine Watchlist"

**Status:** Architected  
**Erstellt:** 2026-05-15  
**Feature-ID:** PROJ-42  
**Bereich:** Wirtschaftskalender (`/kalender`)

---

## Vision

Der Wirtschaftskalender zeigt Makro-Ereignisse — aber der Trader muss selbst herausfinden, ob ein Event für seine Assets relevant ist. PROJ-42 fügt jedem Kalender-Event einen KI-Analyse-Button hinzu. Claude bewertet das Ereignis im Kontext der persönlichen Watchlist des Traders und liefert eine fokussierte, handlungsorientierte Einschätzung — direkt im Event-Detail, per Streaming.

Keine generische Zusammenfassung. Keine externe News-API. Claude kennt NFP, CPI, FOMC & Co. aus seinem Trainings-Wissen und verbindet das mit den konkreten Assets des Traders.

---

## User Story

> Als Trader sehe ich im Wirtschaftskalender ein High-Impact-Event (z.B. US CPI) und klicke auf "KI-Analyse". Claude erklärt mir in Sekunden, was dieses Event typischerweise bedeutet, welche meiner Watchlist-Assets am stärksten betroffen sind und worauf ich achten sollte — ohne dass ich die App wechseln muss.

---

## Was Claude analysiert

### Eingabe-Daten (kein externer API-Call nötig)

| Feld | Quelle |
|------|--------|
| Event-Name | Bestehende Kalender-Daten (z.B. "Non-Farm Payrolls") |
| Land / Region | Bestehende Kalender-Daten (z.B. "US") |
| Impact-Level | Bestehende Kalender-Daten (`high` / `medium` / `low`) |
| Actual / Forecast / Previous | Bestehende Kalender-Daten (sofern verfügbar) |
| Watchlist-Assets des Traders | Bereits in `KalenderContent` geladen (Symbole des aktiven Kontos) |

### Die drei Analyse-Fragen, die Claude beantwortet

1. **Bedeutung des Events** — Was bedeutet dieses Makro-Ereignis typischerweise für die Märkte? (Kurz, konkret, nicht generisch — bezogen auf den spezifischen Indikator und seine aktuellen Werte)
2. **Watchlist-Relevanz** — Welche Assets aus der Watchlist des Traders sind am stärksten betroffen und warum? (Direkt, mit Begründung — z.B. "DXY steigt typischerweise wenn NFP besser als erwartet")
3. **Was der Trader beachten sollte** — Konkrete Hinweise für die Session: Was beobachten? Worauf vorbereiten? Welche Reaktionsmuster sind typisch?

---

## Button-Sichtbarkeit (Filterlogik)

Der KI-Analyse-Button erscheint **nur** wenn mindestens eine der folgenden Bedingungen erfüllt ist:

- Das Event hat Impact-Level `high` **oder**
- Das Event-Land korreliert mit mindestens einem Watchlist-Asset des Traders (z.B. US-Event + EURUSD/GBPUSD/NAS100 auf der Watchlist)

Rationale: Verhindert unnötige Buttons bei Low-Impact-Events ohne Watchlist-Bezug. Hält die UI übersichtlich.

---

## UI-Beschreibung

### Button in `EconomicEventDetail`

- Position: Am unteren Rand der Event-Detail-Ansicht (Popover / Sheet), nach den Kennzahlen (Actual/Forecast/Previous)
- Label: `"KI-Analyse: Auswirkung auf meine Watchlist"`
- Icon: Sparkle / Brain Icon (konsistent mit anderen KI-Buttons in der App)
- Zustand `loading`: Button deaktiviert, Spinner sichtbar, Label wechselt zu `"Analysiere..."`
- Zustand `streaming`: Button verschwindet, Streaming-Text erscheint darunter in einem abgegrenzten Bereich
- Zustand `done`: Vollständiger Text, kleiner "Neu analysieren"-Link unten rechts

### Streaming-Text-Bereich

- Erscheint direkt unterhalb des Buttons innerhalb desselben Popovers / Sheets
- Dunkler Hintergrund (`bg-zinc-900`), leichte Border, leicht eingerückt — visuell als "KI-Antwort" erkennbar
- Cursor-Animation während des Streamings
- Kein Scroll-Lock — der Nutzer kann den Sheet weiter scrollen
- Auf Mobile: Sheet öffnet sich weiter nach oben wenn der Streaming-Bereich erscheint (kein Abschneiden)

---

## API Route

**Route:** `POST /api/ai/calendar-impact`  
**Auth:** Pflicht (Supabase Session)  
**Streaming:** Ja — Server-Sent Events (SSE), gleiche Methodik wie `/api/ai/trade-analysis`

### Request Body

```
{
  eventName: string,
  country: string,
  impactLevel: "high" | "medium" | "low",
  actual: string | null,
  forecast: string | null,
  previous: string | null,
  watchlistSymbols: string[]   // z.B. ["EURUSD", "NAS100", "GOLD"]
}
```

### Verhalten der Route

- Liest den AI-Provider und API-Key des Nutzers aus Supabase (identisch zu anderen KI-Routes)
- Nutzt `callAI` aus `ai-client.ts` — Coach-Context wird automatisch injiziert
- Streamt die Antwort zurück als SSE
- Kein Caching — jede Analyse ist frisch (bewusste Entscheidung: Daten können sich ändern)
- Timeout: 30 Sekunden

---

## Acceptance Criteria

### Funktional
- [ ] KI-Analyse-Button erscheint in `EconomicEventDetail` bei High-Impact-Events oder Watchlist-Matches
- [ ] Button erscheint **nicht** bei Low/Medium-Impact-Events ohne Watchlist-Relevanz
- [ ] Klick startet einen POST-Request an `/api/ai/calendar-impact`
- [ ] Antwort wird als Streaming-Text direkt im Event-Detail angezeigt
- [ ] Alle drei Analyse-Punkte (Bedeutung / Watchlist-Relevanz / Was beachten) sind in der Antwort enthalten
- [ ] Bei leerem Watchlist: Button erscheint nur bei High-Impact, Analyse-Text weist auf fehlende Watchlist hin
- [ ] "Neu analysieren"-Option nach Abschluss des Streamings

### Technisch
- [ ] Route nutzt denselben Auth-Flow und `callAI`-Mechanismus wie bestehende KI-Routes
- [ ] Kein zusätzlicher API-Key oder externer Dienst nötig
- [ ] Fehler (kein API-Key konfiguriert, Timeout, Rate Limit) werden im Streaming-Bereich als lesbare Fehlermeldung angezeigt — kein leerer State

### UX
- [ ] Streaming läuft ohne UI-Ruckler (keine Layout-Shifts)
- [ ] Button-Zustand (`idle` / `loading` / `streaming` / `done`) ist jederzeit klar erkennbar
- [ ] Auf Mobile: Sheet bleibt nutzbar während des Streamings, kein Abschneiden des Textes
- [ ] Analyse dauert subjektiv weniger als 3 Sekunden bis zum ersten Token

---

## Abgrenzung / Non-Goals

- Kein Caching der Analyse-Ergebnisse (bewusst — Frische > Performance)
- Keine automatische Analyse beim Öffnen des Events (immer manuell ausgelöst)
- Kein Speichern der Analyse in der Datenbank
- Keine Analyse für vergangene Events (Button deaktiviert wenn `eventTime` in der Vergangenheit liegt und `actual` bereits vorhanden ist — Ausnahme: "Nachanalyse" kann sinnvoll sein, daher optional offen lassen)
- Kein neuer Supabase-Table nötig

---

## Abhängigkeiten

| Abhängigkeit | Status |
|-------------|--------|
| PROJ-38 Wirtschaftskalender | Deployed — `EconomicEventDetail`, `KalenderContent` bereits vorhanden |
| PROJ-23/33 Watchlist | Deployed — Watchlist-Symbole bereits in `KalenderContent` geladen |
| PROJ-30 Multi-AI Provider | Deployed — `callAI`, `ai-client.ts`, Auth-Flow für KI-Routes bereits vorhanden |
| Bestehende Route `/api/ai/calendar-event-analysis` | Deployed — Referenz-Implementierung für Streaming-Logik |

---

## Nächste Schritte

1. ~~`/architecture`~~ — ✅ Done
2. `/frontend` — UI-Integration in `EconomicEventDetail.tsx`, Streaming-Bereich
3. `/backend` — API Route `/api/ai/calendar-impact`
4. `/qa` — Tests gegen Acceptance Criteria
5. `/deploy` — Deploy auf Vercel

---

## Tech Design (Solution Architect)

**Erstellt:** 2026-05-15

---

### Überblick

PROJ-42 fügt eine zweite, klar abgegrenzte KI-Funktion zu `EconomicEventDetail` hinzu. Die bestehende "KI-Briefing"-Funktion (gecacht, trade-statistik-fokussiert) bleibt unverändert. Die neue "KI-Analyse: Auswirkung auf meine Watchlist"-Funktion ergänzt sie: schneller, ungecacht, rein watchlist-fokussiert.

---

### Komponenten-Struktur

```
EconomicEventDetail (src/components/calendar/EconomicEventDetail.tsx)
  [bestehend, unverändert]
  +-- Beschreibung
  +-- Watchlist-Badges (matchedSymbols)
  +-- Kennzahlen-Grid (Vorherig / Prognose / Aktuell)
  +-- Letzte Releases (Historik-Tabelle)
  +-- Deine Geschichte mit diesem Event (Trade-Statistik)
  +-- Trade Indicator (dieser Woche)
  +-- KI-Briefing-Sektion (BESTEHEND — bleibt unverändert)
  |
  +-- [NEU] Watchlist-Impact-Sektion
      |  [nur sichtbar wenn: impact === 'high' ODER matchedSymbols.length > 0]
      |
      +-- Button "KI-Analyse: Auswirkung auf meine Watchlist"
      |   [Zustände: idle / loading / streaming / done]
      |
      +-- Streaming-Textbereich (bg-zinc-900, Border)
      |   [erscheint sobald erster Token ankommt]
      |
      +-- "Neu analysieren"-Link (erscheint nach done)
```

Kein separates Komponenten-File erforderlich — die Watchlist-Impact-Sektion ist ein in-file Block analog zur bestehenden KI-Briefing-Sektion.

---

### Button-Sichtbarkeits-Logik

Rein client-seitig, keine zusätzlichen API-Calls. Alle benötigten Daten sind bereits als Props vorhanden:

```
Zeige Button wenn:
  event.impact === 'high'
  ODER
  matchedSymbols.length > 0
```

`matchedSymbols` wird von `KalenderContent` übergeben und enthält bereits alle Assets der Watchlist des Traders, die zur Währung/Region des Events passen. Diese Logik existiert bereits — nichts Neues muss berechnet werden.

---

### Datenfluss

```
KalenderContent (bestehend)
  → lädt watchlistSymbols (aus useWatchlist + useDailyWatchlist)
  → berechnet matchedSymbols pro Event
  → übergibt an EconomicEventDetail via Props

EconomicEventDetail (erweitert)
  → prüft Sichtbarkeitsbedingung (impact / matchedSymbols)
  → Button-Klick → POST /api/ai/calendar-impact
  → Request-Body: { eventName, country, impactLevel, actual, forecast, previous, watchlistSymbols }
  → Streaming-Response → Echtzeit-Text-Aufbau im UI

POST /api/ai/calendar-impact (NEU)
  → Auth-Check (Supabase Session)
  → Liest AI-Provider + API-Key via getAnthropicClient()
  → Baut fokussierten 3-Punkte-Prompt
  → Streamt Antwort als ReadableStream (Text/plain)
```

---

### Datenhaltung

| Was | Wo |
|-----|----|
| Event-Daten | Props — bereits aus Kalender-State |
| Watchlist-Symbole | Props — bereits von KalenderContent übergeben |
| Matched Symbols | Props — bereits berechnet |
| KI-Antwort | Nur im React-State (kein Cache, kein DB-Speicher) |
| AI-Provider / API-Key | Supabase `user_ai_settings` — bestehende Tabelle |

**Kein neuer Supabase-Table.** Kein localStorage-Cache (Frische > Performance, bewusste Entscheidung).

---

### Neue API Route

**Route:** `POST /api/ai/calendar-impact`

Analog zu `POST /api/ai/calendar-event-analysis` — identische Infrastruktur:
- Zod-Validierung des Request-Body
- Supabase Auth-Check
- `getAnthropicClient()` für Provider + API-Key
- ReadableStream mit SSE-Streaming

**Prompt-Fokus:** Exakt die drei Fragen aus der Spec:
1. Bedeutung des Events (spezifisch auf Actual/Forecast-Werte bezogen)
2. Watchlist-Relevanz (welche Assets betroffen und warum — mit konkreter Begründung)
3. Was der Trader beachten sollte (Reaktionsmuster, konkrete Hinweise)

**Unterschied zur bestehenden Route:**
- Kein Trade-Statistik-Input (der ist für die neue Analyse nicht relevant)
- Kein Caching-Write zurück an DB
- Kürzeres, direkteres Antwortformat (≤ 400 Tokens)
- Timeout: 30 Sekunden

---

### UI-Zustände der Watchlist-Impact-Sektion

| Zustand | Anzeige |
|---------|---------|
| `idle` | Button "KI-Analyse: Auswirkung auf meine Watchlist" mit Sparkle-Icon |
| `loading` | Button deaktiviert + Spinner + Label "Analysiere…" |
| `streaming` | Button verschwindet, Streaming-Text erscheint im dunklen Bereich |
| `done` | Vollständiger Text + kleiner "Neu analysieren"-Link rechts unten |
| `error` | Fehlermeldung im Streaming-Bereich (kein leerer State) |

---

### Technische Entscheidungen

| Entscheidung | Begründung |
|-------------|------------|
| Inline im EconomicEventDetail statt eigene Komponenten-Datei | Datei ist bereits das richtige Boundary für diese Logik; zweite Sektion ist analog zu bestehender KI-Briefing-Sektion |
| Neue Route `/api/ai/calendar-impact` statt Erweiterung bestehender Route | Andere Prompt-Struktur, kein Cache-Write, anderer Response-Scope — saubere Trennung |
| Kein Cache | Watchlist und Event-Daten können sich ändern; Frische ist für Trading-Entscheidungen wichtiger als Ladezeit |
| Filterlogik client-seitig | Alle Daten (impact, matchedSymbols) sind bereits als Props vorhanden — kein extra API-Call nötig |
| Max 400 Tokens | Fokussierte 3-Punkte-Analyse, kein allgemeines Briefing — kürzer = schneller bis zum ersten Token |

---

### Abhängigkeiten / Pakete

Keine neuen Pakete notwendig. Alle Infrastruktur-Bausteine existieren bereits:
- `getAnthropicClient` aus `ai-client.ts`
- `createServerSupabaseClient` aus `supabase-server.ts`
- Streaming-Muster aus `calendar-event-analysis/route.ts`
- Sparkle/Brain-Icons aus `lucide-react` (bereits installiert)
