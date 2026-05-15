# PROJ-44 — Watchlist: Allgemein vs. Heutige Trading-Watchlist

**Status:** Architected  
**Erstellt:** 2026-05-15  
**Feature-ID:** PROJ-44  
**Abhängigkeiten:** PROJ-23 (Watchlist), PROJ-33 (Watchlist per Konto), PROJ-39 (Tagesplan), PROJ-38 (Wirtschaftskalender)

---

## Vision

Der Nutzer arbeitet mit zwei klar getrennten Watchlist-Konzepten:

1. **Allgemeine Watchlist** (bereits vorhanden, PROJ-23/33): Persistente Liste von Assets, die der Trader dauerhaft beobachtet — z. B. ES, NQ, EUR/USD. Bleibt unverändert bestehen.

2. **Heutige Trading-Watchlist** (NEU): Tagesaktuelle Liste der Assets, auf die sich der Trader heute aktiv fokussiert. Wird täglich neu befüllt (oder vom Vortag übernommen, falls nicht geändert). Erscheint prominent im Tagesplan.

Das Ziel ist ein klarer mentaler Unterschied zwischen "ich beobachte das immer" und "das trade ich heute". Die heutige Watchlist dient als Filter und Fokus-Tool — sie steuert u. a. die Hervorhebungen im Wirtschaftskalender.

---

## User Stories

**US-1 — Heutige Watchlist befüllen**  
Als Trader möchte ich im Tagesplan per Symbol-Picker aus meiner allgemeinen Watchlist auswählen, welche Assets ich heute aktiv traden will, damit ich fokussiert in den Tag starte.

**US-2 — Heutige Watchlist anzeigen**  
Als Trader möchte ich auf der Tagesplan-Seite auf einen Blick sehen, welche Assets ich heute auf dem Radar habe, ohne durch die vollständige allgemeine Watchlist scrollen zu müssen.

**US-3 — Tagesreset**  
Als Trader möchte ich, dass die heutige Watchlist automatisch auf den nächsten Tag zurückgesetzt wird, wobei mir optional angeboten wird, die gestrige Auswahl zu übernehmen.

**US-4 — Wirtschaftskalender-Filter**  
Als Trader möchte ich, dass der Wirtschaftskalender zuerst die Einträge der heutigen Watchlist hervorhebt (und erst als Fallback die allgemeine Watchlist verwendet), damit relevante News sofort erkennbar sind.

**US-5 — Allgemeine Watchlist bleibt unberührt**  
Als Trader möchte ich, dass meine allgemeine Watchlist (PROJ-23/33) weiterhin unverändert funktioniert — die neue heutige Watchlist ist eine Ergänzung, keine Ersetzung.

**US-6 — Tab-Wechsel in der Watchlist-Seite**  
Als Trader möchte ich auf der bestehenden Watchlist-Seite zwischen "Allgemein" und "Heute" wechseln können, um beide Listen in einem Ort verwalten zu können.

---

## Datenbankschema

### Neue Tabelle: `daily_watchlist`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | `uuid` (PK, default gen_random_uuid()) | Primärschlüssel |
| `user_id` | `uuid` (FK → auth.users, NOT NULL) | Besitzer des Eintrags |
| `account_id` | `uuid` (FK → accounts, NOT NULL) | Konto, zu dem der Eintrag gehört |
| `symbol` | `text` (NOT NULL) | Asset-Symbol, z. B. "ES", "EUR/USD" |
| `date` | `date` (NOT NULL) | Das Datum, für das die Auswahl gilt |
| `created_at` | `timestamptz` (default now()) | Erstellungszeitpunkt |

**Constraints:**
- Unique Constraint auf `(user_id, account_id, symbol, date)` — kein doppeltes Symbol pro Tag und Konto
- RLS aktivieren: Nutzer sieht und verändert nur eigene Zeilen (`user_id = auth.uid()`)

**Migration:** Neue Migration-Datei `supabase/migrations/YYYYMMDD_daily_watchlist.sql`

---

