# PROJ-36: Onboarding Checklist (Dashboard)

## Status: Planned
**Created:** 2026-05-09
**Last Updated:** 2026-05-09

## Dependencies
- Requires: PROJ-1 (Auth & Multi-Account System) — user must be authenticated
- Requires: PROJ-2 (Dashboard) — checklist appears on dashboard
- Requires: PROJ-21 (Personalized Greeting) — Profil-Schritt prüft display_name
- Requires: PROJ-3 (Trading Journal) — Erster-Trade-Schritt
- Requires: PROJ-30 (Multi-AI Provider) — API-Key-Schritt

## User Stories
- As a new user, I want to see a checklist on my dashboard so that I know exactly what to set up first
- As a new user, I want each checklist step to link directly to the relevant settings page so that I can complete the setup without searching
- As a user who has completed onboarding, I want the checklist to disappear from my dashboard so that it no longer takes up space
- As a returning user who skipped a step, I want the checklist to stay visible until all steps are done so that I can finish setup at my own pace
- As a user completing a step, I want to see my progress update immediately so that I feel motivated to continue

## Onboarding Steps (in order)
1. **Profil einrichten** — display_name gesetzt? → `/einstellungen?tab=profil&solo=1`
2. **Konto anlegen** — mindestens 1 aktives Konto vorhanden? → `/einstellungen?tab=konten&solo=1`
3. **Strategie definieren** — strategy_name gesetzt? → `/einstellungen?tab=strategie&solo=1`
4. **API Key hinterlegen** — anthropic_api_key gesetzt? → `/einstellungen?tab=api-key&solo=1`
5. **Watchlist aufbauen** — mindestens 1 Watchlist-Eintrag vorhanden? → `/watchlist`
6. **Risk Management einrichten** — max_risk_per_trade gesetzt? → `/einstellungen?tab=konten&solo=1`
7. **Ersten Trade erfassen** — mindestens 1 Trade in der DB? → `/journal`

## Acceptance Criteria
- [ ] Checklist-Card erscheint auf dem Dashboard nur für User, die noch nicht alle 7 Schritte abgeschlossen haben
- [ ] Jeder Schritt zeigt seinen Status (erledigt ✓ / ausstehend) basierend auf tatsächlichen Datenbankwerten
- [ ] Fortschrittsbalken zeigt X/7 abgeschlossene Schritte an
- [ ] Jeder Schritt-Name ist ein klickbarer Link, der direkt zur relevanten Seite führt
- [ ] Abgeschlossene Schritte sind visuell durchgestrichen oder farblich abgesetzt (grün/gedimmt)
- [ ] Die Card verschwindet automatisch, sobald alle 7 Schritte abgeschlossen sind (kein manuelles Schließen nötig)
- [ ] Fortschritt wird bei jedem Dashboard-Laden neu berechnet — keine separate Persistierung nötig
- [ ] Card ist auf Mobile (375px) und Desktop (1440px) korrekt dargestellt
- [ ] Überschrift der Card: "Erste Schritte" oder "Einrichtung abschließen"
- [ ] Kurze motivierende Unterzeile ("Du bist fast fertig — noch X Schritte")

## Edge Cases
- User hat display_name noch nicht gesetzt (leer/null) → Schritt 1 als ausstehend markieren
- User hat ein Konto, aber es ist archiviert → Schritt 2 gilt als nicht erfüllt (nur aktive Konten zählen)
- User hat strategy_name in irgendeiner Strategie gesetzt → Schritt 3 gilt als erfüllt
- API Key vorhanden aber ungültig → Schritt gilt trotzdem als erfüllt (Validierung ist Sache des API-Key-Settings)
- Watchlist-Einträge für ein anderes (nicht-aktives) Konto → nur Einträge des aktiven Kontos zählen
- Risk Management: max_risk_per_trade auf 0 gesetzt → gilt als nicht eingerichtet
- Alle 7 Schritte am selben Tag erledigt → Card soll noch im gleichen Render verschwinden (kein Reload nötig)
- Neuer User ohne Konto → Schritte 5, 6, 7 können noch nicht erfüllt sein; keine Fehler

## Technical Requirements
- Fortschrittsberechnung via single API call `/api/onboarding/progress` (gibt `{ steps: boolean[] }` zurück)
- Keine neue DB-Tabelle nötig — Daten werden aus vorhandenen Tabellen abgefragt
- API-Route prüft: profiles.display_name, accounts (aktive), strategies, profiles.anthropic_api_key, watchlist_items, accounts.max_risk_per_trade, trades
- Performance: < 300ms für Progress-Check (parallele Supabase-Abfragen)
- Card-Komponente: `src/components/dashboard/OnboardingChecklist.tsx`
- API-Route: `src/app/api/onboarding/progress/route.ts`

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure

```
DashboardContent (existing)
+-- OnboardingChecklist (NEW — shown only when steps < 7 complete)
    +-- Card Header
    |   +-- Title: "Einrichtung abschließen"
    |   +-- Subtitle: "Du bist fast fertig — noch X Schritte"
    +-- Progress Bar (X/7 visual, uses existing shadcn Progress)
    +-- Steps List
        +-- ChecklistStep × 7
            +-- Status Icon (✓ green / circle grey)
            +-- Step Name (clickable link → settings page)
```

### Data Flow

Dashboard loads → OnboardingChecklist fetches `GET /api/onboarding/progress` → API queries 7 tables in parallel → returns `{ steps: boolean[], completedCount: number }` → component renders with live status → when all 7 true, component renders null immediately.

### Step Check Logic (plain language)

| # | Step | Check |
|---|------|-------|
| 1 | Profil einrichten | `profiles.display_name` is not empty |
| 2 | Konto anlegen | At least 1 account with `is_active = true` |
| 3 | Strategie definieren | At least 1 strategy with a name set |
| 4 | API Key hinterlegen | `profiles.anthropic_api_key` is not empty |
| 5 | Watchlist aufbauen | At least 1 watchlist item for the active account |
| 6 | Risk Management einrichten | Active account's `max_risk_per_trade` > 0 |
| 7 | Ersten Trade erfassen | At least 1 trade exists in the DB |

All 7 checks run simultaneously (parallel Supabase queries).

### Data Model

No new database table. Reads from 5 existing tables: `profiles`, `accounts`, `strategies`, `watchlist_items`, `trades`.

API response: `{ steps: boolean[7], completedCount: number }` — computed fresh on every load, no persistence.

### Tech Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Persistence | None — compute on load | Always derived from real DB state; no stale data risk |
| API calls | 1 dedicated endpoint | Clean separation; easy to optimize later |
| Internal queries | All 7 parallel | Keeps response < 300ms |
| Visibility | Computed in React render | Card disappears in same render cycle when step 7 completes |
| UI primitives | shadcn Card + Progress | Already installed, consistent with app |

### New Files

| File | Purpose |
|------|---------|
| `src/components/dashboard/OnboardingChecklist.tsx` | Checklist card component |
| `src/app/api/onboarding/progress/route.ts` | API: reads 5 tables, returns step booleans |

No new packages needed — all shadcn components (Card, Progress, Checkbox) are already installed.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
