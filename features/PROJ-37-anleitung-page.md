# PROJ-37: Anleitung (Permanente App-Erklärungsseite)

## Status: Planned
**Created:** 2026-05-09
**Last Updated:** 2026-05-09

## Dependencies
- Requires: PROJ-1 (Auth) — Seite ist nur für eingeloggte User sichtbar
- Requires: PROJ-18 (Sidebar) — Navigation-Eintrag in der Sidebar

## User Stories
- As a new user, I want a permanent guide page so that I can understand every feature of the app at any time
- As a returning user, I want to look up how a specific feature works so that I don't have to guess or experiment
- As a user who completed onboarding, I want the guide to stay accessible from the navigation so that I can reference it later
- As a user, I want the guide structured step-by-step like the onboarding so that I can follow it in order if I'm new
- As a user on mobile, I want the guide to be easy to read and scroll through so that I can use it on the go

## Page Structure (Sections in order)
1. **Erste Schritte** — Profil, Konto, Strategie, API Key, Watchlist, Risk Management
2. **Trading Journal** — Trade erfassen, Felder erklären, Screenshot hochladen, Trade bearbeiten
3. **Dashboard** — KPIs verstehen, Equity Curve, Tagesplan, Weekly Prep
4. **KI-Analyse** — Wie funktioniert die KI, API Key vorausgesetzt, Analyse aufrufen
5. **Risk Management** — Regeln einrichten, Warnungen verstehen, Prop-Firm-Regeln
6. **Performance & Statistik** — Statistiken lesen, Filter nutzen, Exportieren
7. **Knowledge Base** — PDFs hochladen, KI-Kontext, Dateien verwalten
8. **Wochenvorbereitung** — Weekly Prep Card, KI-Marktausblick
9. **Benachrichtigungen** — Push-Notifications einrichten
10. **Einstellungen** — Alle Tabs im Überblick

## Acceptance Criteria
- [ ] Route `/anleitung` existiert und ist nur für authentifizierte User zugänglich
- [ ] Seite ist in der Desktop-Sidebar unter einem eigenen Eintrag (z.B. mit "BookOpen"-Icon, Label "Anleitung") verlinkt
- [ ] Seite ist in der Mobile-Navigation erreichbar (z.B. über "Mehr"-Bereich oder direkt als Nav-Item)
- [ ] Jede Sektion hat eine klare H2-Überschrift und ist mit einem Anchor-Link anspringbar
- [ ] Sections sind als Akkordeon oder Scroll-Abschnitte umgesetzt (kein endloser Fließtext)
- [ ] Jede Sektion enthält: Was ist das?, Wozu dient es?, Schritt-für-Schritt-Anleitung (nummerierte Liste)
- [ ] Links innerhalb der Anleitung führen direkt zu den beschriebenen Seiten (Deep Links)
- [ ] "Zurück nach oben"-Link am Ende jeder Sektion (oder sticky TOC auf Desktop)
- [ ] Seite ist auf Mobile (375px) gut lesbar: ausreichend Zeilenabstand, keine horizontalen Scrollbars
- [ ] Seite wird statisch gerendert (kein API-Call beim Laden) — reiner Content

## Edge Cases
- User ist nicht eingeloggt → Redirect zu `/login`
- User kommt über Onboarding-Link auf Anleitung → kein spezieller Zustand nötig, normale Seite
- Inhalte werden outdated wenn Features sich ändern → Hinweis im Code-Kommentar, kein automatischer Mechanismus
- Mobile: lange Code-Beispiele oder Tabellen → nicht enthalten; nur Text + nummerierte Listen

## Technical Requirements
- Route: `src/app/(app)/anleitung/page.tsx`
- Statische Seite: kein `use client`, kein Data Fetching — reiner JSX-Content
- Sidebar-Eintrag: in `src/components/layout/Sidebar.tsx` (Desktop) und `src/components/layout/BottomNav.tsx` (Mobile)
- Optional: Inhaltsverzeichnis als sticky aside auf Desktop (lg:grid-cols-[200px_1fr])
- Styling: Konsistent mit App-Design (dunkles Theme, `--fg-1/2/3`, `--brand-blue`)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
