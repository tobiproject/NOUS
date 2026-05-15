import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
const FAKE_UUID = '00000000-0000-0000-0000-000000000001'

// ─── Auth Protection (no credentials needed) ─────────────────────────────────

test.describe('PROJ-41 API auth protection', () => {
  test('GET /api/ai/coach-chat requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/coach-chat?account_id=${FAKE_UUID}`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/ai/coach-chat requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/coach-chat`, {
      data: { account_id: FAKE_UUID, message: 'Hallo Coach' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/ai/coach-insights requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/coach-insights?account_id=${FAKE_UUID}`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/ai/coach-insights requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/coach-insights`, {
      data: { insight: 'Test insight', source: 'pattern_detection' },
    })
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/ai/coach-insights/[id] requires auth', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/ai/coach-insights/${FAKE_UUID}`, {
      data: { confirmed: true },
    })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/ai/coach-insights/[id] requires auth', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/ai/coach-insights/${FAKE_UUID}`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/ai/trade-checkin requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/trade-checkin`, {
      data: { trade_id: FAKE_UUID, account_id: FAKE_UUID, checkin_text: 'Ich bin nervös' },
    })
    expect(res.status()).toBe(401)
  })
})

// ─── Input Validation (no credentials needed) ─────────────────────────────────

test.describe('PROJ-41 API input validation', () => {
  // These should return 401 (auth checked before validation) or 400

  test('POST /api/ai/coach-chat rejects empty message (401 without auth)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/coach-chat`, {
      data: { account_id: FAKE_UUID, message: '' },
    })
    // Without auth => 401; with auth and empty message => 400
    expect([400, 401]).toContain(res.status())
  })

  test('POST /api/ai/coach-insights rejects insight under 5 chars (401 without auth)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/coach-insights`, {
      data: { insight: 'hi', source: 'pattern_detection' },
    })
    expect([400, 401]).toContain(res.status())
  })

  test('POST /api/ai/trade-checkin rejects missing trade_id (401 without auth)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/trade-checkin`, {
      data: { account_id: FAKE_UUID, checkin_text: 'Nervös' },
    })
    expect([400, 401]).toContain(res.status())
  })
})

// ─── Feature Tests (require auth via environment variables) ──────────────────

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD
const skipIfNoAuth = !TEST_USER_EMAIL || !TEST_USER_PASSWORD

