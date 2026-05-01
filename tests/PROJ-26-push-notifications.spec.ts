import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-26 API auth protection', () => {
  test('POST /api/notifications/subscribe requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/notifications/subscribe`, {
      data: { subscription: {} },
    })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/notifications/subscribe requires auth', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/notifications/subscribe`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/notifications/settings requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/notifications/settings`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/notifications/settings requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/notifications/settings`, {
      data: { push_enabled: true },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/cron/weekly-reminder requires CRON_SECRET', async ({ request }) => {
    const res = await request.get(`${BASE}/api/cron/weekly-reminder`)
    // Without correct secret, should be 401 or 403
    expect([401, 403]).toContain(res.status())
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-26 Push Notifications UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('Settings page has push notification toggle', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(
      page.getByText(/Push|Benachrichtigung/i).first()
    ).toBeVisible({ timeout: 5000 })
    await expect(
      page.getByRole('switch').or(page.locator('input[type="checkbox"]')).first()
    ).toBeVisible()
  })
})
