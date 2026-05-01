import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-15 API auth protection', () => {
  test('POST /api/ai/analyze-simulation requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/analyze-simulation`, {
      multipart: {
        account_id: '00000000-0000-0000-0000-000000000001',
        trade_id: '00000000-0000-0000-0000-000000000002',
      },
    })
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-15 Trade Simulation UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-1: Simulation tab visible in trade detail sheet', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    // Click first trade row to open detail sheet
    const firstTrade = page.getByRole('row').nth(1)
    await firstTrade.click()

    await expect(page.getByRole('tab', { name: /Simulation/i })).toBeVisible({ timeout: 5000 })
  })

  test('AC-2+3: Simulation tab shows entry, SL and max price input', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const firstTrade = page.getByRole('row').nth(1)
    await firstTrade.click()

    await page.getByRole('tab', { name: /Simulation/i }).click()

    await expect(page.getByText(/Entry|Einstieg/i).first()).toBeVisible()
    await expect(page.getByText(/Stop Loss|SL/i).first()).toBeVisible()
    await expect(page.getByLabel(/Maximal|Hochpunkt|Tiefpunkt/i).or(
      page.getByPlaceholder(/Maximal/i)
    )).toBeVisible()
  })
})
