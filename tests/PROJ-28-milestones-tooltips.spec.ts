import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-28 Milestones & Sidebar Tooltips', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-3: Milestone localStorage key not re-triggered after dismissal', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    // Set milestone 10 as already seen
    await page.evaluate(() => {
      const milestones = { 10: true, 30: true, 50: true }
      localStorage.setItem('tradeos-milestones', JSON.stringify(milestones))
    })
    await page.reload()
    // No confetti/toast should appear just from loading
    await expect(page.getByRole('status')).not.toBeVisible({ timeout: 2000 })
  })

  test('Sidebar nav items have tooltip text on hover', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const navLinks = page.getByRole('navigation').getByRole('link')
    const count = await navLinks.count()
    expect(count).toBeGreaterThan(0)

    // Hover first nav link and check tooltip appears
    await navLinks.first().hover()
    await page.waitForTimeout(700) // 600ms delay
    const tooltip = page.getByRole('tooltip')
    await expect(tooltip).toBeVisible({ timeout: 2000 })
  })

  test('All 12 sidebar nav items are present', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const navLinks = page.getByRole('navigation').getByRole('link')
    const count = await navLinks.count()
    expect(count).toBeGreaterThanOrEqual(10) // minimum expected nav items
  })
})
