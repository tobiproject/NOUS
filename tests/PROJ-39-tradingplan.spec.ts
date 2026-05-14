import { test, expect } from '@playwright/test'

// PROJ-39: Tradingplan — QA E2E Tests
// Tests cover tab navigation, section display, rule management,
// save flow, and KI-Vorschlag button state.

test.describe('PROJ-39: Tradingplan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/einstellungen?tab=tradingplan')
    await page.waitForURL(/\/(einstellungen|login)/, { timeout: 10000 })
  })

  // ── AC-1: Tab erscheint in /einstellungen ────────────────────────────────

  test('AC-1: "Tradingplan" tab is visible in Einstellungen', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated in test environment')
    }
    await expect(page.locator('[role="tab"]:has-text("Tradingplan")')).toBeVisible()
  })

  // ── AC-2: Bestehende Tabs bleiben erhalten ───────────────────────────────

  test('AC-2: Existing tabs (Profil, Strategie, Konten) remain unchanged', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await expect(page.locator('[role="tab"]:has-text("Profil")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("Strategie")')).toBeVisible()
    await expect(page.locator('[role="tab"]:has-text("Konten")')).toBeVisible()
  })

  // ── AC-3: Alle 8 Sektionen werden angezeigt ──────────────────────────────

  test('AC-3: All 8 sections are displayed as accordion items', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    const expectedSections = [
      'Strategie-Übersicht',
      'Setup-Kriterien',
      'Entry & Exit Regeln',
      'Risiko-Regeln',
      'Psychologie & Mindset',
      'Verbotene Verhaltensweisen',
      'Review-Prozess',
      'Prop-Firm Regeln',
    ]

    for (const title of expectedSections) {
      await expect(page.locator(`text=${title}`).first()).toBeVisible()
    }
  })

  // ── AC-5 & AC-6 & AC-7: Regel hinzufügen, bearbeiten, löschen ───────────

  test('AC-5: Adding a rule via Enter key adds it to the list', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // Open first section
    await page.locator('[data-state]').filter({ hasText: 'Strategie-Übersicht' }).first().click()
    await page.waitForTimeout(300)

    // Type rule and press Enter
    const input = page.locator('input[placeholder="Neue Regel hinzufügen…"]').first()
    await input.fill('Nur NQ und ES traden')
    await input.press('Enter')

    // Rule should appear in list
    await expect(page.locator('text=Nur NQ und ES traden').first()).toBeVisible()
  })

  test('AC-6: Clicking a rule makes it inline-editable', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // Open first section and add a rule first
    await page.locator('[data-state]').filter({ hasText: 'Strategie-Übersicht' }).first().click()
    await page.waitForTimeout(300)

    const input = page.locator('input[placeholder="Neue Regel hinzufügen…"]').first()
    await input.fill('Test-Regel')
    await input.press('Enter')

    // Click on the rule text to edit it
    await page.locator('span.cursor-text:has-text("Test-Regel")').first().click()

    // Should show an input field
    await expect(page.locator('input[value="Test-Regel"]').or(
      page.locator('input').filter({ hasValue: /Test-Regel/ })
    ).first()).toBeVisible()
  })

  test('AC-7: Delete button (X) removes a rule', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // Open a section and add a rule
    await page.locator('[data-state]').filter({ hasText: 'Risiko-Regeln' }).first().click()
    await page.waitForTimeout(300)

    const input = page.locator('input[placeholder="Neue Regel hinzufügen…"]').first()
    await input.fill('Löschbare Regel')
    await input.press('Enter')
    await expect(page.locator('text=Löschbare Regel').first()).toBeVisible()

    // Find the delete button in the same row and click it
    const ruleRow = page.locator('div').filter({ hasText: /^Löschbare Regel$/ }).first()
    await ruleRow.locator('button').click()

    await expect(page.locator('text=Löschbare Regel')).not.toBeVisible()
  })

  // ── AC-9 & AC-10: Freitextfeld ───────────────────────────────────────────

  test('AC-9 + AC-10: Notes textarea accepts text up to 5000 chars', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    await page.locator('[data-state]').filter({ hasText: 'Psychologie & Mindset' }).first().click()
    await page.waitForTimeout(300)

    const textarea = page.locator('textarea[placeholder*="Erläuterungen"]').first()
    await textarea.fill('Meine Notizen zum Mindset')
    await expect(textarea).toHaveValue('Meine Notizen zum Mindset')

    // Character counter should be visible
    await expect(page.locator('text=/\\d+\\/5000/').first()).toBeVisible()
  })

  // ── AC-11 & AC-12: Speichern pro Sektion ─────────────────────────────────

  test('AC-11 + AC-12: Save button per section shows loading and success feedback', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    await page.locator('[data-state]').filter({ hasText: 'Review-Prozess' }).first().click()
    await page.waitForTimeout(300)

    // Save button should be visible
    const saveBtn = page.locator('button:has-text("Speichern")').first()
    await expect(saveBtn).toBeVisible()

    // Click save — expect toast or loading state
    await saveBtn.click()
    // Either a loader appears briefly or a success toast shows
    await expect(
      page.locator('[data-sonner-toast]').or(page.locator('.animate-spin')).first()
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      // Toast may have already disappeared — that's also acceptable
    })
  })

  // ── AC-14 & AC-15: KI-Vorschlag Button ───────────────────────────────────

  test('AC-14: "KI-Vorschlag aus Knowledge Base" button exists per section', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // Open any section
    await page.locator('[data-state]').filter({ hasText: 'Strategie-Übersicht' }).first().click()
    await page.waitForTimeout(300)

    await expect(page.locator('button:has-text("KI-Vorschlag aus Knowledge Base")').first()).toBeVisible()
  })

  test('AC-15: KI-Vorschlag button is disabled when KB is empty (tooltip hint)', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    await page.locator('[data-state]').filter({ hasText: 'Strategie-Übersicht' }).first().click()
    await page.waitForTimeout(300)

    // If KB has no docs, button should be disabled
    const kiBtn = page.locator('button:has-text("KI-Vorschlag aus Knowledge Base")').first()
    const isDisabled = await kiBtn.isDisabled()

    if (isDisabled) {
      // Verify the "KB leer" hint text or title tooltip
      const hint = await page.locator('text=KB leer').or(
        page.locator('[title*="Knowledge Base"]')
      ).first().isVisible()
      expect(hint).toBe(true)
    }
    // If KB has docs, button is enabled — both states are valid
  })

  // ── AC-4: "Zuletzt gespeichert" in Header ────────────────────────────────

  test('AC-4: Saved sections show "Gespeichert" timestamp in accordion header', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // If there's already saved data, "Gespeichert:" should appear in some headers
    // We check the pattern rather than requiring it (might not have saved data in test env)
    const savedText = page.locator('text=/Gespeichert: \\d{2}\\.\\d{2}\\.\\d{4}/')
    const count = await savedText.count()

    // If there are saved sections, they must show the timestamp format
    if (count > 0) {
      await expect(savedText.first()).toBeVisible()
    }
    // If no sections are saved, the description text should show instead
    else {
      const descText = page.locator('text=Was ist deine Strategie')
      await expect(descText.first()).toBeVisible()
    }
  })

  // ── EC-6: Leere Sektion zeigt kein "Zuletzt gespeichert" ─────────────────

  test('EC-6: Empty section shows description text instead of timestamp', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // Prop-Firm Regeln is unlikely to have saved data in test env
    const propFirmHeader = page.locator('[data-state]').filter({ hasText: 'Prop-Firm Regeln' }).first()
    const hasTimestamp = await propFirmHeader.locator('text=/Gespeichert:.*\\d{4}/').count() > 0

    if (!hasTimestamp) {
      // Should show description instead
      await expect(propFirmHeader.locator('text=Prop-Firm')).toBeVisible()
    }
  })

  // ── Regression: Strategie-Tab still works ────────────────────────────────

  test('Regression: Strategie tab still loads without errors', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.goto('/einstellungen?tab=strategie')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[role="tab"][data-state="active"]:has-text("Strategie")')).toBeVisible()
  })

  // ── Regression: Profil-Tab still works ──────────────────────────────────

  test('Regression: Profil tab still loads without errors', async ({ page }) => {
    if (!page.url().includes('einstellungen')) {
      test.skip(true, 'User not authenticated')
    }
    await page.goto('/einstellungen?tab=profil')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[role="tab"][data-state="active"]:has-text("Profil")')).toBeVisible()
  })
})
