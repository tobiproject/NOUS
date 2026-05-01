import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('PROJ-30 API auth protection', () => {
  test('GET /api/ai-settings requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai-settings`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/ai-settings requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai-settings`, {
      data: { provider: 'anthropic', api_key: 'sk-ant-test', model: 'claude-sonnet-4-6' },
    })
    expect(res.status()).toBe(401)
  })
})

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-30 Multi-AI Provider UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('Settings page has AI provider section', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(
      page.getByText(/KI.?Provider|AI.?Provider|Claude|OpenAI/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('Provider toggle between Claude and GPT is present', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(
      page.getByRole('radio', { name: /Claude|Anthropic/i }).or(
        page.getByRole('button', { name: /Claude|Anthropic/i })
      ).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('API key input field is present', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(
      page.getByLabel(/API.?Key|api_key/i).or(
        page.getByPlaceholder(/sk-ant|sk-|API Key/i)
      ).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('Billing link is shown for the selected provider', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(
      page.getByRole('link', { name: /Billing|Usage|console\.anthropic|platform\.openai/i }).first()
    ).toBeVisible({ timeout: 5000 })
  })
})
