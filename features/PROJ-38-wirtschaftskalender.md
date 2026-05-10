# PROJ-38: Wirtschaftskalender (Custom Design)

## Status: Deployed
**Created:** 2026-05-10
**Last Updated:** 2026-05-10

## Implementation Notes (Frontend)
- Iframe + Investing.com link completely removed from `/kalender`
- New component tree: `KalenderContent` → `CountdownBanner` + `KalenderWeekNav` + `KalenderFilterBar` + `EconomicEventList` → `EconomicEventRow` → `EconomicEventDetail`
- Supabase migration applied: `economic_events` table + `calendar_filters` JSONB column on `profiles`
- `fast-xml-parser` installed for server-side RSS parsing
- `src/lib/calendar-fetcher.ts`: shared utility used by both cron and manual refresh routes
- Cron route `GET /api/cron/fetch-economic-events` added to `vercel.json` (Mo–Sa 07:00 UTC)
- Client-side auto-refresh: on page load checks for past events with null actuals → triggers `/api/calendar/refresh`
- Timezone: events displayed in user's local browser timezone via `Intl.DateTimeFormat`
- Filter state persisted in `profiles.calendar_filters` via `/api/calendar/filters`
- Trade indicators: server-side JOIN on trades ±30min window per event
- KI analysis: POST `/api/ai/calendar-event-analysis` with watchlist context (non-streaming, returns full text)

## Kontext
Das bisherige Investing.com-Widget auf `/kalender` passt nicht zum App-Design (fremde Schriftart, fremder Hintergrund, nicht steuerbar). Ziel: Makro-ökonomische Wirtschaftsdaten (CPI, NFP, Zinsentscheide, PMI usw.) live abrufen, in Supabase cachen und vollständig im NOUS-Design darstellen — kein Iframe, kein Widget, keine externen Abhängigkeiten im Frontend.

## Dependencies
- Requires: PROJ-1 (Auth) — nur für eingeloggte User
- Requires: PROJ-23 (Watchlist) — für KI-Analyse-Personalisierung
- Requires: PROJ-3 (Trading Journal) — für Trade-Indikator neben Events
- Optional: PROJ-26 (Push Notifications) — für High-Impact Event Alerts

---

## User Stories

- Als Trader möchte ich Wirtschaftsereignisse im NOUS-Design sehen, damit der Kalender wie der Rest der App aussieht und sich anfühlt.
- Als Trader möchte ich Events nach Impact-Level (High/Medium/Low) und Land/Region filtern, damit ich nur sehe was für meine Märkte relevant ist.
- Als Trader möchte ich die Uhrzeit in meiner lokalen Zeitzone sehen, damit ich keine manuelle Zeitumrechnung machen muss.
- Als Trader möchte ich Previous-, Forecast- und Actual-Werte sehen und sofort erkennen ob ein Event besser oder schlechter als erwartet war.
- Als Trader möchte ich einen Countdown zum nächsten High-Impact Event sehen, damit ich nie überrascht werde.
- Als Trader möchte ich ein Event aufklappen und eine KI-Analyse bekommen, die mir erklärt wie das Ergebnis meine Watchlist-Assets beeinflusst.
- Als Trader möchte ich sehen ob ich zur Zeit eines Events einen Trade hatte, damit ich Zusammenhänge zwischen Nachrichten und meinen Trades erkenne.
- Als Trader möchte ich frei zwischen Wochen navigieren, damit ich sowohl aktuelle als auch vergangene Events analysieren kann.
- Als Trader möchte ich meine Filter-Einstellungen gespeichert haben, damit ich sie nicht bei jedem Besuch neu setzen muss.
- Als Trader möchte ich Push-Benachrichtigungen 30 Minuten vor High-Impact Events bekommen, damit ich vorbereitet in den Trade gehe.

---

## Acceptance Criteria

