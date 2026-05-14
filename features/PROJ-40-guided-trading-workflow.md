# PROJ-40 · Guided Trading Workflow (Roter Faden)

**Status:** Architected  
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

---

## Tech Design (Solution Architect)

**Erstellt:** 2026-05-14  
**Status:** Architected

### Überblick

Das Widget lebt als neue Karte im bestehenden `DashboardContent`. Der Fortschritt wird in einer neuen Supabase-Tabelle gespeichert — damit er gerät-übergreifend synchron ist (AC-20). Die meisten Schritte werden automatisch erkannt, indem ein neuer API-Endpunkt die bereits vorhandenen Tabellen (Trades, Daily Plans, Morning Briefings, Weekly Prep) auswertet. Nur für Seitenbesuche (Kalender, Performance) und den manuellen "Trade vorbereiten"-Schritt wird ein leichtes Tracking hinzugefügt.

---

### Komponenten-Struktur

```
DashboardContent (bestehend)
+-- GuidedWorkflowWidget (NEU)
    +-- WorkflowHeader
    |   +-- Titel "Deine Trading-Woche"
    |   +-- Fortschrittsanzeige "3 / 8 Schritte"
    |   +-- WorkflowProgressBar
    +-- WorkflowStepList
    |   +-- WorkflowStep (×8, wiederholt)
    |       +-- StepIcon  (grün-Haken / blau-Pfeil / grau-Uhr / rot-X)
    |       +-- StepLabel + Kategorie-Badge (Wöchentlich / Täglich / Pro Trade)
    |       +-- StepStatusBadge ("Erledigt" / "Aktiv" / "Verpasst" / "Offen")
    |       +-- CalendarWarningInline  (nur bei Kalender-Schritt)
    |       +-- StepActionButton  (nur beim jeweils nächsten offenen Schritt)
    +-- ResetButton "Neue Woche starten"
```

**Mobile-Kollaps (EC-7):** Auf kleinen Bildschirmen kollabieren erledigte Schritte zu einem einzeiligen Zusammenfassungs-Chip ("5 erledigt ✓") — nur der aktive Schritt und offene Schritte bleiben voll sichtbar.

---

### Datenmodell

**Neue Tabelle: `workflow_state`**  
Speichert nur das, was nicht aus vorhandenen Tabellen ableitbar ist.

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `id` | UUID | Primärschlüssel |
| `user_id` | UUID | Besitzer (RLS) |
| `account_id` | UUID | Aktives Konto |
| `week_iso` | Text | ISO-Woche z.B. `"2026-W21"` |
| `visited_kalender_at` | Timestamp | Letzter Kalender-Besuch |
| `visited_performance_at` | Timestamp | Letzter Performance-Besuch |
| `trade_prepared_at` | Timestamp | Manuell bestätigt "Trade vorbereitet" |
| `reset_at` | Timestamp | Zeitpunkt des letzten Resets |
| `updated_at` | Timestamp | Auto-Update |

RLS: Jeder Nutzer liest und schreibt nur seine eigenen Zeilen.

**Auto-Erkennungs-Quellen (keine neuen Tabellen nötig):**

| Schritt | Woher kommt die Info |
|---------|---------------------|
| Wochenvorbereitung | Bestehende `weekly_plans`-Tabelle: Eintrag für aktuelle ISO-Woche vorhanden? |
| Morning Briefing | Bestehende `morning_briefings`-Tabelle: Eintrag für heute? |
| Tagesplan | Bestehende `daily_plans`-Tabelle: Eintrag für heute? |
| Trade geloggt | Bestehende `trades`-Tabelle: Mindestens ein Trade mit `entry_date = heute`? |
| Trade analysiert | Bestehende `trades`-Tabelle: Trade von heute hat `ai_analysis` gesetzt? |
| Wirtschaftskalender | Aus `workflow_state.visited_kalender_at` (Seitenbesuch-Tracking) |
| Wochen-Review | Aus `workflow_state.visited_performance_at` (Seitenbesuch-Tracking) |
| Trade vorbereiten | Aus `workflow_state.trade_prepared_at` (manueller Klick) |

---

### API-Endpunkte

