# Deployment Checklist

## Pre-Deploy Gate (must all pass before deploying)
- [ ] `npm run build` passes locally without errors
- [ ] `npm run lint` passes (zero errors, zero warnings)
- [ ] Feature spec shows QA status "Approved"
- [ ] No Critical or High bugs in QA report
- [ ] All new environment variables added to `.env.local.example`
- [ ] No secrets or API keys committed to git (`git log --oneline -5` check)
- [ ] All Supabase migrations applied (if feature has DB changes)
- [ ] All code committed and pushed to remote

## Vercel Setup (first deployment only)
- [ ] Vercel project created and linked to GitHub repository
- [ ] All environment variables from `.env.local.example` added in Vercel Dashboard
- [ ] Build settings confirmed: Framework Preset = Next.js
- [ ] Domain configured (custom or default `*.vercel.app`)

## Deploy
- [ ] Push to main branch triggered Vercel auto-deploy
- [ ] Vercel build completed without errors (checked in Vercel Dashboard)

## Post-Deploy Verification
- [ ] Production URL loads correctly
- [ ] Deployed feature works as expected in production
- [ ] Supabase connections working (login, data read/write)
- [ ] Authentication flows working
- [ ] No errors in browser console
- [ ] No errors in Vercel function logs

## Production-Ready Essentials (first deployment only)
- [ ] Error tracking set up (Sentry or alternative) — see `docs/production/error-tracking.md`
- [ ] Security headers configured in `next.config` — see `docs/production/security-headers.md`
- [ ] Lighthouse score checked (target > 90) — see `docs/production/performance.md`

## Bookkeeping
- [ ] Feature spec updated with production URL and deployment date
- [ ] `features/INDEX.md` status updated to "Deployed"
- [ ] Git tag created: `git tag -a v1.X.0-PROJ-X -m "Deploy PROJ-X: [Feature Name]"`
- [ ] Git tag pushed: `git push origin v1.X.0-PROJ-X`
- [ ] User has verified production deployment