### Kalender-Ansicht (Hauptseite /kalender)
- [ ] Seite zeigt Wirtschaftsereignisse als vertikale Liste, nach Wochentag gruppiert
- [ ] Jede Event-Zeile zeigt: Impact-Dot (🔴🟡⚪) | Uhrzeit (lokale TZ) | Flagge + Währungskürzel | Event-Name | Previous | Forecast | Actual
- [ ] Actual-Wert erscheint farbig: grün wenn besser als Forecast, rot wenn schlechter, neutral wenn gleich oder noch ausstehend
- [ ] Impact-Dots: 🔴 = High, 🟡 = Medium, ⚪ = Low — visuell klar unterscheidbar
- [ ] Wochennavigation: `< KW 19  12.–18. Mai  >` mit `[Heute]`-Button zum direkten Rückspringen
- [ ] Rote horizontale Linie (mit Zeitanzeige) trennt vergangene von zukünftigen Events in der aktuellen Woche
- [ ] Vergangene Events (Zeit überschritten) werden leicht ausgegraut dargestellt
- [ ] Wochenende (Sa/So) wird angezeigt, aber visuell gedimmt/kompakter da meist ereignisleer
- [ ] Heute-Abschnitt ist beim ersten Laden automatisch in den Viewport gescrollt

### Countdown-Banner
- [ ] Oben auf der Seite: "Nächstes High-Impact Event: USD NFP in 2h 15min" — nur sichtbar wenn heute noch ein High-Impact Event bevorsteht
- [ ] Banner verschwindet automatisch wenn kein High-Impact Event mehr heute kommt
- [ ] Klick auf Banner scrollt zur entsprechenden Event-Zeile

### Filter
- [ ] Filter-Bar mit: Impact (High / Medium / Low — einzeln togglebar) + Land/Region (alle verfügbar aus Forex Factory, inkl. Rohstoff-Reports wie EIA Oil, USDA, COT)
- [ ] Filter-Zustand wird in der DB gespeichert (profiles Tabelle) — bleibt beim nächsten Öffnen aktiv, sync über Geräte
- [ ] Aktive Filter sind klar als "aktiv" markiert (gefüllter Button)
- [ ] "Alle Filter zurücksetzen"-Option verfügbar

### Event-Detail (Inline-Expand)
- [ ] Klick auf eine Event-Zeile klappt einen Detail-Bereich direkt darunter auf
- [ ] Detail zeigt:
  - Vollständiger Event-Name + Kurzbeschreibung was dieses Event misst
  - Betroffene Assets als Tags (z.B. "USD-Paare", "Gold", "US Treasuries")
  - Historische Tabelle: letzte 6 Releases mit Datum / Previous / Forecast / Actual
  - Verwandte Trades aus dem Journal: Trades ±30 Minuten um den Event-Zeitpunkt (falls vorhanden)
- [ ] KI-Analyse-Button: "Mit KI analysieren" — generiert personalisierten Text basierend auf Event-Ergebnis und User's Watchlist-Assets
- [ ] KI-Analyse läuft als Streaming-Text (wie andere KI-Features in NOUS)
- [ ] KI-Kontext enthält: Event-Name, Actual vs. Forecast-Wert, User's aktuelle Watchlist-Assets

### Trade-Indikator
- [ ] Wenn der User im ±30-Minuten-Fenster um einen Event-Zeitpunkt einen Trade hatte: kleines Journal-Icon 📊 neben dem Event-Namen
- [ ] Hover/Tap auf das Icon zeigt: "EUR/USD Long, +2.4R — 14:32"
- [ ] Indikator funktioniert für vergangene Events

### Daten & Caching
- [ ] Datenquelle: Forex Factory RSS Feed — täglich morgens per Cron in Supabase-Tabelle `economic_events` gespeichert
- [ ] Beim Öffnen der Seite: Client prüft ob vergangene Events der aktuellen Woche fehlende Actual-Werte haben → löst automatisch API-Refresh aus (keine manuelle Aktion nötig)
- [ ] Daten für angeforderte Woche werden aus Supabase geladen (nicht live von Forex Factory)
- [ ] Letztes Fetch-Datum wird angezeigt ("Daten vom 12. Mai 09:15")

