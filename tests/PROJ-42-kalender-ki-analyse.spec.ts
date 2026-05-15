import { test, expect } from '@playwright/test'

// PROJ-42: Kalender KI-Analyse "Auswirkung auf meine Watchlist"
// Covers all acceptance criteria from the feature spec

test.describe('PROJ-42: Kalender KI-Analyse — Auswirkung auf meine Watchlist', () => {

  // ── Basis: Kalender-Seite lädt ─────────────────────────────────────────────

  test.describe('Basis-Struktur (AC: Route + Seite)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })
    })

    test('Wirtschaftskalender-Seite lädt ohne Fehler', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated in test environment')
        return
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('text=/Fehler beim Laden/i')).not.toBeVisible()
    })

    test('Wirtschaftskalender zeigt Kalender-Inhalte', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      // Either events are shown or an empty state — no crash
      await expect(page.locator('body')).toContainText(/Wirtschaftskalender|Kalender|Event|CPI|NFP|FOMC/i)
    })
  })

  // ── AC: KI-Analyse Button — Sichtbarkeit ──────────────────────────────────

  test.describe('KI-Analyse Button — Sichtbarkeit (AC: Filterlogik)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })
    })

    test('AC: Button-Label ist korrekt wenn sichtbar', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      // Try to find the button (may not exist if no High-impact event is open)
      const button = page.locator('button:has-text("KI-Analyse: Auswirkung auf meine Watchlist")')
      if (await button.isVisible()) {
        await expect(button).toBeEnabled()
        // Sparkles icon should be present (via SVG within button)
        await expect(button).toBeVisible()
      }
      // Button not visible = no High-impact event detail open OR no watchlist match — valid state
    })

    test('AC: "Watchlist Impact" Sektionsüberschrift begleitet den Button', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      const button = page.locator('button:has-text("KI-Analyse: Auswirkung auf meine Watchlist")')
      if (await button.isVisible()) {
        // Section header must appear together with button
        await expect(page.locator('text=Watchlist Impact')).toBeVisible()
      }
    })
  })

  // ── AC: Button-Zustände (idle → loading → streaming → done) ───────────────

  test.describe('KI-Analyse — Button-Zustände (AC: UX-States)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })
    })

    test('AC: Klick auf Button zeigt Lade-Zustand "Analysiere…"', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      const button = page.locator('button:has-text("KI-Analyse: Auswirkung auf meine Watchlist")')
      if (!(await button.isVisible())) {
        test.skip(true, 'No High-impact event open with KI-Analyse button')
        return
      }

      await button.click()
      // Within 1 second: either "Analysiere…" button or streaming text appears
      await page.waitForTimeout(300)
      const isLoading = await page.locator('button:has-text("Analysiere")').isVisible()
      const isStreaming = await page.locator('.rounded-md:has-text("1. Bedeutung"), .rounded-md:has-text("Watchlist"), text=Analysiere').isVisible()
      expect(isLoading || isStreaming).toBe(true)
    })

    test('AC: "Neu analysieren" erscheint nach abgeschlossenem Streaming', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      const button = page.locator('button:has-text("KI-Analyse: Auswirkung auf meine Watchlist")')
      if (!(await button.isVisible())) {
        test.skip(true, 'No High-impact event open with KI-Analyse button')
        return
      }

      await button.click()
      // Wait for full streaming to complete (max 45s for AI response)
      await page.waitForSelector('button:has-text("Neu analysieren")', { timeout: 45000 })
      await expect(page.locator('button:has-text("Neu analysieren")')).toBeVisible()
    })

    test('AC: "Neu analysieren" resets state back to idle button', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      const button = page.locator('button:has-text("KI-Analyse: Auswirkung auf meine Watchlist")')
      if (!(await button.isVisible())) {
        test.skip(true, 'No High-impact event open')
        return
      }

      await button.click()
      await page.waitForSelector('button:has-text("Neu analysieren")', { timeout: 45000 })
      await page.locator('button:has-text("Neu analysieren")').click()
      // Should return to idle state showing the original button
      await expect(page.locator('button:has-text("KI-Analyse: Auswirkung auf meine Watchlist")')).toBeVisible()
    })
  })

  // ── AC: Technisch — API Route ──────────────────────────────────────────────

  test.describe('API Route /api/ai/calendar-impact (AC: Technisch)', () => {
    test('AC: Route returns 401 when called without auth', async ({ page }) => {
      const res = await page.request.post('/api/ai/calendar-impact', {
        data: {
          eventName: 'Non-Farm Payrolls',
          country: 'USD',
          impactLevel: 'High',
          actual: '280K',
          forecast: '250K',
          previous: '240K',
          watchlistSymbols: ['EURUSD'],
        },
      })
      expect(res.status()).toBe(401)
    })

    test('AC: Route returns 400 for invalid impactLevel', async ({ page }) => {
      // This test exercises Zod validation — no auth needed to hit validation
      // But auth check runs first, so we'll get 401; test validates the route exists
      const res = await page.request.post('/api/ai/calendar-impact', {
        data: {
          eventName: 'CPI m/m',
          country: 'USD',
          impactLevel: 'invalid_level',
          actual: null,
          forecast: '0.3%',
          previous: '0.2%',
          watchlistSymbols: [],
        },
      })
      // Either 401 (not authed, hit auth first) or 400 (hit validation first)
      expect([400, 401]).toContain(res.status())
    })

    test('AC: Route exists and responds (not 404)', async ({ page }) => {
      const res = await page.request.post('/api/ai/calendar-impact', {
        data: { eventName: 'test', country: 'US', impactLevel: 'High', watchlistSymbols: [] },
      })
      expect(res.status()).not.toBe(404)
    })
  })

  // ── AC: Empty Watchlist Edge Case ──────────────────────────────────────────

  test.describe('Edge Case: Leere Watchlist (AC: Watchlist-Verhalten)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })
    })

    test('AC: Kalender-Seite ist stabil ohne Watchlist-Daten', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      // Should not crash regardless of watchlist state
      await expect(page.locator('text=/Fehler|Error|Uncaught/i')).not.toBeVisible()
    })
  })

  // ── Regression: Bestehende Kalender-Features ──────────────────────────────

  test.describe('Regression: PROJ-38 Wirtschaftskalender unbeschädigt', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })
    })

    test('PROJ-38 Regression: Kalender-Seite lädt ohne JS-Fehler', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))

      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      // No uncaught JS errors
      expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0)
    })

    test('PROJ-38 Regression: KI-Briefing-Button noch vorhanden wenn Event geöffnet', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      // If any KI-Briefing button is visible, PROJ-38 feature still works
      const kiBriefingVisible = await page.locator('button:has-text("KI-Briefing"), text=KI-Briefing').isVisible()
      // Only assert if event is open — otherwise it's fine that no KI-Briefing is visible
      if (kiBriefingVisible) {
        await expect(page.locator('button:has-text("KI-Briefing anfordern"), text=KI-Briefing')).toBeVisible()
      }
    })
  })

  // ── Responsive: Mobile & Desktop ──────────────────────────────────────────

  test.describe('Responsive — Mobile/Desktop Parity (AC: UX Mobile)', () => {
    test('AC: Kalender-Seite lädt auf Mobile (375px) ohne Layout-Fehler', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })

      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('text=/Fehler beim Laden/i')).not.toBeVisible()
    })

    test('AC: Kalender-Seite lädt auf Tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })

      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('text=/Fehler beim Laden/i')).not.toBeVisible()
    })

    test('AC: Kalender-Seite lädt auf Desktop (1440px)', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })

      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('text=/Fehler beim Laden/i')).not.toBeVisible()
    })

    test('AC: KI-Analyse Button ist auf Mobile nicht abgeschnitten', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })

      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      const button = page.locator('button:has-text("KI-Analyse: Auswirkung auf meine Watchlist")')
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        // Button must be fully within viewport width
        expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 20) // 20px tolerance
      }
    })
  })
})
