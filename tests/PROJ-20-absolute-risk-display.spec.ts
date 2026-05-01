import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-20 Absolute Risk Display', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-1+4: Absolute risk amount appears when all calc fields are filled', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    // Fill required calculation fields
    await page.getByLabel(/Asset|Symbol/i).fill('NQ')
    await page.getByLabel(/Entry/i).fill('20000')
    await page.getByLabel(/Stop.?Loss|SL/i).fill('19900')
    await page.getByLabel(/Kontrakte|Lots|Menge/i).fill('1')

    // Absolute risk display should now appear (e.g. "150.00 EUR" or "150.00 USD")
    await expect(
      page.getByText(/\d+[.,]\d{2}\s*(EUR|USD|CHF|GBP)/i)
    ).toBeVisible({ timeout: 3000 })
  })

  test('AC-4: Risk amount not shown when fields are empty', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    // Without filling fields, no EUR/USD amount should show in the calc preview
    const calcPreview = page.locator('[data-testid="calc-preview"]').or(
      page.getByText(/Risk %/i).locator('..')
    )
    await expect(calcPreview).not.toContainText(/\d+[.,]\d{2}\s*(EUR|USD)/i)
  })
})