### Push-Benachrichtigungen
- [ ] In Einstellungen neue Option: "High-Impact Events — Benachrichtigung 30min vorher"
- [ ] Nutzt bestehende Push-Infrastruktur aus PROJ-26
- [ ] Nur aktiv wenn User Push-Benachrichtigungen grundsätzlich erlaubt hat

### Mobile
- [ ] Event-Zeilen als kompakte einzeilige Darstellung ohne Zeilenumbruch
- [ ] Filter-Bar horizontal scrollbar auf Mobile
- [ ] Detail-Expand funktioniert auf Mobile (kein Drawer, inline wie Desktop)

---

## Edge Cases

- **Forex Factory nicht erreichbar** → Fallback auf letzte gecachte Daten in Supabase; Hinweis "Daten vom [Datum]"
- **Event ohne Forecast** → Forecast-Spalte zeigt "—"
- **Event noch ausstehend** → Actual-Spalte zeigt "—" (kein Farbindikator)
- **Kein Trade im ±30min-Fenster** → kein Icon, keine leere Spalte
- **Woche ohne Events** (Feiertage, dünn besetzte Woche) → leerer Zustand: "Diese Woche keine Events für die gesetzten Filter"
- **Alle Filter deaktiviert** → "Keine Filter aktiv — alle Events werden angezeigt" oder Hinweis "Mindestens einen Filter aktivieren"
- **KI-Analyse bei fehlendem API-Key** → Hinweis wie bei anderen KI-Features: "API-Key in Einstellungen hinterlegen"
- **Event hat Actual-Wert aber keinen Forecast** → kein Farbindikator, Actual plain anzeigen
- **Mehrere Events zur selben Zeit** → untereinander in der Liste, selbe Zeitzeile kann mehrere haben
- **User navigiert in weit vergangene Woche** → Daten vorhanden wenn je gecacht, sonst Hinweis + Option "Daten für diese Woche laden"

---

## Technische Hinweise (für /architecture)

- Datenquelle: Forex Factory RSS (`https://nfs.faireconomy.media/ff_calendar_thisweek.xml` und `nextweek.xml`)
- Supabase-Tabelle `economic_events` — shared für alle User (Event-Daten sind nicht userspezifisch)
- Userspezifisch: Filter-Präferenzen in `profiles.calendar_filters` (JSONB)
- Keine neue Supabase-Tabelle für Filter nötig — in bestehendem `profiles`-Record speichern
- KI-Analyse: POST an `/api/ai/calendar-event-analysis` mit Event-Daten + User's Watchlist als Kontext
- Trade-Indikator: Query auf `trades`-Tabelle WHERE `entry_time BETWEEN event_time - 30min AND event_time + 30min`
- Timezone: Zeiten aus Forex Factory sind in US/Eastern — muss in User-Timezone (aus `profiles.notification_timezone`) konvertiert werden
- Cron für morgendliches Laden: Neuer Eintrag in `vercel.json` (einmal täglich, Mo–Fr)
- Client-seitiger Actual-Refresh: Beim Seitenload prüfen ob `actual IS NULL` für vergangene Events der aktuellen Woche → GET `/api/calendar/refresh` triggern

---

## Tech Design (Solution Architect)

### Übersicht
Der bestehende `/kalender`-Seite mit Investing.com-iframe wird vollständig ersetzt. Die neue Lösung besteht aus drei Teilen: einem täglichen Daten-Pipeline (Cron), einer Supabase-Tabelle als Cache, und einer vollständig eigenen UI im NOUS-Design.

Daten werden einmal täglich von Forex Factory geladen und in Supabase gespeichert. Alle User lesen aus demselben Cache — Eventdaten sind global, nicht userspezifisch. Nur Filter-Einstellungen und Trade-Indikatoren sind pro User.

