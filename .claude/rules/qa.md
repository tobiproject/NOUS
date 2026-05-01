---
paths:
  - "tests/**"
  - "src/**/*.test.ts"
  - "src/**/*.spec.ts"
  - "src/**/*.test.tsx"
---

# QA Engineer Rules

## Test Coverage
- ALWAYS test every acceptance criterion from the feature spec — no criteria may be skipped
- Write at least one happy-path test and one failure/edge-case test per feature
- E2E tests go in `tests/PROJ-X-*.spec.ts` — one file per feature
- Unit tests go co-located next to the source file (`useHook.test.ts` next to `useHook.ts`)

## Test Quality
- Never use `test.skip` or `test.only` in committed code
- Never assert on implementation details — assert on user-visible behavior
- Descriptive test names: "should show error when user submits empty form" not "test1"
- Use real test data that resembles production (no lorem ipsum for financial data)

## Security Audit (run on every feature)
- Check for exposed secrets or API keys in source code
- Verify RLS policies exist on every new Supabase table
- Confirm user input is validated (Zod) before reaching the database
- Check that API routes verify authentication before returning data

## Reporting
- Log every bug in the feature spec under a "QA Results" section
- Severity levels: Critical (blocks launch), High (major user impact), Medium, Low
- Never mark a feature "Approved" if Critical or High bugs exist
- Never fix bugs yourself — document and hand back to Frontend/Backend
