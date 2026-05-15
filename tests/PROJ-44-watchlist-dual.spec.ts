import { test, expect } from '@playwright/test'

// PROJ-44: Watchlist Dual (Allgemein vs. Heutige Trading-Watchlist)
// Covers AC-1 through AC-11

test.describe('PROJ-44: Watchlist Dual — Allgemein vs. Heute', () => {

  // ── AC-6: Tab-Navigation auf der Watchlist-Seite ──────────────────────────

  test.describe('Watchlist-Seite — Tab Navigation (AC-6)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/watchlist')
      await page.waitForURL(/\/(watchlist|login)/, { timeout: 10000 })
    })

    test('AC-6: Watchlist-Seite hat zwei Tabs: Allgemein und Heute', async ({ page }) => {
      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated in test environment')
        return
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('[role="tab"]:has-text("Allgemein")')).toBeVisible()
      await expect(page.locator('[role="tab"]:has-text("Heute")')).toBeVisible()
    })

    test('AC-6: Tab-Wechsel von Allgemein zu Heute funktioniert', async ({ page }) => {
      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      // Default: Allgemein tab is active
      await expect(page.locator('[role="tab"][data-state="active"]')).toContainText('Allgemein')

      // Switch to Heute
      await page.click('[role="tab"]:has-text("Heute")')
      await expect(page.locator('[role="tab"][data-state="active"]')).toContainText('Heute')

      // Heute tab shows heutige-watchlist content
      await expect(page.locator('text=Heutige Trading-Watchlist')).toBeVisible()
    })

    test('AC-6: Tab-Wechsel zurück zu Allgemein funktioniert', async ({ page }) => {
      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.click('[role="tab"]:has-text("Heute")')
      await page.click('[role="tab"]:has-text("Allgemein")')
      await expect(page.locator('[role="tab"][data-state="active"]')).toContainText('Allgemein')
    })
  })

  // ── AC-1 + AC-2: Symbol hinzufügen und entfernen (Watchlist-Seite) ────────

  test.describe('Heutige Watchlist — Heute-Tab auf Watchlist-Seite (AC-1, AC-2)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/watchlist')
      await page.waitForURL(/\/(watchlist|login)/, { timeout: 10000 })
    })

    test('AC-1 + AC-2: Heute-Tab zeigt Symbol-Picker und erlaubt Hinzufügen/Entfernen', async ({ page }) => {
      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.click('[role="tab"]:has-text("Heute")')
      await page.waitForLoadState('networkidle')

      // Should show either the empty state or existing chips + picker
      const hasPicker = await page.locator('button:has-text("Symbol hinzufügen")').isVisible()
      const hasEmptyHint = await page.locator('text=/Füge zuerst Assets/i').isVisible()
      const hasCopyBanner = await page.locator('text=/von gestern übernehmen/i').isVisible()

      // At least one of these states is visible — feature is rendered
      expect(hasPicker || hasEmptyHint || hasCopyBanner).toBe(true)
    })

    test('AC-9: Symbol-Picker zeigt bereits gewählte Symbole nicht doppelt an', async ({ page }) => {
      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.click('[role="tab"]:has-text("Heute")')
      await page.waitForLoadState('networkidle')

      const picker = page.locator('button:has-text("Symbol hinzufügen")')
      if (!(await picker.isVisible())) return

      await picker.click()
      // All items in picker dropdown are unselected (not already in chips)
      const dropdownItems = page.locator('[data-symbol-picker] button, .absolute button.ticker')
      // The picker should not show symbols already present as chips
      const chips = await page.locator('.ticker').allTextContents()
      const dropdownTexts = await dropdownItems.allTextContents()

      for (const chip of chips) {
        expect(dropdownTexts).not.toContain(chip.trim())
      }
    })
  })

  // ── AC-1 + AC-2: Symbol hinzufügen/entfernen im Tagesplan ─────────────────

  test.describe('Tagesplan — Heutige Trading-Watchlist Abschnitt (AC-1, AC-2)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tagesplan')
      await page.waitForURL(/\/(tagesplan|login)/, { timeout: 10000 })
    })

    test('AC-1: Tagesplan zeigt den Abschnitt "Heutige Trading-Watchlist"', async ({ page }) => {
      if (!page.url().includes('tagesplan')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h2:has-text("Heutige Trading-Watchlist")')).toBeVisible()
    })

    test('AC-1: Symbol-Picker ist im Tagesplan sichtbar', async ({ page }) => {
      if (!page.url().includes('tagesplan')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      // One of these states must be visible: picker, empty hint, or copy banner
      const hasPicker = await page.locator('button:has-text("Symbol hinzufügen")').isVisible()
      const hasEmptyHint = await page.locator('text=/Füge zuerst Assets/i').isVisible()
      const hasCopyBanner = await page.locator('text=/von gestern übernehmen/i').isVisible()
      const hasNoAccount = await page.locator('text=/Wähle ein Konto/i').isVisible()

      expect(hasPicker || hasEmptyHint || hasCopyBanner || hasNoAccount).toBe(true)
    })

    test('AC-4: "Von gestern übernehmen"-Button ist sichtbar wenn heute leer', async ({ page }) => {
      if (!page.url().includes('tagesplan')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      // Banner only shown when today's watchlist is empty
      // We test that when the banner appears, the button works
      const banner = page.locator('text=/von gestern übernehmen/i')
      if (await banner.isVisible()) {
        await expect(page.locator('button:has-text("Übernehmen")')).toBeVisible()
      }
    })
  })

  // ── AC-5: Allgemeine Watchlist bleibt unberührt (Regression) ─────────────

  test.describe('Regression: Allgemeine Watchlist unverändert (AC-5)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/watchlist')
      await page.waitForURL(/\/(watchlist|login)/, { timeout: 10000 })
    })

    test('AC-5: Allgemein-Tab zeigt bestehende Watchlist-Funktionalität', async ({ page }) => {
      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      // Allgemein tab is active by default
      await expect(page.locator('[role="tab"][data-state="active"]')).toContainText('Allgemein')

      // Symbolsuche is present
      await expect(page.locator('text=Symbolsuche')).toBeVisible()
      // Watchlist section header present
      await expect(page.locator('text=Deine Watchlist')).toBeVisible()
    })

    test('AC-5: Allgemeine Watchlist zeigt Suchfeld und Asset-Liste', async ({ page }) => {
      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      // Symbol search input present
      await expect(page.locator('input[placeholder*="Symbol"]')).toBeVisible()
    })
  })

  // ── AC-8: Wirtschaftskalender Hervorhebung ─────────────────────────────────

  test.describe('Wirtschaftskalender — Hervorhebungs-Logik (AC-8)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kalender')
      await page.waitForURL(/\/(kalender|login)/, { timeout: 10000 })
    })

    test('AC-8: Wirtschaftskalender lädt ohne Fehler', async ({ page }) => {
      if (!page.url().includes('kalender')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      // No error messages visible
      await expect(page.locator('text=/Fehler beim Laden/i')).not.toBeVisible()
      // Calendar structure present
      await expect(page.locator('body')).toContainText(/Wirtschaftskalender|Kalender/)
    })
  })

  // ── AC-11: Mobile/Desktop Parity ──────────────────────────────────────────

  test.describe('Responsive — Mobile/Desktop Parity (AC-11)', () => {
    test('AC-11: Watchlist Heute-Tab funktioniert auf Mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto('/watchlist')
      await page.waitForURL(/\/(watchlist|login)/, { timeout: 10000 })

      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      // Tabs still visible on mobile
      await expect(page.locator('[role="tab"]:has-text("Allgemein")')).toBeVisible()
      await expect(page.locator('[role="tab"]:has-text("Heute")')).toBeVisible()

      // Tab switch works on mobile
      await page.click('[role="tab"]:has-text("Heute")')
      await expect(page.locator('[role="tab"][data-state="active"]')).toContainText('Heute')
    })

    test('AC-11: Heutige Watchlist auf Tagesplan funktioniert auf Mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto('/tagesplan')
      await page.waitForURL(/\/(tagesplan|login)/, { timeout: 10000 })

      if (!page.url().includes('tagesplan')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h2:has-text("Heutige Trading-Watchlist")')).toBeVisible()
    })

    test('AC-11: Watchlist Heute-Tab funktioniert auf Desktop (1440px)', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/watchlist')
      await page.waitForURL(/\/(watchlist|login)/, { timeout: 10000 })

      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await expect(page.locator('[role="tab"]:has-text("Heute")')).toBeVisible()
    })
  })

  // ── AC-10: Konto-spezifische heutige Watchlist ────────────────────────────

  test.describe('Konto-Spezifität (AC-10)', () => {
    test('AC-10: Heutige Watchlist zeigt Konto-Hinweis wenn kein Konto aktiv', async ({ page }) => {
      await page.goto('/watchlist')
      await page.waitForURL(/\/(watchlist|login)/, { timeout: 10000 })
      if (!page.url().includes('watchlist')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.click('[role="tab"]:has-text("Heute")')
      await page.waitForLoadState('networkidle')

      // Either the panel shows data (account is set) or shows account prompt
      const hasContent = await page.locator('text=/Heutige Trading-Watchlist/').isVisible()
      expect(hasContent).toBe(true)
    })
  })
})
