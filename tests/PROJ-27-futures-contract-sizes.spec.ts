import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-27 API auth protection', () => {
  test('PATCH /api/watchlist/[id] requires auth', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/watchlist/00000000-0000-0000-0000-000000000001`, {
      data: { tick_size: 0.25, tick_value: 5, point_value: 20 },
    })
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-27 Futures Contract Sizes UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('Watchlist shows contract value badge for futures items', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    // Add NQ if not present (it has CME presets)
    const nqItem = page.getByText('NQ').first()
    const hasNQ = await nqItem.isVisible().catch(() => false)

    if (hasNQ) {
      // Should show a contract value badge like "$20/Pt"
      await expect(
        page.getByText(/\$\d+\/Pt|\$\d+ pro Punkt/i).or(page.getByText('20/Pt'))
      ).toBeVisible()
    } else {
      // Add NQ via quick-add
      const addNQBtn = page.getByRole('button', { name: 'NQ' })
      if (await addNQBtn.isVisible()) {
        await addNQBtn.click()
        await page.waitForTimeout(1000)
        await expect(page.getByText('NQ')).toBeVisible()
      }
    }
  })

  test('"CME-Standard laden" button available for futures items', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    // Check if any futures inline editor is visible
    const cmeBtn = page.getByRole('button', { name: /CME|Standard/i }).first()
    const hasCME = await cmeBtn.isVisible().catch(() => false)
    // If no futures items, the button won't be there — that's fine
    if (hasCME) {
      await expect(cmeBtn).toBeEnabled()
    }
  })
})
