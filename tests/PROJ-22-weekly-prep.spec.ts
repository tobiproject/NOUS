import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-22 API auth protection', () => {
  test('POST /api/ai/weekly-prep requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/weekly-prep`, {
      data: { account_id: '00000000-0000-0000-0000-000000000001' },
    })
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-22 Weekly AI Prep UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-1: WeeklyPrepCard visible on dashboard', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await expect(
      page.getByText(/Wochenvorbereitung|Weekly Prep|Generieren/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('AC-2: "Generieren" button is clickable', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const generateBtn = page.getByRole('button', { name: /Generieren/i }).first()
    await expect(generateBtn).toBeVisible()
    await expect(generateBtn).toBeEnabled()
  })
})
