# PROJ-33 — Watchlist per Konto

**Status:** Planned  
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
