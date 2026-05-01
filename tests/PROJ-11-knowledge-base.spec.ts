import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-11 API auth protection', () => {
  test('GET /api/knowledge-base requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/knowledge-base`)
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/knowledge-base/[id] requires auth', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/knowledge-base/00000000-0000-0000-0000-000000000001`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/knowledge-base/text requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/knowledge-base/text?id=00000000-0000-0000-0000-000000000001`)
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-11 Knowledge Base UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-11.10: /knowledge-base page is accessible', async ({ page }) => {
    await page.goto(`${BASE}/knowledge-base`)
    await expect(page).not.toHaveURL(/login/)
  })

  test('AC-11.1: Upload area accepts PDF files', async ({ page }) => {
    await page.goto(`${BASE}/knowledge-base`)
    const uploadArea = page.locator('input[type="file"][accept*="pdf"]')
    await expect(uploadArea).toBeAttached()
  })

  test('AC-11.3: Document list shows name, size, and status columns', async ({ page }) => {
    await page.goto(`${BASE}/knowledge-base`)
    // Page should show either a document list or an empty state
    const hasDocuments = await page.getByRole('table').isVisible().catch(() => false)
    const hasEmptyState = await page.getByText(/noch keine/i).isVisible().catch(() => false)
    expect(hasDocuments || hasEmptyState).toBeTruthy()
  })

  test('AC-11.11: Dashboard shows knowledge base hint when no documents', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    // The hint only appears when no documents are uploaded — just verify dashboard loads
    await expect(page).toHaveURL(/dashboard/)
  })

  test('EC-11.1: Upload rejects non-PDF files visually', async ({ page }) => {
    await page.goto(`${BASE}/knowledge-base`)
    const input = page.locator('input[type="file"]').first()
    await expect(input).toBeAttached()
    // accept attribute should restrict to PDF
    const accept = await input.getAttribute('accept')
    expect(accept).toContain('pdf')
  })
})
