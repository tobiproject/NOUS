# PROJ-38: Wirtschaftskalender (Custom Design)

## Status: Planned
**Created:** 2026-05-10
**Last Updated:** 2026-05-10

## Kontext
Das bisherige Investing.com-Widget auf /kalender passt nicht zum App-Design (fremde Schriftart, fremder Hintergrund, nicht steuerbar). Ziel: Wirtschaftsdaten live abrufen und im NOUS-Design darstellen.

## Dependencies
- Requires: PROJ-1 (Auth) — nur für eingeloggte User

## User Stories
- As a trader, I want to see upcoming economic events in the NOUS design so that it looks and feels like the rest of the app
- As a trader, I want to filter events by impact level (High/Medium/Low) so that I can focus on what matters
- As a trader, I want to see events in my local timezone so that I don't have to convert times manually
- As a trader, I want to see the previous, forecast, and actual values for each event so that I can assess the impact
- As a trader, I want to filter by currency (USD, EUR, GBP etc.) so that I only see relevant markets

## Acceptance Criteria
- [ ] /kalender zeigt Wirtschaftsereignisse im NOUS-Design (kein Iframe, kein Widget)
- [ ] Ereignisse zeigen: Zeit, Währung/Land, Ereignisname, Impact-Level (🔴🟡⚪), Vorwert, Prognose, Aktuell
- [ ] Filter: Impact-Level (High/Medium/Low), Währung (USD, EUR, GBP, JPY, CHF, AUD, CAD)
- [ ] Zeitzone des Users wird automatisch berücksichtigt
- [ ] Daten werden mindestens 1x täglich aktualisiert (kein Echtzeit-Requirement)
- [ ] Ansicht: aktuelle Woche, nächste Woche wählbar
- [ ] Mobile-tauglich: kompakte Darstellung, gut lesbar

## Edge Cases
- Keine Daten verfügbar → leerer Zustand mit Hinweis
- API nicht erreichbar → Fallback auf gecachte Daten vom Vortag
- Event findet heute statt → visuell hervorgehoben (z.B. fetter Text, Linie für aktuelle Zeit)

## Offene Fragen (für /architecture)
- Welche API liefert die Daten? (Trading Economics, Forex Factory API, Alpha Vantage, eigene Scraping-Lösung?)
- Wie oft werden Daten gecacht? (Supabase-Tabelle vs. Next.js cache)
- Brauchen wir eine eigene Supabase-Tabelle oder reicht Next.js unstable_cache?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
