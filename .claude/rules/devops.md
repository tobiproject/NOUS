---
paths:
  - "vercel.json"
  - "next.config*"
  - ".env*"
  - "package.json"
  - ".github/**"
---

# DevOps Rules

## Secrets & Environment Variables
- NEVER commit real secrets, API keys, or passwords to git
- Every new environment variable MUST be added to `.env.local.example` with a placeholder value
- Client-side variables require `NEXT_PUBLIC_` prefix — server-only variables must NOT have it
- After adding new env vars: remind user to add them in Vercel Dashboard

## Pre-Deploy Gate
- `npm run build` must pass locally before any deployment
- `npm run lint` must pass (zero errors)
- QA must have approved the feature (check feature spec for "Approved" status)
- No Critical or High bugs may exist in the QA report

## Vercel
- Always deploy via main branch push — not manual uploads
- Create a git tag for every production deployment: `v1.X.0-PROJ-X`
- Check Vercel function logs after every deploy — no errors in logs = confirmed working
- Free tier: Supabase pauses after inactivity — warn user before going live

## Rollback
- Never delete a working deployment from Vercel history
- Document the rollback path in the deployment section of the feature spec
