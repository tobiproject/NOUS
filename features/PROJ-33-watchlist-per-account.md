# PROJ-33 — Watchlist per Konto

**Status:** In Review  
**Created:** 2026-05-04  
**Dependencies:** PROJ-23 (Watchlist), PROJ-1 (Auth & Multi-Account)

---

## Overview

Die Watchlist ist aktuell global (pro User). Sie soll kontoabhängig werden: Jedes Konto hat seine eigene Watchlist. Beim Kontowechsel wechselt die Watchlist automatisch mit.

Migration: Bestehende Einträge werden dem zuletzt aktiven Konto zugewiesen.

---

## User Stories

1. Als Nutzer mit mehreren Konten habe ich pro Konto eine eigene Watchlist, damit ich z.B. auf Prop-Firm-Konto andere Assets tracke als auf meinem Eigenhandels-Konto.
2. Als Nutzer wechsle ich das Konto und die Watchlist aktualisiert sich automatisch ohne Reload.
3. Als Nutzer sehe ich in der Watchlist immer nur die Assets des aktuell aktiven Kontos.
4. Als Nutzer werden meine bestehenden Watchlist-Einträge beim ersten Start dem aktiven Konto zugewiesen.

---

## Acceptance Criteria

- [ ] Supabase-Tabelle `watchlist_items` erhält Spalte `account_id` (uuid, NOT NULL, FK → accounts.id)
- [ ] RLS: Nutzer sieht nur Items, bei denen `account_id` zu einem seiner Konten gehört
- [ ] API `GET /api/watchlist` filtert nach `account_id` des aktiven Kontos (via Header oder Query-Param)
- [ ] API `POST /api/watchlist` setzt `account_id` automatisch auf das aktive Konto
- [ ] `useWatchlist` Hook akzeptiert `accountId` und lädt neu wenn sich der Account ändert
- [ ] Migration: bestehende Items ohne `account_id` werden dem ersten aktiven Konto des Users zugewiesen
- [ ] Watchlist-Stern (gelb) in Sidebar/BottomNav ist ebenfalls kontoabhängig
- [ ] Beim Kontowechsel: Watchlist-Stern aktualisiert sich sofort

---

## Edge Cases

- Konto ohne Watchlist-Einträge → leere Liste, kein Fehler
- Konto wird gelöscht → zugehörige Watchlist-Items werden mit gelöscht (CASCADE)
- Kein aktives Konto gesetzt → API gibt leere Liste zurück
- Gleiches Asset auf zwei Konten → kein Konflikt, beide existieren unabhängig
- Migration: User hat noch kein Konto → Items bleiben unzugewiesen bis Konto angelegt

---

## Tech Notes

- DB Migration: `ALTER TABLE watchlist_items ADD COLUMN account_id uuid REFERENCES accounts(id) ON DELETE CASCADE`
- Bestehende Zeilen: `UPDATE watchlist_items SET account_id = (SELECT id FROM accounts WHERE user_id = watchlist_items.user_id LIMIT 1)`
- RLS Policy muss um account_id-Join erweitert werden
- `useWatchlist` Hook: Dependency auf `activeAccount.id`, re-fetch bei Wechsel
- `watchlist-changed` Custom Event bleibt, wird aber kontoabhängig gefeuert

---

## QA Test Results — 2026-05-04

**Tester:** QA Engineer  
**Status: NOT READY — 2 High, 1 Medium (Security)**

### Acceptance Criteria

| # | Kriterium | Status |
|---|-----------|--------|
| 1 | `watchlist_items` erhält Spalte `account_id` (uuid, FK → accounts.id) | ⚠️ NICHT VERIFIZIERBAR (nur zur Laufzeit prüfbar) |
| 2 | RLS: Nutzer sieht nur Items, bei denen account_id zu einem seiner Konten gehört | ⚠️ NICHT VERIFIZIERBAR |
| 3 | API GET filtert nach account_id des aktiven Kontos | ✅ PASS (`?account_id=` wird korrekt gefiltert) |
| 4 | API POST setzt account_id automatisch auf das aktive Konto | ✅ PASS |
| 5 | `useWatchlist` akzeptiert accountId und lädt neu bei Account-Wechsel | ✅ PASS |
| 6 | Migration: bestehende Items werden dem ersten aktiven Konto zugewiesen | ⚠️ NICHT VERIFIZIERBAR |
| 7 | Watchlist-Stern in Sidebar/BottomNav ist kontoabhängig | ❌ FAIL — aktualisiert nur wenn Watchlist-Seite gemountet ist |
| 8 | Beim Kontowechsel: Watchlist-Stern aktualisiert sich sofort | ❌ FAIL — abhängig von Seite/Kontext |

