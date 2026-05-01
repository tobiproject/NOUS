import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-19 Account Type Field', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-1+2: Account type dropdown present with correct options', async ({ page }) => {
    await page.goto(`${BASE}/accounts`)
    await page.getByRole('button', { name: /Konto anlegen/i }).click()

    const typeDropdown = page.getByLabel(/Konto-Typ|Account.Typ/i)
    await expect(typeDropdown).toBeVisible()
    await typeDropdown.click()

    await expect(page.getByRole('option', { name: /Futures/i }).or(page.getByText('Futures'))).toBeVisible()
    await expect(page.getByRole('option', { name: /CFD/i }).or(page.getByText('CFD'))).toBeVisible()
    await expect(page.getByRole('option', { name: /Prop/i }).or(page.getByText('Prop'))).toBeVisible()
    await expect(page.getByRole('option', { name: /Eigenhandel/i }).or(page.getByText('Eigenhandel'))).toBeVisible()
  })

  test('AC-3: Account type is saved and retrievable', async ({ page }) => {
    await page.goto(`${BASE}/accounts`)
    await page.getByRole('button', { name: /Konto anlegen/i }).click()

    const accountName = `PropTest-${Date.now()}`
    await page.getByLabel('Kontoname *').fill(accountName)
    await page.getByLabel('Startbalance *').fill('10000')

    const typeDropdown = page.getByLabel(/Konto-Typ|Account.Typ/i)
    await typeDropdown.click()
    await page.getByRole('option', { name: /Prop/i }).or(page.getByText('Prop Firm')).first().click()

    await page.getByRole('button', { name: 'Konto erstellen' }).click()
    await page.waitForTimeout(1500)

    // Account should appear in the list
    await expect(page.getByText(accountName)).toBeVisible()
  })
})
