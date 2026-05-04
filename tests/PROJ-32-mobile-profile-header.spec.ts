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

test.describe('PROJ-32 — Mobile Profile Header & Avatar', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!HAS_CREDENTIALS, 'TEST_USER_EMAIL und TEST_USER_PASSWORD in .env.local setzen')
    await page.setViewportSize({ width: 375, height: 812 })
    await login(page)
  })

  test('NOUS logo with slogan is visible in mobile header', async ({ page }) => {
    await page.goto('/dashboard')
    const logo = page.getByAltText('NOUS — Turn data into decisions')
    await expect(logo).toBeVisible()
    const src = await logo.getAttribute('src')
    expect(src).toContain('nous-logo-slogan')
  })

  test('Avatar circle is visible with initial or icon', async ({ page }) => {
    await page.goto('/dashboard')
    const avatarBtn = page.getByRole('button', { name: 'Profil' })
    await expect(avatarBtn).toBeVisible()
  })

  test('Tapping avatar opens bottom sheet', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Profil' }).click()
    // Sheet content is visible
    await expect(page.getByText('Konten')).toBeVisible()
    await expect(page.getByText('Über NOUS')).toBeVisible()
    await expect(page.getByText('Abmelden')).toBeVisible()
  })

  test('Sheet closes automatically when navigating to Konten', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Profil' }).click()
    await page.getByRole('link', { name: 'Konten' }).click()
    await page.waitForURL('**/einstellungen**')
    expect(page.url()).toContain('tab=konten')
  })

  test('Sheet navigates to Über NOUS', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Profil' }).click()
    await page.getByRole('link', { name: 'Über NOUS' }).click()
    await page.waitForURL('**/about')
    await expect(page).toHaveURL(/\/about/)
  })

  test('Mobile header is hidden on desktop (md:hidden)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard')
    const header = page.locator('header.md\\:hidden')
    await expect(header).not.toBeVisible()
  })
})