---

### Komponenten-Struktur

```
/kalender (Seite)
+-- KalenderContent (Haupt-Wrapper, fetcht Events + Filter)
    +-- CountdownBanner
    |     "Nächstes High-Impact Event: USD NFP in 2h 15min"
    |     (nur sichtbar wenn heute noch High-Impact Events kommen)
    +-- KalenderWeekNav
    |     < KW 19  12.–18. Mai  >  [Heute]
    +-- KalenderFilterBar
    |   +-- ImpactFilter (High / Medium / Low — einzeln togglebar)
    |   +-- CurrencyFilter (USD, EUR, GBP ... — horizontal scrollbar)
    |   +-- ResetButton ("Filter zurücksetzen")
    +-- EconomicEventList
        +-- DaySection (pro Wochentag, Sa/So gedimmt)
        |   +-- DayHeader ("Montag, 12. Mai")
        |   +-- [CurrentTimeRule] — rote Linie mit Uhrzeit (nur heute)
        |   +-- EconomicEventRow (pro Event)
        |       +-- ImpactDot (🔴 High  🟡 Medium  ⚪ Low)
        |       +-- TimeLabel (lokale User-Timezone)
        |       +-- CountryFlag + CurrencyBadge (z.B. 🇺🇸 USD)
        |       +-- EventName + [TradeIndicatorIcon 📊 wenn Trade ±30min]
        |       +-- PreviousValue | ForecastValue | ActualValue
        |       -- [aufgeklappt] EconomicEventDetail
        |           +-- EventDescription (was misst dieses Event)
        |           +-- AffectedAssetTags (z.B. "USD-Paare", "Gold")
        |           +-- HistoricalReleaseTable (letzte 6 Releases)
        |           +-- RelatedTradesList (Trades ±30min, falls vorhanden)
        |           +-- KiAnalysisSection
        |                 [Button "Mit KI analysieren"]
        |                 → Streaming-Text (wie andere KI-Features)
        +-- EmptyState ("Keine Events für diese Woche und Filter")
```

---

### Datenmodell

**Neue Supabase-Tabelle: `economic_events`**
(global, kein `user_id` — Eventdaten gehören allen Usern)

```
Jedes Wirtschaftsereignis hat:
- Interne ID (UUID)
- Forex Factory Event-ID (für Upserts bei Updates)
- Datum
- Uhrzeit in UTC (konvertiert aus US/Eastern bei Import)
- Währungskürzel (z.B. "USD", "EUR")
- Länderkürzel für Flagge (z.B. "US", "EU")
- Impact-Level ("High", "Medium", "Low")
- Event-Name (z.B. "Non-Farm Payrolls")
- Actual-Wert (Text, leer bis zur Veröffentlichung)
- Forecast-Wert (Text, kann leer sein)
- Previous-Wert (Text, kann leer sein)
- Zeitstempel des letzten Fetches
```

**Erweiterung bestehende `profiles`-Tabelle:**
- Neues JSONB-Feld `calendar_filters` — speichert aktive Impact-Level und Währungen  
  Beispiel: `{ "impact": ["High", "Medium"], "currencies": ["USD", "EUR", "GBP"] }`

---

### Backend-Komponenten (neue API-Routen)

| Route | Zweck |
|-------|-------|
| `GET /api/calendar/events` | Events für angeforderte Woche aus Supabase + User's Trade-Indikatoren |
| `GET /api/calendar/refresh` | Frischer Abruf von Forex Factory für aktuelle Woche (für veraltete Actual-Werte) |
| `GET /api/calendar/filters` | User's gespeicherte Filter-Präferenzen lesen |
| `PATCH /api/calendar/filters` | User's Filter-Präferenzen speichern |
| `POST /api/ai/calendar-event-analysis` | Streaming KI-Analyse für ein Event (mit Watchlist-Kontext) |
| `GET /api/cron/fetch-economic-events` | Täglicher Daten-Import von Forex Factory (Vercel Cron) |
| `GET /api/cron/economic-event-alerts` | 30-min Push-Benachrichtigungen vor High-Impact Events |

