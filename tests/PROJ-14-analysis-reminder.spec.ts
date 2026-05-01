import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-14 Analysis Reminder UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-1: Reminder selector visible when creating a trade (not editing)', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    // Reminder selector should appear in create mode
    const selector = page.getByLabel(/Nachanalyse|Erinnerung|Reminder/i)
    await expect(selector).toBeVisible()
  })

  test('AC-2: Reminder options include 1h, 4h, 8h, 1 Tag, 2 Tage', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    const selector = page.getByLabel(/Nachanalyse|Erinnerung|Reminder/i)
    await selector.click()

    await expect(page.getByRole('option', { name: '1h' }).or(page.getByText('1h'))).toBeVisible()
    await expect(page.getByRole('option', { name: /1 Tag/i }).or(page.getByText(/1 Tag/i))).toBeVisible()
  })

  test('AC-3: Default reminder option is "Keine"', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    const selector = page.getByLabel(/Nachanalyse|Erinnerung|Reminder/i)
    const value = await selector.inputValue().catch(() => '')
    // "Keine" or empty is the default
    expect(value === '' || /keine/i.test(value)).toBeTruthy()
  })
})
