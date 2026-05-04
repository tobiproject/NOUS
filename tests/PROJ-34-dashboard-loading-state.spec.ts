import { test, expect, type Page } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_USER_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || ''
const HAS_CREDENTIALS = !!TEST_EMAIL && !!TEST_PASSWORD

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-Mail').fill(TEST_EMAIL)
  await page.getByLabel('Passwort', { exact: true }).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Einloggen' }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

test.describe('PROJ-34 — Dashboard Loading State (kein Flash)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!HAS_CREDENTIALS, 'TEST_USER_EMAIL und TEST_USER_PASSWORD in .env.local setzen')
  })

  test('Dashboard never shows "keine aktiven Trades" during initial load', async ({ page }) => {
    // Throttle network to make loading state visible
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024,  // 50 KB/s (slow)
      uploadThroughput: 50 * 1024,
      latency: 200,
    })

    await login(page)

    // Navigate fresh and check that empty state text never appears while loading
    const emptyStateTexts = ['keine aktiven Trades', 'Keine Trades', 'Noch keine Einträge']

    // Monitor: check immediately after navigation, before data loads
    await page.goto('/dashboard')

    for (const text of emptyStateTexts) {
      // If the page shows the text, it should only be after loading
      const locator = page.getByText(text, { exact: false })
      const count = await locator.count()
      if (count > 0) {
        // Verify it only shows after loading is complete (no skeleton visible at same time)
        const skeleton = page.locator('[data-skeleton], .animate-pulse').first()
        const skeletonVisible = await skeleton.isVisible()
        expect(skeletonVisible).toBe(false)
      }
    }
  })

  test('Dashboard shows skeleton on initial load', async ({ page }) => {
    // Intercept API calls to delay them
    await page.route('**/api/dashboard-metrics**', async route => {
      await new Promise(r => setTimeout(r, 800))
      route.continue()
    })

    await login(page)
    await page.goto('/dashboard')

    // During the artificial delay, skeletons should be visible
    const skeletons = page.locator('.animate-pulse')
    // After login redirect, data might be loading — check within a short window
    await page.waitForTimeout(100)
    const skeletonCount = await skeletons.count()
    expect(skeletonCount).toBeGreaterThan(0)
  })

  test('Dashboard loads and shows real data after skeleton phase', async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')

    // Wait for data to load — greeting should be visible
    await expect(page.getByText(/Guten (Morgen|Tag|Abend)/)).toBeVisible({ timeout: 15000 })
  })
})