---

### Datenpipeline (Cron-Strategie)

**Täglicher Import** (Vercel Cron, Mo–Sa um 07:00 UTC):
1. Ruft Forex Factory RSS für aktuelle Woche und nächste Woche ab
2. Parsed XML → extrahiert alle Events
3. Konvertiert Zeiten von US/Eastern → UTC
4. Upsert in `economic_events` (Event-ID als Schlüssel, bestehende Actual-Werte werden überschrieben wenn neu vorhanden)

**Client-seitiger Actual-Refresh** (bei Seitenaufruf):
- Frontend prüft: Hat die aktuelle Woche vergangene Events mit leerem Actual-Wert?
- Wenn ja → triggert automatisch `GET /api/calendar/refresh`
- Kein manueller Button nötig

**Push-Benachrichtigungen** (neuer Cron, alle 30 min Mo–Fr während Handelszeiten):
- Prüft welche High-Impact Events in den nächsten 25–35 Minuten stattfinden
- Sendet Push an User, die High-Impact Alerts aktiviert haben
- Nutzt bestehende Push-Infrastruktur aus PROJ-26

---

### Technologie-Entscheidungen

| Entscheidung | Gewählt | Warum |
|-------------|---------|-------|
| Datenquelle | Forex Factory RSS (`nfs.faireconomy.media`) | Kostenlos, kein API-Key, strukturierte XML-Daten |
| Datenspeicherung | Supabase `economic_events` | Global gecacht, kein Forex Factory Hit pro User-Request |
| Filter-Persistenz | `profiles.calendar_filters` JSONB | Keine neue Tabelle nötig, sync über Geräte |
| Timezone-Konvertierung | Server-seitig bei Import + Client für Anzeige | Saubere UTC-Speicherung, flexible Darstellung |
| Trade-Indikator | Server-seitig in `/api/calendar/events` | Kein separater Client-Request, User-Trades bleiben server-seitig |
| KI-Analyse | Streaming POST, gleich wie andere KI-Features | Konsistenz mit Rest der App |
| Aktualisierung der Actual-Werte | Client-triggered Refresh bei Seitenload | Einfach, zuverlässig, kein Polling |

---

### RLS (Row Level Security)

- `economic_events`: **Öffentlich lesbar für alle eingeloggten User** — kein `user_id` Filter nötig (globale Daten)
- Schreibzugriff nur via Service-Role (Cron-Jobs)
- `profiles.calendar_filters`: bereits durch bestehende RLS abgedeckt

---

### Neue Abhängigkeiten

| Paket | Zweck |
|-------|-------|
| `fast-xml-parser` | XML-Parsing des Forex Factory RSS Feeds (server-seitig) |
| `date-fns-tz` | Timezone-Konvertierung US/Eastern ↔ UTC ↔ User-TZ (wahrscheinlich bereits installiert) |

---

### Betroffene bestehende Dateien

| Datei | Änderung |
|-------|---------|
| `src/app/(app)/kalender/page.tsx` | Iframe entfernen, `KalenderContent` einbinden |
| `vercel.json` | Zwei neue Cron-Einträge (täglicher Import + Push-Alerts) |
| `src/app/api/notifications/settings/route.ts` | Neue Option "High-Impact Event Alerts" |

## QA Test Results

**Date:** 2026-05-10
**Tester:** /qa (Claude)
**Status:** In Review — All bugs fixed, ready for re-verification

