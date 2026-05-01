import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-12 Morning Briefing', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test.beforeEach(async ({ page }) => {
    // Clear morning briefing localStorage so overlay appears fresh
    await page.goto(`${BASE}/login`)
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0]
      localStorage.removeItem(`tradeos-morning-${today}`)
    })
  })

  test('AC-1+2: Overlay appears on first app visit of the day', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    // Overlay should be visible (not yet dismissed today)
    const overlay = page.locator('[data-testid="morning-briefing"]').or(
      page.getByText('Bereit zum Traden')
    )
    await expect(overlay).toBeVisible({ timeout: 5000 })
  })

  test('AC-3: Overlay has 5 checklist items', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const checkboxes = page.getByRole('checkbox')
    await expect(checkboxes).toHaveCount(5, { timeout: 5000 })
  })

  test('AC-4: "Bereit zum Traden" button disabled until all items checked', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const button = page.getByRole('button', { name: /Bereit zum Traden/i })
    await expect(button).toBeDisabled({ timeout: 5000 })

    // Check all checkboxes
    const checkboxes = page.getByRole('checkbox')
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click()
    }
    await expect(button).toBeEnabled()
  })

  test('AC-5: "Überspringen" closes overlay immediately', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const skipLink = page.getByText(/Überspringen/i)
    await expect(skipLink).toBeVisible({ timeout: 5000 })
    await skipLink.click()
    await expect(skipLink).not.toBeVisible({ timeout: 3000 })
  })

  test('AC-7: Overlay does not reappear after dismissal on same day', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const skipLink = page.getByText(/Überspringen/i)
    await skipLink.click()

    // Reload and verify overlay is gone
    await page.reload()
    await expect(page.getByText(/Überspringen/i)).not.toBeVisible({ timeout: 3000 })
  })
})
