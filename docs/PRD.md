# Product Requirements Document — Trade OS

## Vision

Trade OS ist das zentrale Betriebssystem für professionelle und semi-professionelle Trader. Es ersetzt fragmentierte Excel-Tabellen, rudimentäre Journal-Apps und isolierte Analyse-Tools durch eine einzige, KI-gestützte Plattform, die jeden Aspekt des Trading-Alltags abdeckt: von der Trade-Erfassung über Risiko-Management bis hin zu personalisierten KI-Coachings.

Das Ziel ist nicht nur Dokumentation — sondern aktive Verbesserung des Traders. Jeder erfasste Trade liefert Datenpunkte, die das System nutzt, um Muster zu erkennen, Fehler zu identifizieren und konkrete Handlungsempfehlungen zu geben.

## Target Users

**Primär: Semi-professioneller Retail-Trader**
- Tradet täglich oder mehrmals wöchentlich (FX, Indices, Crypto, Futures)
- Nutzt prop-firm Konten (FTMO, MyForexFunds, etc.) parallel zu eigenem Kapital
- Hat grundlegendes technisches Verständnis, aber keine Softwareentwicklungs-Kenntnisse
- Pain Points: Kein konsistentes Journal, kein Überblick über Fehler, emotionale Entscheidungen nicht trackbar, Statistiken fehlen komplett

**Sekundär: Professioneller Trader / Trading Coach**
- Mehrere Konten / Strategien parallel
- Benötigt tiefe Statistiken und Auswertungen
- Möchte Schüler oder Studenten mit eigenem Account verwalten (Coach-Rolle, späteres Feature)

**Tertiär: Einsteiger mit Lernfokus**
- Nutzt primär den Lernmodus und Quiz-Features
- Baut Discipline und Prozess auf

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Auth & Multi-Account System | Planned |
| P0 (MVP) | Dashboard (Zentrale Übersicht) | Planned |
| P0 (MVP) | Trading Journal (Core) | Planned |
| P0 (MVP) | Risk Management System | Planned |
| P0 (MVP) | Performance & Statistik | Planned |
| P1 | KI-Analyse Engine | Planned |
| P1 | News-Integration & Analyse | Planned |
| P1 | Backup & Export | Planned |
| P2 | Lernmodus (Replay, Quiz, KI-Coach) | Planned |
| P2 | Automatisierung & Smart Features | Planned |
| P3 | Social Trading & Gamification | Planned |
| P1 | Onboarding Checklist (Dashboard) | Planned |
| P1 | Anleitung (Permanente App-Erklärungsseite) | Planned |

## Success Metrics

- **Retention:** 60%+ der Nutzer loggen mindestens 3 Trades/Woche nach 30 Tagen
- **Journal Completion Rate:** 80%+ der Trades enthalten Setup-Typ, Emotion und Screenshot
- **KI-Engagement:** 50%+ der Nutzer lesen KI-Feedback nach jedem Trade
- **Risk-Disziplin:** Nutzer, die Risk-Warnungen erhalten, übertreten das Limit seltener als beim Onboarding
- **NPS:** ≥ 50 nach 90-tägiger Nutzung

## Tech Stack

| Schicht | Technologie | Begründung |
|---------|-------------|------------|
| Frontend | Next.js 16 (App Router), TypeScript | SSR, SEO, starkes Ökosystem, Vercel-nativ |
| Styling | Tailwind CSS + shadcn/ui | Schnelle Iteration, konsistentes Design-System |
| Backend | Supabase (PostgreSQL + Auth + Storage) | Row Level Security, Realtime, eingebettete Auth, kein separater Backend-Server nötig |
| KI | Anthropic Claude API (claude-sonnet-4-6) | Beste qualitative Analyse, Streaming-Support, Tool-Use für strukturiertes Feedback |
| Hosting | Vercel | Nahtlose Next.js-Integration, Edge Functions |
| State | React Context + TanStack Query | Server-State-Caching, optimistische Updates |
| Validierung | Zod + react-hook-form | End-to-End Type Safety |
| Charts | Recharts | Leichtgewichtig, React-nativ, gut anpassbar |
| Export | jsPDF + Papa Parse | PDF und CSV Export ohne Server-Overhead |

## Design-Prinzipien

- **Dark Mode First:** Schwarzer Hintergrund (#0a0a0a), weiße Schrift, keine Mischung aus runden und eckigen Boxen
- **Einheitliche Box-Sprache:** Alle Cards verwenden `rounded-lg` (8px), kein Mix mit `rounded-full`
- **Dichte Information:** Dashboard zeigt viele KPIs ohne Scrollen — kompakte, klare Layouts
- **Farb-Semantik:** Grün = Profit/Gut, Rot = Verlust/Warnung, Blau/Indigo = Neutral/Info
- **Mobile-Aware:** Responsive, aber Desktop-first (Trader arbeiten primär am PC)

## Architektur-Prinzipien

- **API-First:** Alle Datenoperationen über Supabase RPC oder REST — kein direkter DB-Zugriff im Frontend
- **Row Level Security (RLS):** Jeder Nutzer sieht nur seine eigenen Daten — erzwungen auf DB-Ebene
- **Modular:** Jedes Feature ist ein eigenständiges Modul — Features können deaktiviert werden
- **Skalierbar:** Multi-Tenant von Beginn an (user_id auf allen Tabellen)

## Constraints

- Solo-Entwickler oder kleines Team (1–2 Personen)
- Kein dediziertes Backend-Team → Supabase als BaaS
- Budget: Bootstrapped, kein Enterprise-Budget
- Timeline: MVP in 8–12 Wochen

## Non-Goals (v1)

- Automatischer Broker-Import via Live-API (Metatrader, Interactive Brokers) — zu viel Infrastruktur
- Mobile Native App (iOS/Android) — Web-first
- Social Feed / öffentliche Profile — nach MVP
- Backtesting-Engine — separates Produkt
- Live-Charts mit Broker-Daten — kein Real-time Data Provider im Scope
