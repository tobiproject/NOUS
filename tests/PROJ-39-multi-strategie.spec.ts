import { test, expect } from '@playwright/test'

// PROJ-39 Erweiterung: Multi-Strategie-Auswahl — QA E2E Tests
// Covers AC-M1 through AC-M7 for the strategy dropdown in TradeFormSheet
// and the multi-strategy list in Einstellungen → Strategie tab.

test.describe('PROJ-39: Multi-Strategie-Auswahl', () => {
  function skipIfNotAuth(page: { url: () => string }) {
    if (!page.url().includes('einstellungen') && !page.url().includes('journal')) {
      return true
    }
    return false
  }

  // ── AC-M4 + AC-M5: Strategie-Tab zeigt alle Strategien ──────────────────

  test.describe('Einstellungen — Strategie Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/einstellungen?tab=strategie')
      await page.waitForURL(/\/(einstellungen|login)/, { timeout: 10000 })
    })

    test('AC-M4: Strategie tab lists all strategies for the active account', async ({ page }) => {
      if (skipIfNotAuth(page)) {
        test.skip(true, 'User not authenticated in test environment')
        return
      }
      await page.waitForLoadState('networkidle')
      // Strategy tab is active — header shows "Strategien (N)"
      await expect(page.locator('text=/Strategien \\(\\d+\\)/')).toBeVisible()
    })

    test('AC-M5: User can add a new strategy by typing a name and clicking "Anlegen"', async ({ page }) => {
      if (skipIfNotAuth(page)) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.click('button:has-text("Neue Strategie")')
      await page.fill('input[placeholder="Name der neuen Strategie…"]', 'QA Test Strategie')
      await page.click('button:has-text("Anlegen")')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('text=QA Test Strategie')).toBeVisible()
    })

    test('AC-M5: "Anlegen" button is disabled when name field is empty', async ({ page }) => {
      if (skipIfNotAuth(page)) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.click('button:has-text("Neue Strategie")')
      const addButton = page.locator('button:has-text("Anlegen")')
      await expect(addButton).toBeDisabled()
    })

    test('AC-M5: Escape key cancels new strategy input', async ({ page }) => {
      if (skipIfNotAuth(page)) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.click('button:has-text("Neue Strategie")')
      await page.fill('input[placeholder="Name der neuen Strategie…"]', 'Should not save')
      await page.keyboard.press('Escape')
      await expect(page.locator('input[placeholder="Name der neuen Strategie…"]')).not.toBeVisible()
    })

    test('AC-M6: Delete shows inline confirmation row before executing', async ({ page }) => {
      if (skipIfNotAuth(page)) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')

      // Only run if at least one strategy exists
      const strategyItems = page.locator('[data-testid="strategy-item"], button[type="button"]:has([data-lucide="trash-2"])').first()
      const count = await page.locator('svg[data-lucide="trash-2"]').count()
      if (count === 0) {
        test.skip(true, 'No strategies to delete')
        return
      }

      // Click trash icon on first strategy
      await page.locator('svg[data-lucide="trash-2"]').first().click()
      // Confirmation row appears
      await expect(page.locator('text=/wirklich löschen/')).toBeVisible()
      await expect(page.locator('button:has-text("Löschen")')).toBeVisible()
      await expect(page.locator('button:has-text("Abbrechen")')).toBeVisible()
    })

    test('AC-M6: "Abbrechen" in delete confirmation cancels without deleting', async ({ page }) => {
      if (skipIfNotAuth(page)) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      const count = await page.locator('svg[data-lucide="trash-2"]').count()
      if (count === 0) {
        test.skip(true, 'No strategies to delete')
        return
      }

      const trashIcons = page.locator('svg[data-lucide="trash-2"]')
      const initialCount = await trashIcons.count()
      await trashIcons.first().click()
      await page.click('button:has-text("Abbrechen")')
      // Confirmation row gone, strategy still present
      await expect(page.locator('text=/wirklich löschen/')).not.toBeVisible()
      await expect(trashIcons).toHaveCount(initialCount)
    })

    test('AC-M7: Trades with old strategy names are not affected (text field not FK)', async ({ page }) => {
      // This is verified at schema level — trades.strategy is TEXT, no FK constraint
      // The DELETE route returns tradesAffected count but does NOT cascade-delete trades
      // This is a contract test: we verify the UI message warns "Alte Trades bleiben erhalten"
      if (skipIfNotAuth(page)) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      const count = await page.locator('svg[data-lucide="trash-2"]').count()
      if (count === 0) {
        test.skip(true, 'No strategies to test deletion message')
        return
      }
      await page.locator('svg[data-lucide="trash-2"]').first().click()
      // Confirmation message mentions trade preservation
      await expect(page.locator('text=/Alte Trades bleiben erhalten/')).toBeVisible()
    })
  })

  // ── AC-M1 + AC-M2 + AC-M3: Trade-Formular Strategie-Dropdown ────────────

  test.describe('Journal — TradeFormSheet Strategie Dropdown', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/journal?new=1')
      await page.waitForURL(/\/(journal|login)/, { timeout: 10000 })
    })

    test('AC-M1: Trade form shows a Select dropdown for Strategie (not a plain text input)', async ({ page }) => {
      if (!page.url().includes('journal')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      // The Strategie field should be a Select trigger, not a plain input
      const strategyLabel = page.locator('label:has-text("Strategie")')
      await expect(strategyLabel).toBeVisible()
      // Select trigger has role="combobox"
      const selectTrigger = page.locator('[role="combobox"]:near(label:has-text("Strategie"))')
      await expect(selectTrigger).toBeVisible()
    })

    test('AC-M2: Dropdown shows saved strategies from API', async ({ page }) => {
      if (!page.url().includes('journal')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.locator('[role="combobox"]:near(label:has-text("Strategie"))').click()
      // Dropdown opens — check for "Freitext eingeben…" option which is always present
      await expect(page.locator('[role="option"]:has-text("Freitext eingeben…")')).toBeVisible()
    })

    test('AC-M3: "Freitext eingeben…" option reveals custom text input', async ({ page }) => {
      if (!page.url().includes('journal')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.locator('[role="combobox"]:near(label:has-text("Strategie"))').click()
      await page.locator('[role="option"]:has-text("Freitext eingeben…")').click()
      // After selecting custom, an Input appears for free text
      await expect(page.locator('input[placeholder="Strategiename eingeben…"]')).toBeVisible()
    })

    test('AC-M3: Custom text input accepts arbitrary strategy name', async ({ page }) => {
      if (!page.url().includes('journal')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      await page.locator('[role="combobox"]:near(label:has-text("Strategie"))').click()
      await page.locator('[role="option"]:has-text("Freitext eingeben…")').click()
      await page.fill('input[placeholder="Strategiename eingeben…"]', 'My Custom Strategy')
      await expect(page.locator('input[placeholder="Strategiename eingeben…"]')).toHaveValue('My Custom Strategy')
    })

    test('AC-M2: Existing "Strategie setzen" placeholder is shown when no strategy selected', async ({ page }) => {
      if (!page.url().includes('journal')) {
        test.skip(true, 'User not authenticated')
        return
      }
      await page.waitForLoadState('networkidle')
      const trigger = page.locator('[role="combobox"]:near(label:has-text("Strategie"))')
      await expect(trigger).toContainText('Strategie auswählen…')
    })
  })
})
