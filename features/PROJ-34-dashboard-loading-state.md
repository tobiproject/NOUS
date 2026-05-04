# PROJ-34 — Dashboard Loading State (kein Flash)

**Status:** Planned  
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