### Acceptance Criteria Results

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Seite zeigt Ereignisse als vertikale Liste, nach Wochentag gruppiert | ✅ Pass |
| 2 | Event-Zeile zeigt Impact-Dot, Uhrzeit, Flagge, Name, Previous, Forecast, Actual | ✅ Pass |
| 3 | Actual-Wert erscheint farbig (grün/rot) | ✅ Pass |
| 4 | Impact-Dots visuell klar unterscheidbar | ✅ Pass |
| 5 | Wochennavigation + [Heute]-Button | ✅ Pass |
| 6 | Rote horizontale Linie trennt vergangene von zukünftigen Events | ✅ Pass |
| 7 | Vergangene Events ausgegraut | ✅ Pass |
| 8 | Wochenende gedimmt/kompakter | ✅ Pass |
| 9 | Heute-Abschnitt auto-scrolled beim Laden | ✅ Pass |
| 10 | Countdown-Banner mit High-Impact Event + Countdown | ✅ Pass |
| 11 | Banner verschwindet wenn kein Event mehr heute | ✅ Pass |
| 12 | Klick auf Banner scrollt zur Event-Zeile | ❌ Fail (BUG-5) |
| 13 | Filter-Bar: Impact + Land/Region togglebar | ✅ Pass |
| 14 | Filter-Zustand in DB gespeichert | ✅ Pass |
| 15 | Aktive Filter visuell als aktiv markiert | ✅ Pass |
| 16 | "Filter zurücksetzen"-Option | ✅ Pass |
| 17 | Klick klappt Detail-Bereich auf | ✅ Pass |
| 18 | Detail: Event-Name + Kurzbeschreibung was Event misst | ❌ Fail (BUG-4) |
| 19 | Detail: Betroffene Assets als Tags | ✅ Pass |
| 20 | Detail: Historische Tabelle letzte 6 Releases | ❌ Fail (BUG-3) |
| 21 | Detail: Verwandte Trades aus Journal (±30min) | ✅ Pass |
| 22 | KI-Analyse-Button vorhanden | ✅ Pass |
| 23 | KI-Analyse läuft als Streaming-Text | ❌ Fail (BUG-2) |
| 24 | KI-Kontext enthält Watchlist-Assets | ✅ Pass |
| 25 | Trade-Indikator Icon neben Event-Namen | ✅ Pass |
| 26 | Hover/Tap zeigt Trade-Details (Asset, RR, Uhrzeit) | ✅ Pass |
| 27 | Trade-Indikator nur für vergangene Events | ✅ Pass |
| 28 | Forex Factory RSS + täglicher Cron in vercel.json | ✅ Pass |
| 29 | Client-seitiger Auto-Refresh bei fehlenden Actuals | ✅ Pass |
| 30 | Daten aus Supabase geladen (nicht live von FF) | ✅ Pass |
| 31 | Letztes Fetch-Datum wird angezeigt | ✅ Pass |
| 32 | Push-Einstellungs-Option "High-Impact Alerts" | ❌ Fail (BUG-6) |
| 33 | Nutzt bestehende Push-Infrastruktur (PROJ-26) | ❌ Fail (BUG-6) |
| 34 | Nur aktiv wenn User Push erlaubt hat | ❌ Fail (BUG-6) |
| 35 | Mobile: kompakte einzeilige Event-Zeilen | ✅ Pass |
| 36 | Filter-Bar horizontal scrollbar auf Mobile | ✅ Pass |
| 37 | Detail-Expand inline (kein Drawer) auf Mobile | ✅ Pass |

**Total: 30 passed / 7 failed (37 criteria)**

---

### Bugs Found

#### BUG-1 — High: Timezone DST-Fehler (alle Event-Zeiten um 1h falsch Mai–Nov)
- **Severity:** High
- **File:** `src/lib/calendar-fetcher.ts` → `easternToUtc()` (Zeile 35)
- **Problem:** `new Date(`${combined} EST`)` verwendet immer UTC-5 (EST). Währen Eastern Daylight Time (April–November, aktuell aktiv) müsste UTC-4 (EDT) genutzt werden. Alle Event-Zeiten sind von April bis November **1 Stunde zu früh** angezeigt.
- **Steps to reproduce:** Öffne Kalender während EDT-Periode (Mai-November). Vergleiche angezeigte Uhrzeit mit Forex Factory direkt.

