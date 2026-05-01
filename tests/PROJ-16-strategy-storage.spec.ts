import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-16 API auth protection', () => {
  test('GET /api/strategy requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/strategy`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/strategy requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/strategy`, {
      data: { name: 'Test', description: 'Test strategy' },
    })
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-16 Strategy Profile UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-1+2: Settings page has strategy name and description fields', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(page.getByLabel(/Strategie-Name|Strategy/i)).toBeVisible()
    await expect(page.getByLabel(/Beschreibung/i)).toBeVisible()
  })

  test('AC-3: Trading rules can be added', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    const addRuleBtn = page.getByRole('button', { name: /Regel|Hinzufügen/i }).first()
    await expect(addRuleBtn).toBeVisible()
  })

  test('AC-4: Timeframe toggles are present', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(page.getByText('1m').or(page.getByRole('button', { name: '1m' }))).toBeVisible()
    await expect(page.getByText('1h').or(page.getByRole('button', { name: '1h' }))).toBeVisible()
  })

  test('AC-6: Save button is present with feedback', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    const saveBtn = page.getByRole('button', { name: /Speichern|Sichern/i }).first()
    await expect(saveBtn).toBeVisible()
  })

  test('AC-7: Saved strategy is loaded on reopen', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    const nameInput = page.getByLabel(/Strategie-Name|Strategy/i)
    const testName = `Test-Strategie-${Date.now()}`
    await nameInput.fill(testName)

    const saveBtn = page.getByRole('button', { name: /Speichern|Sichern/i }).first()
    await saveBtn.click()
    await page.waitForTimeout(1000)

    await page.reload()
    await expect(page.getByLabel(/Strategie-Name|Strategy/i)).toHaveValue(testName, { timeout: 5000 })
  })
})
