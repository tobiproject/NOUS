# PROJ-42 — Kalender: KI-Analyse "Auswirkung auf meine Watchlist"

**Status:** Planned  
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

1. `/architecture` — Tech-Design: Prompt-Struktur, Filterlogik für Button-Sichtbarkeit, Streaming-Implementierung
2. `/frontend` — UI-Integration in `EconomicEventDetail.tsx`, Streaming-Komponente
3. `/backend` — API Route `/api/ai/calendar-impact`
4. `/qa` — Tests gegen Acceptance Criteria
5. `/deploy` — Deploy auf Vercel
