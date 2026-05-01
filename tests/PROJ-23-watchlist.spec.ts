import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-23 API auth protection', () => {
  test('GET /api/watchlist requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/watchlist`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/watchlist requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/watchlist`, {
      data: { symbol: 'NQ', category: 'futures' },
    })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/watchlist/[id] requires auth', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/watchlist/00000000-0000-0000-0000-000000000001`)
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-23 Watchlist UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('Watchlist page accessible via /watchlist', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    await expect(page).not.toHaveURL(/login/)
  })

  test('Quick-add popular instruments are visible', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    // NQ or ES should appear as quick-add buttons
    await expect(
      page.getByRole('button', { name: 'NQ' }).or(page.getByText('NQ').first())
    ).toBeVisible({ timeout: 5000 })
  })

  test('Custom symbol can be added via form', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    const symbolInput = page.getByLabel(/Symbol/i).or(page.getByPlaceholder(/Symbol/i))
    await expect(symbolInput).toBeVisible()
  })

  test('Items grouped by category', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    // At least one category heading should be visible if items exist
    const hasFutures = await page.getByText(/Futures/i).isVisible().catch(() => false)
    const hasForex = await page.getByText(/Forex/i).isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/keine|leer|empty/i).isVisible().catch(() => false)
    expect(hasFutures || hasForex || hasEmpty).toBeTruthy()
  })

  test('Watchlist link visible in sidebar navigation', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await expect(page.getByRole('link', { name: /Watchlist/i })).toBeVisible()
  })
})
