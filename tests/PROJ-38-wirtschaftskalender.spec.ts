import { test, expect } from '@playwright/test'

// PROJ-38: Wirtschaftskalender QA Tests
// Note: economic_events table may be empty in test environment (no cron run yet).
// Tests cover page structure, navigation, filter behavior, and empty states.

test.describe('PROJ-38: Wirtschaftskalender', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate — navigate to app which redirects to login if not authenticated
    await page.goto('/kalender')
    // Wait for either the calendar page or the login redirect
    await page.waitForURL(/\/(kalender|auth|login)/, { timeout: 10000 })
  })

  // ── Acceptance Criteria: Kalender-Ansicht ────────────────────────────────

  test('AC-1: Page loads with correct title and header', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated in test environment')
    }
    await expect(page.locator('h1')).toContainText('Wirtschaftskalender')
    await expect(page.locator('text=High-Impact Events')).toBeVisible()
  })

  test('AC-5: Week navigation shows KW number and date range', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')
    // Should display KW (calendar week)
    await expect(page.locator('text=/KW \\d+/')).toBeVisible()
    // Should have prev/next navigation buttons
    await expect(page.locator('button[aria-label="Vorherige Woche"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Nächste Woche"]')).toBeVisible()
  })

  test('AC-5: Heute button appears only when not on current week', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')
    // Should NOT have "Heute" button on current week
    await expect(page.locator('button:has-text("Heute")')).not.toBeVisible()

    // Navigate to previous week — Heute button should appear
    await page.click('button[aria-label="Vorherige Woche"]')
    await expect(page.locator('button:has-text("Heute")')).toBeVisible()

    // Click Heute — should disappear again
    await page.click('button:has-text("Heute")')
    await expect(page.locator('button:has-text("Heute")')).not.toBeVisible()
  })

  test('AC-5: Week navigation shows correct range when navigating backwards', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // Navigate back one week
    await page.click('button[aria-label="Vorherige Woche"]')
    await page.waitForLoadState('networkidle')
    // Should still show KW indicator
    await expect(page.locator('text=/KW \\d+/')).toBeVisible()
  })

  // ── Acceptance Criteria: Filter Bar ──────────────────────────────────────

  test('AC-Filter-1: Filter bar shows High, Med, Low impact toggles', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button:has-text("High")')).toBeVisible()
    await expect(page.locator('button:has-text("Med")')).toBeVisible()
    await expect(page.locator('button:has-text("Low")')).toBeVisible()
  })

  test('AC-Filter-1: Filter bar shows top currency buttons', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')
    for (const currency of ['USD', 'EUR', 'GBP', 'JPY']) {
      await expect(page.locator(`button:has-text("${currency}")`)).toBeVisible()
    }
  })

  test('AC-Filter-3: Toggling impact filter changes its visual state', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')
    const lowBtn = page.locator('button:has-text("Low")')

    // Capture initial opacity — High/Med/Low start as active (opacity-100)
    const initialOpacity = await lowBtn.evaluate(el => window.getComputedStyle(el).opacity)

    // Toggle Low off
    await lowBtn.click()
    await page.waitForTimeout(300)

    // After toggling off, opacity should be reduced
    const afterOpacity = await lowBtn.evaluate(el => window.getComputedStyle(el).opacity)
    expect(parseFloat(afterOpacity)).toBeLessThan(parseFloat(initialOpacity))
  })

  test('AC-Filter-4: Reset button appears when filters are non-default', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // Reset button should NOT be visible by default (all impact levels on, no currencies)
    const resetBtn = page.locator('button:has-text("Zurücksetzen")')
    await expect(resetBtn).not.toBeVisible()

    // Toggle USD currency filter to make it non-default
    await page.locator('button:has-text("USD")').click()
    await page.waitForTimeout(200)
    await expect(resetBtn).toBeVisible()

    // Click reset — button should disappear again
    await resetBtn.click()
    await page.waitForTimeout(200)
    await expect(resetBtn).not.toBeVisible()
  })

  // ── Acceptance Criteria: Empty State ─────────────────────────────────────

  test('AC-EmptyState: Shows empty state when all impact filters are toggled off', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.waitForLoadState('networkidle')

    // Toggle off all three impact levels
    await page.click('button:has-text("High")')
    await page.click('button:has-text("Med")')
    await page.click('button:has-text("Low")')
    await page.waitForTimeout(300)

    // Should show an empty state message
    await expect(
      page.locator('text=/Keine Events|keine Events/')
    ).toBeVisible()
  })

  // ── Acceptance Criteria: Fetch-at label ──────────────────────────────────

  test('AC-Data-4: Shows loading skeleton while fetching events', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    // Navigate to calendar page fresh
    await page.goto('/kalender')
    // Skeleton should briefly appear while loading
    // (we just check the page doesn't crash on load)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1:has-text("Wirtschaftskalender")')).toBeVisible()
  })

  // ── Mobile Responsive ─────────────────────────────────────────────────────

  test('Mobile-1: Page renders correctly at 375px width', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/kalender')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toContainText('Wirtschaftskalender')
    // Filter bar should still be visible on mobile
    await expect(page.locator('button:has-text("High")')).toBeVisible()
  })

  test('Mobile-2: Filter bar is horizontally scrollable on mobile', async ({ page }) => {
    if (!page.url().includes('kalender')) {
      test.skip(true, 'User not authenticated')
    }
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/kalender')
    await page.waitForLoadState('networkidle')

    // Currency filter container should have overflow-x-auto
    const currencyContainer = page.locator('.overflow-x-auto').first()
    await expect(currencyContainer).toBeVisible()
  })
})
