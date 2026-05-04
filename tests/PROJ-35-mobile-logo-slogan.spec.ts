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

test.describe('PROJ-35 — Mobile Header Logo mit Slogan', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!HAS_CREDENTIALS, 'TEST_USER_EMAIL und TEST_USER_PASSWORD in .env.local setzen')
  })

  test('NOUS logo with slogan is visible on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    await page.goto('/dashboard')
    const logo = page.getByAltText('NOUS — Turn data into decisions')
    await expect(logo).toBeVisible()
  })

  test('Logo is not clickable (no wrapping link)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    await page.goto('/dashboard')
    const logo = page.getByAltText('NOUS — Turn data into decisions')
    const parent = logo.locator('..')
    const tagName = await parent.evaluate(el => el.tagName.toLowerCase())
    expect(tagName).not.toBe('a')
  })

  test('Logo does not appear on desktop (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page)
    await page.goto('/dashboard')
    const logo = page.getByAltText('NOUS — Turn data into decisions')
    await expect(logo).not.toBeVisible()
  })

  test('Logo does not overflow on narrow screen (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await login(page)
    await page.goto('/dashboard')
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const windowWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 1)
  })

  test('Logo appears on multiple pages (navigation consistency)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
    const pages = ['/dashboard', '/journal', '/watchlist']
    for (const path of pages) {
      await page.goto(path)
      const logo = page.getByAltText('NOUS — Turn data into decisions')
      await expect(logo).toBeVisible({ timeout: 5000 })
    }
  })
})
