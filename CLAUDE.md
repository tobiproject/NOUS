# Nous — Trading OS

> **App-Name:** Nous  
> **Domain:** getnous.de  
> **Slogan:** "Turn Data into Decisions"  
> **Status:** Live in Produktion  
> **Nächste freie Feature-ID:** PROJ-39

---

## Wo wir stehen

PROJ-1 bis PROJ-30 sind deployed und live auf `https://www.getnous.de`.

Bevor du mit neuen Features anfängst:
1. Lies `features/INDEX.md` — vollständige Feature-Übersicht
2. Lies `docs/PRD.md` — Vision, Zielgruppe, Roadmap
3. Nächste Feature-ID ist **PROJ-31**

---

## Produkt-Kontext

Nous ist das zentrale Betriebssystem für professionelle Trader.  
Zielgruppe: Semi-professionelle Retail-Trader (FX, Indices, Crypto, Futures).  
KI-gestützt via Anthropic Claude — jeder Nutzer bringt seinen eigenen API-Key (PROJ-30).

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (NEVER recreate installed shadcn components)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **KI:** Anthropic Claude API (claude-sonnet-4-6) + OpenAI GPT-4o (via PROJ-30)
- **Deployment:** Vercel → `https://www.getnous.de`
- **Validation:** Zod + react-hook-form
- **State:** React Context + TanStack Query

---

## Infrastruktur

| Dienst | Projekt | URL |
|--------|---------|-----|
| Vercel | nous | www.getnous.de |
| Supabase | Nous | ehevgchbbpnvxhvuuzns.supabase.co |
| GitHub | tobiproject/nous | github.com/tobiproject/nous |

---

## Development Workflow

1. `/requirements` - Feature-Spec erstellen (IMMER zuerst)
2. `/architecture` - Tech-Design (PM-lesbar, kein Code)
3. `/frontend` - UI-Komponenten (shadcn/ui first!)
4. `/backend` - APIs, Supabase, RLS
5. `/qa` - Tests gegen Acceptance Criteria + Security Audit
6. `/deploy` - Vercel Deploy + Production Checks

## Versioning (Automatisch)

**Jeder Push auf `main` erzeugt automatisch eine neue Version.**

- GitHub Action (`.github/workflows/auto-release.yml`) läuft bei jedem Push auf `main`
- Überspringt nur `chore: release`-Commits (Anti-Loop)
- Führt `npm run release` aus: bumpt Patch-Version in `package.json`, generiert `changelog.ts` aus `feat:`/`fix:`-Commits, pusht neuen Release-Commit
- Vercel deployt dann den Release-Commit → neue `NEXT_PUBLIC_APP_VERSION` (git SHA) → Update-Banner zeigt sich bei offenen Tabs
- **NIEMALS manuell `npm run release` aufrufen** — das erledigt die GitHub Action automatisch

---

## Agent-Struktur

| Agent | Rolle | Skill |
|-------|-------|-------|
| Requirements Engineer | CEO — erstellt Specs, gibt Aufgaben | `/requirements` |
| Solution Architect | Tech-Design | `/architecture` |
| Frontend Dev | UI/Komponenten | `/frontend` |
| Backend Dev | APIs, DB, Supabase | `/backend` |
| QA Engineer | Tests, Security Audit | `/qa` |
| DevOps | Deploy, Vercel | `/deploy` |
| Help | Projektstatus, Navigation | `/help` |

**Handoff-Kette:** Requirements → Architecture → Frontend → Backend → QA → Deploy

Jeder Agent sagt am Ende genau welcher nächste Schritt folgt.

---

## Key Conventions

- **Feature IDs:** PROJ-1, PROJ-2, etc. (sequenziell — nächste: PROJ-31)
- **Commits:** `feat(PROJ-X): description`, `fix(PROJ-X): description`
- **Single Responsibility:** Ein Feature pro Spec-Datei
- **shadcn/ui first:** NEVER custom versions von installierten shadcn-Komponenten
- **Human-in-the-loop:** Immer User-Approval vor nächster Phase
- **Tests:** Unit tests co-located (`useHook.test.ts`), E2E in `tests/PROJ-X-*.spec.ts`
- **RLS:** Jede neue Supabase-Tabelle braucht RLS — keine Ausnahme
- **Kein Code in Architecture Docs**

---

## Build & Test Commands

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Production server
npm test             # Vitest unit/integration tests
npm run test:e2e     # Playwright E2E tests
npm run test:all     # Both test suites
```

---

## Projektstruktur

```
src/
  app/              Pages (Next.js App Router)
  components/
    ui/             shadcn/ui components (NEVER recreate these)
  hooks/            Custom React hooks
  lib/              Utilities (supabase.ts, utils.ts, ai-client.ts)
features/           Feature Specs (PROJ-X-name.md)
  INDEX.md          Feature Status — IMMER zuerst lesen
docs/
  PRD.md            Product Requirements Document
  production/       Production Guides
tests/              E2E Tests (Playwright) — PROJ-1 bis PROJ-30 vorhanden
.claude/
  agents/           7 Agents (requirements, architecture, frontend, backend, qa, devops, help)
  rules/            6 Rules (general, backend, frontend, security, qa, devops, architecture)
  skills/           7 Skills mit SKILL.md + Checklist/Template
```

---

## Product Context

@docs/PRD.md

## Feature Overview

@features/INDEX.md

## Design System

@docs/design-system.md