**Bestanden: 3/5 verifizierbarer Kriterien**

### Bugs

**HIGH — useWatchlist ohne accountId in Komponenten außerhalb der Watchlist-Seite**
- Betroffene Dateien:
  - `src/components/journal/TradeFormSheet.tsx:440` — `useWatchlist()` ohne accountId
  - `src/components/watchlist/AssetCombobox.tsx:33` — `useWatchlist()` ohne accountId
  - `src/components/watchlist/AssetMultiPicker.tsx:32` — `useWatchlist()` ohne accountId
- Folge: Beim Hinzufügen eines Trades oder Auswählen eines Assets sieht der Nutzer alle Watchlist-Items über alle Konten — nicht nur die des aktiven Kontos.
- Reproduktion: Zwei Konten anlegen, Watchlists unterschiedlich befüllen → Trade-Formular öffnen

**HIGH — Sidebar/BottomNav Watchlist-Stern wird nicht kontoabhängig aktualisiert**
- Der `watchlist-changed` Event wird nur durch `useWatchlist` gefeuert, das nur auf der Watchlist-Seite oder in Journal/Asset-Komponenten gemountet ist.
- Wenn der Nutzer auf dem Dashboard das Konto wechselt, zeigt der Stern den falschen Zustand aus localStorage — erst bei nächstem Besuch der Watchlist-Seite korrekt.
- Reproduktion: Konto A (hat Watchlist-Items) → Konto B (leer) wechseln auf Dashboard → Stern bleibt gelb

**MEDIUM (Security) — account_id in POST /api/watchlist nicht validiert**
- Datei: `src/app/api/watchlist/route.ts:61`
- Die `account_id` aus dem Request-Body wird nicht verifiziert, ob sie dem authentifizierten Nutzer gehört.
- Ein Angreifer könnte Items einer fremden Account-ID zuordnen. Die `user_id` ist korrekt gesetzt, aber die Datenbankintegrität ist gefährdet wenn RLS nicht vollständig greift.
- Fix: Vor dem Insert prüfen: `SELECT id FROM accounts WHERE id = account_id AND user_id = user.id`

---

## QA Re-Test — 2026-05-04 (nach Fixes)

**Fixes geprüft:**
- ✅ FIXED — TradeFormSheet: `useWatchlist(activeAccount?.id)` ✅
- ✅ FIXED — AssetCombobox: `useWatchlist(activeAccount?.id)` ✅
- ✅ FIXED — AssetMultiPicker: `useWatchlist(activeAccount?.id)` ✅
- ✅ FIXED — BottomNav: nutzt jetzt `useWatchlist(activeAccount?.id)` direkt (kein localStorage mehr)
- ✅ FIXED — API POST: account_id wird gegen `accounts WHERE user_id = user.id` validiert
- ❌ STILL OPEN — AppSidebar: noch altes localStorage/event-Pattern

**Status: NOT READY — 1 High bug verbleibend**

| # | Kriterium | Status |
|---|-----------|--------|
| 7 | Watchlist-Stern in **BottomNav** kontoabhängig | ✅ PASS (gefixt) |
| 7 | Watchlist-Stern in **AppSidebar** kontoabhängig | ❌ FAIL — noch localStorage-basiert |
| 8 | Stern aktualisiert sich sofort beim Kontowechsel | ❌ FAIL — AppSidebar noch nicht gefixt |

**Verbleibender Bug (HIGH):**
- `src/components/layout/AppSidebar.tsx:206-219` — `hasWatchlistItems` via `localStorage.getItem('nous-watchlist-has-items')` + `watchlist-changed` Event
- Fix analog zu BottomNav: `useWatchlist(activeAccount?.id)` direkt verwenden, `hasWatchlistItems = watchlistItems.length > 0`

---

## QA Final — 2026-05-04 (AppSidebar Fix)

- ✅ FIXED — AppSidebar nutzt jetzt `useWatchlist(activeAccount?.id)` direkt (localStorage entfernt)
- ✅ Stern auf Desktop aktualisiert sich sofort beim Kontowechsel

**Verbleibende offene Punkte:** Keine High/Medium Bugs mehr.  
**Status: APPROVED** — bereit für Deploy.
