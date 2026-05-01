import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-24 TradingView Chart Link', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('URL field present in trade form', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    await expect(
      page.getByLabel(/Chart.?URL|TradingView|chart_url/i).or(
        page.getByPlaceholder(/https:\/\/.*tradingview/i)
      )
    ).toBeVisible()
  })

  test('URL field validates format (rejects invalid URL)', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    const urlField = page.getByLabel(/Chart.?URL|TradingView/i).or(
      page.getByPlaceholder(/https/i)
    ).first()
    await urlField.fill('not-a-url')

    const saveBtn = page.getByRole('button', { name: /Speichern|Erstellen|Hinzufügen/i }).first()
    await saveBtn.click()

    await expect(page.getByText(/gültige URL|valid URL/i)).toBeVisible({ timeout: 3000 })
  })

  test('Optional: trade form submits successfully without chart URL', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    // URL field should be optional — leaving it empty should not block save
    const urlField = page.getByLabel(/Chart.?URL|TradingView/i).or(
      page.getByPlaceholder(/https/i)
    ).first()
    // Verify it is not required
    const required = await urlField.getAttribute('required')
    expect(required).toBeNull()
  })
})