## API-Routen

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/daily-watchlist` | GET | Holt die heutige Watchlist für das aktive Konto (`date = today`) |
| `/api/daily-watchlist` | POST | Fügt ein Symbol zur heutigen Watchlist hinzu |
| `/api/daily-watchlist/[id]` | DELETE | Entfernt ein Symbol aus der heutigen Watchlist |
| `/api/daily-watchlist/copy-yesterday` | POST | Kopiert die gestrige Auswahl auf das heutige Datum |

Alle Routen erfordern eine aktive Session und filtern nach `user_id` aus der Session.

---

## Hook

**`useDaily Watchlist.ts`** (neu, analog zu `useWatchlist.ts`):
- Lädt die heutige Watchlist per Datum und Konto
- Bietet Funktionen: `addSymbol`, `removeSymbol`, `copyFromYesterday`
- Gibt `todaySymbols: string[]` zurück für einfache Nutzung in anderen Komponenten

---

## UI-Beschreibung

### Tagesplan-Seite (`/tagesplan`)

**Neuer Abschnitt "Heutige Trading-Watchlist"** (oberhalb oder neben dem Tagesplan-Content):

- Zeigt die für heute ausgewählten Symbole als Chips/Badges an (z. B. grün umrandet)
- Symbol-Picker: Dropdown oder Multi-Select, der nur Symbole aus der allgemeinen Watchlist anzeigt
- Hinzufügen per Klick auf ein Symbol im Picker; Entfernen per X-Icon auf dem Chip
- Falls keine heutige Watchlist existiert: Banner "Noch keine Auswahl für heute — von gestern übernehmen?" mit einem Button
- Leer-Zustand: Aufforderung, Symbole aus der allgemeinen Watchlist auszuwählen

### Watchlist-Seite (`/watchlist`)

**Tab-Navigation** oben auf der Seite:
- Tab 1: "Allgemein" — bestehende Watchlist-Funktionalität (PROJ-23/33), unverändert
- Tab 2: "Heute" — zeigt und verwaltet die heutige Trading-Watchlist; selber Symbol-Picker wie im Tagesplan

### Wirtschaftskalender (`/wirtschaftskalender`)

- Bestehende Hervorhebungs-Logik wird angepasst: prüft zuerst, ob ein Kalender-Asset in der **heutigen** Watchlist ist; falls ja, wird es mit höherer Priorität hervorgehoben
- Als Fallback (kein Eintrag in heutiger Watchlist) wird wie bisher die allgemeine Watchlist verwendet
- Keine UI-Änderung nötig — nur Logik-Update in der Kalender-Komponente

---

## Acceptance Criteria

| # | Kriterium | Testbar |
|---|-----------|---------|
| AC-1 | Nutzer kann im Tagesplan Symbole aus seiner allgemeinen Watchlist zur heutigen Watchlist hinzufügen | Manuell / E2E |
| AC-2 | Nutzer kann Symbole aus der heutigen Watchlist entfernen | Manuell / E2E |
| AC-3 | Die heutige Watchlist ist datumsbezogen — Einträge eines anderen Tages erscheinen nicht | Unit Test |
| AC-4 | "Von gestern übernehmen" kopiert alle gestrigen Symbole auf das heutige Datum | Unit Test + Manuell |
| AC-5 | Die allgemeine Watchlist (PROJ-23/33) funktioniert unverändert weiter | Regression Test |
| AC-6 | Auf der Watchlist-Seite gibt es zwei Tabs (Allgemein / Heute), Tab-Wechsel funktioniert | Manuell |
| AC-7 | RLS ist aktiv: Nutzer A kann nicht die heutige Watchlist von Nutzer B sehen | Security Test |
| AC-8 | Der Wirtschaftskalender hebt Assets der heutigen Watchlist bevorzugt hervor | Manuell |
| AC-9 | Kein Symbol erscheint doppelt in der heutigen Watchlist (Unique Constraint greift) | Unit Test |
| AC-10 | Die heutige Watchlist ist konto-spezifisch (account_id) | Manuell |
| AC-11 | Mobile und Desktop funktionieren gleich (Mobile/Desktop-Parity-Regel) | Manuell |

---

## Edge Cases

- **Leere allgemeine Watchlist:** Symbol-Picker zeigt Hinweis "Füge zuerst Assets zur allgemeinen Watchlist hinzu"
- **Kein Konto ausgewählt:** API-Aufruf wird blockiert; UI zeigt Konto-Auswahl-Hinweis
- **Doppeltes Hinzufügen:** Unique Constraint auf DB-Ebene + UI-seitiges Deaktivieren bereits ausgewählter Symbole
- **Datumswechsel um Mitternacht:** Seite lädt automatisch das neue Datum; alte Einträge bleiben in der DB erhalten (History)

---

## Nicht im Scope (v1)

- Automatisches Carry-Over ohne User-Aktion (der Nutzer entscheidet aktiv)
- Benachrichtigungen wenn ein Symbol der heutigen Watchlist eine News-Meldung hat
- Sortierung oder Priorisierung innerhalb der heutigen Watchlist
- Statistiken über die Treffsicherheit der heutigen Auswahl (späteres Feature)

---

## Tech Design (Solution Architect)

### Komponentenbaum

```
/watchlist (bestehend, erweitert)
+-- WatchlistTabs (NEU — Tab-Navigation)
    +-- Tab "Allgemein" → bestehende Watchlist-Komponenten (PROJ-23/33, unverändert)
    +-- Tab "Heute" → DailyWatchlistPanel (NEU)
        +-- DailySymbolChips (Anzeige als Badges mit X-Icon)
        +-- DailySymbolPicker (Dropdown — nur Symbole aus allg. Watchlist)
        +-- CopyYesterdayBanner (wenn heute noch leer)