#### BUG-2 — High: KI-Analyse nicht als Streaming (Spec-Abweichung)
- **Severity:** High
- **File:** `src/components/calendar/EconomicEventDetail.tsx` + `src/app/api/ai/calendar-event-analysis/route.ts`
- **Problem:** Spec fordert "KI-Analyse läuft als Streaming-Text (wie andere KI-Features in NOUS)". Implementiert ist ein blockierender `fetch()` → vollständiges JSON-Response. UI zeigt einen Spinner bis die gesamte Analyse fertig ist (keine Streaming-Darstellung).
- **Steps to reproduce:** Event aufklappen → "Mit KI analysieren" klicken → Text erscheint erst nach vollem Response, nicht Wort für Wort.

#### BUG-3 — High: Historische Releases-Tabelle fehlt im Event-Detail
- **Severity:** High
- **File:** `src/components/calendar/EconomicEventDetail.tsx`
- **Problem:** Spec fordert "Historische Tabelle: letzte 6 Releases mit Datum / Previous / Forecast / Actual". Diese Tabelle ist weder in der UI implementiert noch in der DB-Struktur (kein historisches Datenmodell). Das Detail zeigt nur den aktuellen Previous/Forecast/Actual.
- **Steps to reproduce:** Beliebiges Event aufklappen → keine historische Tabelle sichtbar.

#### BUG-4 — High: Event-Beschreibung fehlt im Detail (Kurzbeschreibung)
- **Severity:** High
- **File:** `src/components/calendar/EconomicEventDetail.tsx`
- **Problem:** Spec fordert "Vollständiger Event-Name + Kurzbeschreibung was dieses Event misst" im Detail. Keine Beschreibung ist implementiert oder in der DB gespeichert.
- **Steps to reproduce:** Beliebiges Event aufklappen → kein Erklärungstext zum Event.

#### BUG-5 — High: Countdown-Banner Scroll-to-Event funktioniert nicht
- **Severity:** High
- **File:** `src/components/calendar/KalenderContent.tsx` (Zeile 31–35) + `src/components/calendar/EconomicEventRow.tsx`
- **Problem:** `KalenderContent.handleScrollToEvent()` ruft `document.getElementById(`event-${eventId}`)` auf. `EconomicEventRow` setzt aber **kein** `id`-Attribut auf seinem Root-`<div>`. Der Klick auf den Countdown-Banner scrollt daher nicht.
- **Steps to reproduce:** Warte bis Countdown-Banner für ein High-Impact Event sichtbar ist → Banner anklicken → kein Scroll passiert.
- **Fix:** In `EconomicEventRow.tsx` dem Root-`<div>` `id={`event-${event.id}`}` hinzufügen.

#### BUG-6 — High: Push-Benachrichtigungen für High-Impact Events nicht implementiert
- **Severity:** High
- **File:** `src/app/(app)/einstellungen/page.tsx` + `vercel.json`
- **Problem:** Spec fordert neue Einstellungs-Option "High-Impact Events — Benachrichtigung 30min vorher" und einen neuen Cron-Job `/api/cron/economic-event-alerts`. Weder die Settings-Option noch der Cron-Job wurden implementiert.
- **Steps to reproduce:** Einstellungen öffnen → keine High-Impact Alert Option sichtbar.

#### BUG-7 — Medium: N+1 Queries für Trade-Indikatoren
- **Severity:** Medium
- **File:** `src/app/api/calendar/events/route.ts` (Zeilen 50–77)
- **Problem:** Pro vergangenes Event mit Zeitstempel wird eine separate DB-Query auf `trades` ausgeführt. Bei einer typischen Woche mit 50+ Events = 50+ Supabase-Queries pro Page Load. Backend-Regel verletzt: "Use Supabase joins instead of N+1 query loops."
- **Fix:** Alle vergangenen Events in einem einzigen Query holen, dann client-seitig matchen oder eine Supabase RPC-Funktion nutzen.

