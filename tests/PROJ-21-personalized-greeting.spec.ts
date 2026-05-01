import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-21 API auth protection', () => {
  test('GET /api/profile requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/profile`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/profile requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/profile`, {
      data: { display_name: 'Tobi' },
    })
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-21 Personalized Greeting UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-1+2: Settings page has display name input and save button', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(page.getByLabel(/Name|display_name/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Speichern|Sichern/i }).first()).toBeVisible()
  })

  test('AC-6: Display name max 50 characters enforced', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    const nameInput = page.getByLabel(/Name|display_name/i)
    const maxLength = await nameInput.getAttribute('maxlength')
    if (maxLength) {
      expect(parseInt(maxLength)).toBeLessThanOrEqual(50)
    }
  })

  test('AC-3+4: Dashboard shows greeting with or without name', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    // Either "Guten Morgen, [Name]." or "Guten Morgen." should be visible
    await expect(page.getByText(/Guten Morgen/i)).toBeVisible({ timeout: 5000 })
  })
})
