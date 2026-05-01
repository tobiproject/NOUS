import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-25 API auth protection', () => {
  test('POST /api/ai/roadmap requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/roadmap`, {
      data: { account_id: '00000000-0000-0000-0000-000000000001' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/weekly-plan requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/weekly-plan`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/trades/[id]/review requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/trades/00000000-0000-0000-0000-000000000001/review`)
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-25 Trader Journey UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('/roadmap page is accessible', async ({ page }) => {
    await page.goto(`${BASE}/roadmap`)
    await expect(page).not.toHaveURL(/login/)
  })

  test('/wochenvorbereitung page is accessible', async ({ page }) => {
    await page.goto(`${BASE}/wochenvorbereitung`)
    await expect(page).not.toHaveURL(/login/)
  })

  test('Roadmap page has generate button', async ({ page }) => {
    await page.goto(`${BASE}/roadmap`)
    await expect(
      page.getByRole('button', { name: /Generieren|Analyse starten/i })
    ).toBeVisible({ timeout: 5000 })
  })

  test('Roadmap shows trading level visualization', async ({ page }) => {
    await page.goto(`${BASE}/roadmap`)
    await expect(
      page.getByText(/Beginner|Developing|Consistent|Profitabel/i).first()
    ).toBeVisible({ timeout: 5000 })
  })
})