#### BUG-8 — Medium: Alle Impact-Filter deaktiviert zeigt generische Meldung
- **Severity:** Medium
- **File:** `src/components/calendar/EconomicEventList.tsx` (Zeile 84–98)
- **Problem:** Wenn User alle 3 Impact-Filter (High/Medium/Low) deaktiviert, zeigt die leere Liste den generischen Text "Keine Events für diese Woche und die gesetzten Filter." Spec fordert spezifisch: "Mindestens einen Filter aktivieren".
- **Steps to reproduce:** High, Med, Low im Filter-Bar nacheinander ausklicken.

#### BUG-9 — Low: Unbenutzter `eventRefs` in KalenderContent
- **Severity:** Low
- **File:** `src/components/calendar/KalenderContent.tsx` (Zeile 28)
- **Problem:** `const eventRefs = useRef<Record<string, HTMLElement | null>>({})` ist deklariert aber wird nirgends genutzt oder befüllt. Dead code.

---

### Security Audit

| Check | Result |
|-------|--------|
| Auth auf allen API-Routen | ✅ Pass |
| Zod-Validierung auf POST/PATCH | ✅ Pass |
| CRON_SECRET für Cron-Endpunkt | ✅ Pass |
| RLS auf `economic_events` (authenticated SELECT, kein user_id Filter nötig da global) | ✅ Pass |
| Keine SQL-Injection (Supabase parameterized queries) | ✅ Pass |
| Keine Secrets im Frontend-Code | ✅ Pass |
| `calendar_filters` JSONB validiert via Zod vor DB-Speicherung | ✅ Pass |
| Cross-User-Data-Zugriff möglich? | ✅ Nein (Trade-Indikatoren gefiltern nach user_id) |

**Security: Keine Schwachstellen gefunden.**

---

### Automated Tests Added

- **Unit tests:** `src/components/calendar/ActualValue.test.tsx` — 7 Tests für Actual-Wert-Farb-Logik (parseNumber, Vergleich mit Forecast, Edge Cases)
- **E2E tests:** `tests/PROJ-38-wirtschaftskalender.spec.ts` — 11 Tests für Page-Struktur, Wochennavigation, Filter-Verhalten, leere Zustände, Mobile

---

### Production-Ready Decision

**✅ All bugs fixed — ready for production**

**Fixes applied (2026-05-10):**
- BUG-1 ✅ `easternToUtc()` nutzt jetzt `Intl.DateTimeFormat` mit `America/New_York` — korrekte EDT/EST-Erkennung
- BUG-2 ✅ KI-Analyse streamt jetzt (ReadableStream, `text/plain`) — Anthropic + OpenAI
- BUG-3 ✅ `GET /api/calendar/event-history` + historische Releases-Tabelle in EventDetail
- BUG-4 ✅ Static descriptions für 30+ Events in `EconomicEventDetail`
- BUG-5 ✅ `id={`event-${event.id}`}` auf EconomicEventRow Root-Div
- BUG-6 ✅ DB-Migration + API-Update + UI-Toggle in Einstellungen + Cron-Route `/api/cron/economic-event-alerts`
- BUG-7 ✅ Trade-Indikatoren werden jetzt mit einer einzigen Wochenquery geholt (kein N+1 mehr)
- BUG-8 ✅ Spezifischer Hinweis "Mindestens einen Filter aktivieren" wenn alle Impact-Filter aus
- BUG-9 ✅ Unused `eventRefs` entfernt

## Deployment

**Deployed:** 2026-05-10
**Production URL:** https://www.getnous.de/kalender
**Commit:** 6b9ac0f
**Git Tag:** v1.38.0-PROJ-38
**Rollback:** Vercel Dashboard → Deployments → previous working deployment → "Promote to Production"
