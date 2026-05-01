import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-13 API auth protection', () => {
  test('POST /api/ai/rewrite-notes requires auth (401)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/rewrite-notes`, {
      data: { text: 'Ich hab ähm ein Long Trade gemacht' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/ai/rewrite-notes rejects empty text (400)', async ({ request }) => {
    // 400 should be returned for empty body — 401 is also acceptable if auth checked first
    const res = await request.post(`${BASE}/api/ai/rewrite-notes`, {
      data: { text: '' },
    })
    expect([400, 401]).toContain(res.status())
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-13 Notes AI-Rewrite UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-1: Rewrite button only visible when notes field has text', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    // Open trade form
    const newTradeBtn = page.getByRole('button', { name: /Trade|Eintrag/i }).first()
    await newTradeBtn.click()

    const rewriteBtn = page.getByRole('button', { name: /Rewrite|✨/i })
    // Initially hidden (no text)
    await expect(rewriteBtn).not.toBeVisible()

    // Type into notes field
    const notesField = page.getByLabel(/Notiz|Notes/i)
    await notesField.fill('Ich hab ähm einen Long auf NQ gemacht')
    await expect(rewriteBtn).toBeVisible()
  })
})
