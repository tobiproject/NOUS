# PROJ-38: Wirtschaftskalender (Custom Design)

## Status: Planned
**Created:** 2026-05-10
**Last Updated:** 2026-05-10

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