**`GET /api/workflow/progress`**  
Aggregiert den kompletten Wochen-Status in einem Aufruf. Fragt alle oben genannten Tabellen ab, kombiniert die Ergebnisse und gibt ein einheitliches Fortschritts-Objekt zurück. Beinhaltet auch die Kalender-Warnung (High-Impact Events für Watchlist-Assets heute).

**`POST /api/workflow/visit`**  
Schreibt einen Seitenbesuch in `workflow_state`. Wird von den Seiten `/kalender` und `/performance` im Hintergrund aufgerufen, sobald die Seite lädt. Payload: `{ step: "kalender" | "performance" }`.

**`POST /api/workflow/manual-step`**  
Markiert den manuellen Schritt "Trade vorbereiten" als erledigt. Payload: `{ step: "trade_prepared" }`.

**`POST /api/workflow/reset`**  
Setzt `workflow_state` für die aktuelle Woche zurück (löscht Timestamps, setzt neue `week_iso`). Wird vom Reset-Button und automatisch durch die Reset-Logik ausgelöst.

---

### Reset-Logik

1. **Automatisch (bevorzugt):** Beim Laden des Widgets wird geprüft, ob die gespeicherte `week_iso` kleiner ist als die aktuelle ISO-Woche. Falls ja → automatischer Reset auf neue Woche.
2. **Push-Benachrichtigung:** Der bestehende Cron-Job aus PROJ-26 (`/api/cron/weekly-reminder`) bekommt einen zusätzlichen Schritt: er ruft `/api/workflow/reset` für alle betroffenen Nutzer auf.
3. **Manuell:** Button "Neue Woche starten" ruft `POST /api/workflow/reset` direkt auf.

---

### Neuer Hook

**`useWorkflowProgress`**  
Kapselt alle API-Aufrufe für das Widget. Nutzt TanStack Query für Caching (30s Stale-Time — kein Echtzeit-Update nötig).  
Gibt zurück: Liste der Schritte mit jeweiligem Status, Gesamtfortschritt, Kalender-Warnung, Reset-Funktion.

---

### Seitenbesuche tracken

Kleine, nicht-blockierende Ergänzung in `/kalender` und `/performance`:  
Beim Mounten der Seite wird `POST /api/workflow/visit` im Hintergrund abgefeuert (fire-and-forget, kein Fehler beim User wenn es fehlschlägt).

---

### Verpasste Schritte (EC-5)

Tages-Schritte (Morning Briefing, Tagesplan, Kalender) gelten als "verpasst" wenn das jeweilige `entry_date` kleiner als heute ist und kein Eintrag vorhanden ist — aber **kein blocking**, der Workflow läuft weiter. Verpasste Schritte erscheinen grau mit "Verpasst"-Badge.

---

### Kalender-Warnung (AC-13/14)

Der `GET /api/workflow/progress`-Endpunkt prüft beim Laden: Gibt es in den heutigen Kalender-Events (`economic_events`-Tabelle) High-Impact Ereignisse für Assets, die in der Watchlist des Nutzers stehen? Das Ergebnis wird inline im Kalender-Schritt angezeigt.

---

### Tech-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| Eigene `workflow_state`-Tabelle | Nur für das, was nirgendwo sonst gespeichert wird (Seitenbesuche, manueller Schritt) — minimale DB-Last |
| Aggregierender GET-Endpunkt | Ein Aufruf statt 7 parallele Queries im Frontend — einfacher, weniger Netzwerk-Overhead |
| TanStack Query mit 30s Cache | Kein Echtzeit nötig; verhindert unnötige Re-Fetches beim Dashboard-Scroll |
| ISO-Woche als `week_iso` | Eindeutig, unabhängig von Zeitzonen-Grenzfällen; einfach zu vergleichen |
| Seitenbesuch fire-and-forget | Fehlschlag darf UX nicht blockieren (EC-4 analog) |

---

### Abhängigkeiten (keine neuen Pakete nötig)

Alle benötigten Pakete (Supabase, TanStack Query, Tailwind, shadcn/ui) sind bereits installiert. Keine neuen Dependencies.

---

### Nicht in Scope (v1)

- Streak-Tracking über mehrere Wochen
- Push-Benachrichtigung wenn Schritt seit X Stunden nicht erledigt
- Konfigurierbares Hinzufügen/Entfernen von Schritten