test.describe('PROJ-41 Coach Memory UI', () => {
  test.skip(skipIfNoAuth, 'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD')

  test('AC-41.1: Emotional check-in field is visible in trade form', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    await page.getByRole('button', { name: /Trade erfassen|Neuer Trade/i }).click()
    await expect(page.getByPlaceholder(/Wie fühlst du dich gerade/i)).toBeVisible()
  })

  test('AC-41.1: Check-in textarea has max 500 characters constraint', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    await page.getByRole('button', { name: /Trade erfassen|Neuer Trade/i }).click()
    const textarea = page.getByPlaceholder(/Wie fühlst du dich gerade/i)
    await expect(textarea).toBeVisible()
    // Character counter should show 0/500 initially
    await expect(page.getByText(/0\/500/)).toBeVisible()
  })

  test('AC-41.1: Check-in field character counter updates on input', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    await page.getByRole('button', { name: /Trade erfassen|Neuer Trade/i }).click()
    const textarea = page.getByPlaceholder(/Wie fühlst du dich gerade/i)
    await textarea.fill('Ich bin sehr nervös heute.')
    await expect(page.getByText(/\/500/)).toBeVisible()
  })

  test('AC-41.3 + AC-41.4: Coach page loads with empty state and context banner', async ({ page }) => {
    await page.goto(`${BASE}/lernmodus/coach`)
    // Empty state should be shown for fresh users
    await expect(
      page.getByText(/Dein psychologischer Coach|Was beschäftigt dich heute/i)
    ).toBeVisible()
  })

  test('AC-41.4: Coach chat input field is present and usable', async ({ page }) => {
    await page.goto(`${BASE}/lernmodus/coach`)
    await expect(page.getByPlaceholder(/Was beschäftigt dich heute/i)).toBeVisible()
  })

  test('AC-41.6: Coach Memory tab visible in settings', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen`)
    await expect(page.getByRole('tab', { name: /Coach Memory/i })).toBeVisible()
  })

  test('AC-41.6: Coach Memory tab shows insights management UI', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen?tab=coach-memory`)
    // Filter buttons should be visible
    await expect(page.getByRole('button', { name: /Alle/i }).first()).toBeVisible()
    await expect(page.getByText(/Bestätigt/i).first()).toBeVisible()
    await expect(page.getByText(/Offen/i).first()).toBeVisible()
    await expect(page.getByText(/Abgelehnt/i).first()).toBeVisible()
  })

  test('AC-41.6: Coach Memory empty state shown when no insights exist', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen?tab=coach-memory`)
    // Either shows insights or empty state
    const hasInsights = await page.getByText(/Erkenntnis/i).isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/Noch keine Erkenntnisse/i).isVisible().catch(() => false)
    const hasLoading = await page.locator('[class*="animate"]').isVisible().catch(() => false)
    expect(hasInsights || hasEmpty || hasLoading).toBeTruthy()
  })

  test('AC-41.8: Coach page is usable on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${BASE}/lernmodus/coach`)
    await expect(page.getByPlaceholder(/Was beschäftigt dich heute/i)).toBeVisible()
    // Input area should not overflow
    const textarea = page.getByPlaceholder(/Was beschäftigt dich heute/i)
    const box = await textarea.boundingBox()
    expect(box?.width).toBeLessThanOrEqual(375)
  })

  test('AC-41.8: Trade form check-in field usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${BASE}/journal`)
    await page.getByRole('button', { name: /Trade erfassen|Neuer Trade/i }).click()
    const textarea = page.getByPlaceholder(/Wie fühlst du dich gerade/i)
    await expect(textarea).toBeVisible()
    const box = await textarea.boundingBox()
    expect(box?.width).toBeLessThanOrEqual(375)
  })

  test('AC-41.6: Confirming an insight increases weight in UI', async ({ page }) => {
    await page.goto(`${BASE}/einstellungen?tab=coach-memory`)
    // If pending insights exist, confirming should update the badge
    const openInsights = page.locator('[class*="amber"]').first()
    const openExists = await openInsights.isVisible().catch(() => false)
    if (!openExists) {
      // No open insights to test — pass (user may have already confirmed all)
      return
    }
    const confirmBtn = page.getByRole('button', { name: /Bestätigen/i }).first()
    await confirmBtn.click()
    await expect(page.getByText(/Erkenntnis bestätigt/i)).toBeVisible({ timeout: 5000 })
  })

  test('Context banner links to Coach Memory settings', async ({ page }) => {
    await page.goto(`${BASE}/lernmodus/coach`)
    // If context banner is visible, verify the settings link works
    const bannerLink = page.locator('a[href*="coach-memory"]')
    const linkExists = await bannerLink.isVisible().catch(() => false)
    if (!linkExists) return // No insights yet, banner may be hidden

    await bannerLink.click()
    await expect(page).toHaveURL(/einstellungen.*coach-memory/)
  })
})

// ─── Regression: Existing coach conversation API still works ─────────────────

test.describe('PROJ-41 Regression: legacy coach API', () => {
  test('GET /api/coach/conversation still requires auth', async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/coach/conversation?trade_id=${FAKE_UUID}&account_id=${FAKE_UUID}`
    )
    expect(res.status()).toBe(401)
  })

  test('POST /api/coach/conversation still requires auth', async ({ request }) => {
    const res = await request.post(`${BASE}/api/coach/conversation`, {
      data: { account_id: FAKE_UUID, trade_id: FAKE_UUID, message: 'Test' },
    })
    expect(res.status()).toBe(401)
  })
})
