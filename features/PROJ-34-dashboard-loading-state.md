# PROJ-34 — Dashboard Loading State (kein Flash)

**Status:** In Review  
**Created:** 2026-05-04  
**Dependencies:** PROJ-2 (Dashboard)

---

## Overview

Das Dashboard zeigt beim ersten Laden kurz einen leeren Zustand ("keine aktiven Trades") bevor die Daten geladen sind. Das soll durch einen sauberen Skeleton-State ersetzt werden.

---

## User Stories

1. Als Nutzer öffne ich das Dashboard und sehe sofort ein Skeleton-Layout, statt eines leeren Zustands.
2. Als Nutzer sehe ich nie den Text "keine aktiven Trades" während die Daten noch laden.
3. Als Nutzer erlebe ich einen flüssigen Übergang von Skeleton zu echten Daten.

---

## Acceptance Criteria

- [ ] Während `loading === true`: Skeleton-Komponenten statt echter Daten und leerer Zustände
- [ ] "Keine aktiven Trades" und ähnliche Empty States erscheinen NUR wenn `loading === false && data.length === 0`
- [ ] Skeleton-Design passt zum Dark-Theme (bg-3 Farbe, animated shimmer)
- [ ] Kein Layout-Shift beim Übergang von Skeleton zu Daten
- [ ] Gilt für alle Dashboard-Sektionen: KPI-Cards, offene Trades, letzte Einträge

---

## Edge Cases

- Sehr langsame Verbindung → Skeleton bleibt sichtbar, kein Timeout-Fehler
- Fehler beim Laden → Error-State mit Retry-Button statt Skeleton
- Schnelle Verbindung → Skeleton kurz sichtbar, kein Flicker

---

## Tech Notes

- shadcn `<Skeleton>` Komponente ist bereits installiert
- Prüfen welche Dashboard-Komponenten `isLoading` bereits als Prop akzeptieren
- Conditional rendering: `{isLoading ? <Skeleton /> : data.length === 0 ? <EmptyState /> : <Data />}`

---

## QA Test Results — 2026-05-04

**Tester:** QA Engineer  
**Status: READY — alle Kriterien bestanden, keine Bugs**

### Acceptance Criteria

| # | Kriterium | Status |
|---|-----------|--------|
| 1 | Während `loading === true`: Skeleton-Komponenten statt echter Daten | ✅ PASS |
| 2 | "Keine aktiven Trades" erscheint NUR wenn `loading === false && data.length === 0` | ✅ PASS (zeigt null, nicht leeren Zustand) |
| 3 | Skeleton-Design passt zum Dark-Theme (bg-3, animated shimmer) | ✅ PASS (shadcn Skeleton) |
| 4 | Kein Layout-Shift beim Übergang von Skeleton zu Daten | ✅ PASS (gleiche Grid-Struktur) |
| 5 | Gilt für KPI-Cards, offene Trades, letzte Einträge | ✅ PASS (alle drei Sektionen abgedeckt) |

**Bestanden: 5/5**

### Implementation Notes
- `accountLoading === true` → vollständiger Skeleton-Block
- `isLoading === true` (nach accountLoading) → per-Sektion-Skeletons für KPI-Row, Chart+Strategy, RecentTrades
- Greeting-Sektion (Datum, Name) rendert sofort — keine Datenbankabfrage nötig, korrekt
- `DailyPlanCTA`, `WeeklyPrepCard`, `InsightsPreview` haben eigene Loading-States

### No Bugs Found
