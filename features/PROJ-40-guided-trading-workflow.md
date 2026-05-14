# PROJ-40 · Guided Trading Workflow (Roter Faden)

**Status:** Planned  
**Erstellt:** 2026-05-14  
**Typ:** Frontend + Backend + DB

## Beschreibung

Dashboard-Widget das den Trader Schritt für Schritt durch seine Trading-Woche führt. Die App erkennt automatisch was bereits erledigt ist (Wochenvorbereitung generiert → ✓, Trade geloggt → ✓) und zeigt immer den nächsten offenen Schritt. Der Fortschritt setzt sich automatisch zurück, sobald die konfigurierte Wochenvorbereitung-Benachrichtigung auslöst (Zeit aus PROJ-26 Push-Notifications übernehmen).

## Workflow-Schritte (feste Reihenfolge)

### Wöchentlich (einmalig)
1. **Wochenvorbereitung** — Märkte analysieren, Woche planen (`/wochenvorbereitung`)

### Täglich (pro Handelstag)
2. **Wirtschaftskalender prüfen** — Watchlist-abhängig: Gibt es heute High-Impact Events für meine Assets? (`/kalender`)
3. **Morning Briefing** — Tagesbriefing lesen oder generieren (`/dashboard` → Morning Briefing)
4. **Tagesplan erstellen** — Konkreten Plan für den Tag anlegen (`/tagesplan`)

### Pro Trade
5. **Trade vorbereiten** — Setup prüfen, Tradingplan-Checkliste mental abhaken (manuell)
6. **Trade loggen** — Eintrag im Journal anlegen (`/journal`)
7. **Trade analysieren** — KI-Analyse für den Trade starten

### Wöchentlich (Abschluss)
8. **Wochen-Review** — Performance der Woche auswerten (`/performance`)

## User Stories

- **US-1:** Als Trader sehe ich auf dem Dashboard auf einen Blick, wo ich in meiner Trading-Woche stehe und was der nächste Schritt ist.
- **US-2:** Als Trader werden Schritte automatisch als erledigt markiert, sobald ich die entsprechende Aktion in der App durchführe — ohne manuelles Abhaken.
- **US-3:** Als Trader sehe ich beim Kalender-Schritt automatisch eine Warnung wenn heute High-Impact Events für meine Watchlist-Assets anstehen.
- **US-4:** Als Trader startet meine neue Woche automatisch mit dem Reset des Workflows — gebunden an meine konfigurierte Wochenvorbereitung-Push-Benachrichtigung.
- **US-5:** Als Trader kann ich per Klick auf einen Schritt direkt zu der entsprechenden App-Seite springen.
- **US-6:** Als Trader sehe ich den Fortschritt der Woche visuell (z.B. 3/7 Schritte erledigt).

## Acceptance Criteria

### Widget auf Dashboard
- [ ] AC-1: Widget "Deine Trading-Woche" erscheint auf dem Dashboard (unterhalb der KPIs)
- [ ] AC-2: Alle Workflow-Schritte werden in korrekter Reihenfolge angezeigt
- [ ] AC-3: Erledigte Schritte sind visuell abgehakt (✓, grün, durchgestrichen)
- [ ] AC-4: Der aktuell nächste offene Schritt ist hervorgehoben (→, blau, mit Klick-Button)
- [ ] AC-5: Fortschrittsanzeige: "X/8 Schritte erledigt" oder Fortschrittsbalken
- [ ] AC-6: Jeder Schritt ist klickbar und navigiert zur richtigen Seite

### Automatische Erkennung (Done-Logic)
- [ ] AC-7: Wochenvorbereitung → erledigt wenn `/api/ai/weekly-prep` erfolgreich aufgerufen wurde (diese Woche)
- [ ] AC-8: Morning Briefing → erledigt wenn heute ein Briefing generiert/gelesen wurde
- [ ] AC-9: Tagesplan → erledigt wenn heute ein Tagesplan-Eintrag existiert
- [ ] AC-10: Trade geloggt → erledigt wenn heute mindestens ein Trade im Journal ist
- [ ] AC-11: Trade analysiert → erledigt wenn der heutige Trade eine KI-Analyse hat
- [ ] AC-12: Wochen-Review → erledigt wenn Performance-Seite diese Woche aufgerufen wurde (session-basiert oder via DB-Flag)

### Kalender-Integration (Smart)
- [ ] AC-13: Wirtschaftskalender-Schritt zeigt automatisch "⚠ High-Impact Event heute: [Asset]" wenn ein Ereignis die Watchlist betrifft
- [ ] AC-14: Ohne relevante Ereignisse: Schritt zeigt "Keine kritischen Events heute für deine Watchlist ✓"
- [ ] AC-15: Schritt gilt als erledigt wenn Kalender-Seite heute aufgerufen wurde

### Reset-Logik
- [ ] AC-16: Workflow setzt sich automatisch zurück wenn die konfigurierte Wochenvorbereitung-Push-Zeit erreicht wird (Einstellung aus PROJ-26)
- [ ] AC-17: Falls keine Push-Zeit konfiguriert: Reset jeden Montag 06:00 Uhr (Fallback)
- [ ] AC-18: Manueller Reset-Button im Widget ("Neue Woche starten")
- [ ] AC-19: Nach Reset: Alle Schritte offen, Wochenvorbereitung als nächster Schritt hervorgehoben

### Persistenz
- [ ] AC-20: Fortschritt wird in DB gespeichert (nicht nur lokal), damit er auf allen Geräten übereinstimmt
- [ ] AC-21: Workflow-State enthält: Woche (ISO-Wochennummer), erledigte Schritte als Array, Zeitstempel

## Edge Cases

- **EC-1:** Kein Trade heute → Trade-Schritte bleiben offen, kein Fehler
- **EC-2:** Wochenvorbereitung bereits Sonntag gemacht → gilt für kommende Woche
- **EC-3:** Watchlist leer → Kalender-Schritt zeigt "Keine Assets in Watchlist — bitte zuerst Watchlist befüllen"
- **EC-4:** Kalender-API nicht erreichbar → Schritt zeigt "Kalender gerade nicht verfügbar" ohne Absturz
- **EC-5:** Trader loggt sich erst mittwochs ein → Workflow zeigt realistischen Stand (Montag/Dienstag-Schritte als verpasst markiert, nicht als blockierend)
- **EC-6:** Mehrere Trades an einem Tag → Schritt "Trade geloggt" zählt als erledigt nach dem ersten Trade
- **EC-7:** Mobile-Ansicht → Widget kollabiert zu kompakter Darstellung, bleibt voll funktional

## Dependencies

- Requires: PROJ-1 (Auth)
- Requires: PROJ-3 (Trading Journal) — für Trade-geloggt Erkennung
- Requires: PROJ-12 (Morning Briefing) — für Briefing-erledigt Erkennung
- Requires: PROJ-22 (Weekly Prep) — für Wochenvorbereitung-erledigt Erkennung
- Requires: PROJ-23 (Watchlist) — für Kalender-Asset-Abgleich
- Requires: PROJ-26 (Push Notifications) — für Reset-Zeitpunkt
- Requires: PROJ-38 (Wirtschaftskalender) — für Kalender-Daten
- Integrates: PROJ-39 (Tradingplan) — Trade-vorbereiten Schritt kann auf Tradingplan verweisen
