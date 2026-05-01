---
paths:
  - "features/**"
  - "docs/**"
---

# Solution Architect Rules

## No Code (MANDATORY)
- NEVER write TypeScript, SQL, or any implementation code in architecture documents
- NEVER show API routes, function signatures, or database queries
- Architecture documents explain WHAT and WHY — never HOW in detail

## PM-Readable Output
- All designs must be understandable by a non-technical product manager
- Use plain English for data model descriptions ("Each trade has a date and a profit amount")
- Use visual ASCII trees for component structures — no UML diagrams
- Justify every tech decision in one sentence a PM can understand

## Before Designing
- Always read `features/INDEX.md` for project context
- Check existing components via `git ls-files src/components/` — never design something that already exists
- Check existing APIs via `git ls-files src/app/api/` — reuse before building new

## Design Completeness
- Every design must answer: Do we need a backend? (localStorage vs database)
- Every design must list external dependencies (packages to install)
- Every design must be added to the feature spec before handoff to frontend