/tagesplan (bestehend, erweitert)
+-- DailyWatchlistSection (NEU — eigener Abschnitt)
    +-- DailySymbolChips (wiederverwendet)
    +-- DailySymbolPicker (wiederverwendet)
    +-- CopyYesterdayBanner (wiederverwendet)

/kalender (bestehend)
+-- KalenderContent (bestehend)
    └── Hervorhebungs-Logik (UPDATE — prüft zuerst daily_watchlist,
        dann allgemeine Watchlist als Fallback)
```

### Datenmodell

Neue Tabelle `daily_watchlist`: Jeder Eintrag = ein Symbol, das ein Nutzer für einen bestimmten Tag auf einem Konto beobachtet. Felder: User-ID, Konto-ID, Symbol-Text, Datum, Zeitstempel. Unique-Constraint auf (user_id, account_id, symbol, date) verhindert Duplikate. RLS: Nutzer sieht nur eigene Zeilen.

Speicherort: Supabase (nicht localStorage) — für geräteübergreifende Synchronisation und Kalender-Integration.

### Neue API-Endpunkte

| Endpunkt | Zweck |
|----------|-------|
| `GET /api/daily-watchlist` | Heutige Symbole für aktives Konto |
| `POST /api/daily-watchlist` | Symbol hinzufügen |
| `DELETE /api/daily-watchlist/[id]` | Symbol entfernen |
| `POST /api/daily-watchlist/copy-yesterday` | Gestrige Auswahl übernehmen |

### Neuer Hook

`useDailyWatchlist` — analog zu `useWatchlist.ts`. Lädt heutige Symbole, bietet addSymbol / removeSymbol / copyFromYesterday, gibt `todaySymbols: string[]` zurück.

### Betroffene Dateien

**Neu:**
- `supabase/migrations/…_daily_watchlist.sql`
- `src/app/api/daily-watchlist/route.ts`
- `src/app/api/daily-watchlist/[id]/route.ts`
- `src/app/api/daily-watchlist/copy-yesterday/route.ts`
- `src/hooks/useDailyWatchlist.ts`
- `src/components/watchlist/DailyWatchlistPanel.tsx`
- `src/components/watchlist/DailySymbolChips.tsx`
- `src/components/watchlist/DailySymbolPicker.tsx`
- `src/components/watchlist/CopyYesterdayBanner.tsx`

**Geändert:**
- `src/app/(app)/watchlist/page.tsx` — Tab-Navigation
- `src/app/(app)/tagesplan/page.tsx` — DailyWatchlistSection
- `src/components/calendar/KalenderContent.tsx` — Fallback-Hervorhebungslogik

### Keine neuen npm-Packages nötig

---

## Next Steps

1. ~~`/architecture`~~ — Tech-Design: ✅ Done
2. `/frontend` — UI-Implementierung: Tagesplan-Abschnitt, Watchlist-Tabs, Symbol-Picker
3. `/backend` — Supabase-Migration, API-Routen, RLS-Policies, Hook
4. `/qa` — Tests gegen alle Acceptance Criteria + Security Audit (RLS)
5. `/deploy` — Vercel Deploy + Production Checks
