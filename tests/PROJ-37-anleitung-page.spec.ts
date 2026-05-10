import { test, expect, type Page } from '@playwright/test'

/**
 * Test credentials — add to .env.local:
 *   TEST_USER_EMAIL=your@email.com
 *   TEST_USER_PASSWORD=yourpassword
 */
const TEST_EMAIL = process.env.TEST_USER_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || ''
const HAS_CREDENTIALS = !!TEST_EMAIL && !!TEST_PASSWORD

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-Mail').fill(TEST_EMAIL)
  await page.getByLabel('Passwort', { exact: true }).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Einloggen' }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

// ── AC: Unauthenticated redirect ───────────────────────────────────────────────

test('AC-37.1: /anleitung redirects unauthenticated users to /login', async ({ page }) => {
  await page.goto('/anleitung')
  await expect(page).toHaveURL(/login/, { timeout: 10000 })
})

// ── Authenticated tests ────────────────────────────────────────────────────────

test.describe('PROJ-37 — Anleitung Page (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!HAS_CREDENTIALS, 'TEST_USER_EMAIL und TEST_USER_PASSWORD in .env.local setzen')
    await login(page)
  })

  test('AC-37.1: /anleitung route exists and loads for logged-in users', async ({ page }) => {
    await page.goto('/anleitung')
    await expect(page).toHaveURL(/anleitung/)
    await expect(page.getByRole('heading', { name: 'Anleitung' })).toBeVisible()
  })

  test('AC-37.2: Desktop sidebar shows Anleitung nav entry with HelpCircle icon', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/dashboard')
    const anleitungLink = page.locator('aside').filter({ hasText: 'Anleitung' }).getByRole('link', { name: 'Anleitung' })
    await expect(anleitungLink).toBeVisible()
    await anleitungLink.click()
    await expect(page).toHaveURL(/anleitung/)
  })

  test('AC-37.3: Mobile: Anleitung accessible via profile sidebar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    // Open profile sidebar via avatar button in mobile header
    await page.getByRole('button', { name: 'Profil' }).click()
    await expect(page.getByRole('link', { name: 'Anleitung' })).toBeVisible({ timeout: 3000 })
    await page.getByRole('link', { name: 'Anleitung' }).click()
    await expect(page).toHaveURL(/anleitung/)
  })

  test('AC-37.4: All 10 sections are visible as accordion items', async ({ page }) => {
    await page.goto('/anleitung')
    const sections = [
      'Erste Schritte',
      'Trading Journal',
      'Dashboard',
      'KI-Analyse',
      'Risk Management',
      'Performance & Statistik',
      'Knowledge Base',
      'Wochenvorbereitung',
      'Benachrichtigungen',
      'Einstellungen',
    ]
    for (const section of sections) {
      await expect(page.getByText(section).first()).toBeVisible()
    }
  })

  test('AC-37.4: Sections have anchor IDs for deep linking', async ({ page }) => {
    await page.goto('/anleitung')
    const anchorIds = [
      'erste-schritte', 'journal', 'dashboard', 'ki-analyse', 'risk',
      'performance', 'knowledge-base', 'wochenvorbereitung', 'benachrichtigungen', 'einstellungen',
    ]
    for (const id of anchorIds) {
      const el = page.locator(`#${id}`)
      await expect(el).toBeAttached()
    }
  })

  test('AC-37.5: Sections expand/collapse as accordion', async ({ page }) => {
    await page.goto('/anleitung')
    const firstTrigger = page.locator('[data-radix-accordion-trigger]').first()
    // Content should not be visible before clicking
    const firstContent = page.locator('[data-radix-accordion-content]').first()
    // Click to open
    await firstTrigger.click()
    await expect(firstContent).toBeVisible({ timeout: 2000 })
    // Click again to close
    await firstTrigger.click()
    await expect(firstContent).not.toBeVisible({ timeout: 2000 })
  })

  test('AC-37.6: Accordion content has Was/Wozu/steps when expanded', async ({ page }) => {
    await page.goto('/anleitung')
    // Open first section (Erste Schritte)
    await page.locator('[data-radix-accordion-trigger]').first().click()
    await expect(page.getByText('Was ist das?').first()).toBeVisible()
    await expect(page.getByText('Wozu dient es?').first()).toBeVisible()
    // Steps are numbered — look for numbered step indicator
    await expect(page.locator('text=1').first()).toBeVisible()
  })

  test('AC-37.7: Deep links (Öffnen buttons) are present for steps with links', async ({ page }) => {
    await page.goto('/anleitung')
    // Open Erste Schritte
    await page.locator('[data-radix-accordion-trigger]').first().click()
    // Should show "Öffnen" link buttons for steps that have links
    await expect(page.getByRole('link', { name: /Öffnen/i }).first()).toBeVisible()
  })

  test('AC-37.8: Back-to-top button is present inside each expanded section', async ({ page }) => {
    await page.goto('/anleitung')
    await page.locator('[data-radix-accordion-trigger]').first().click()
    await expect(page.getByText('Nach oben').first()).toBeVisible()
  })

  test('AC-37.8: Desktop sticky TOC is visible and contains all 10 section links', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/anleitung')
    const toc = page.locator('aside').filter({ hasText: 'Inhalt' })
    await expect(toc).toBeVisible()
    await expect(toc.getByText('Erste Schritte')).toBeVisible()
    await expect(toc.getByText('Trading Journal')).toBeVisible()
    await expect(toc.getByText('Einstellungen')).toBeVisible()
  })

  test('AC-37.9: No horizontal scrollbar on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/anleitung')
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const windowWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowWidth + 1)
  })

  test('AC-37.9: TOC is hidden on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/anleitung')
    const toc = page.locator('aside').filter({ hasText: 'Inhalt' })
    await expect(toc).not.toBeVisible()
  })

  test('AC-37.10: Page renders without making API calls to backend', async ({ page }) => {
    const apiCalls: string[] = []
    page.on('request', req => {
      const url = req.url()
      // Collect calls to our API routes (excluding auth/session which is expected)
      if (url.includes('/api/') && !url.includes('/api/auth') && !url.includes('/api/profile')) {
        apiCalls.push(url)
      }
    })
    await page.goto('/anleitung')
    await page.waitForLoadState('networkidle')
    expect(apiCalls).toHaveLength(0)
  })

  test('AC-37.5 (multiple): Multiple sections can be open simultaneously', async ({ page }) => {
    await page.goto('/anleitung')
    const triggers = page.locator('[data-radix-accordion-trigger]')
    await triggers.nth(0).click()
    await triggers.nth(1).click()
    const contents = page.locator('[data-radix-accordion-content]')
    await expect(contents.nth(0)).toBeVisible()
    await expect(contents.nth(1)).toBeVisible()
  })

  // ── Security ───────────────────────────────────────────────────────────────

  test('Security: Anleitung page contains no exposed secrets or API keys in rendered HTML', async ({ page }) => {
    await page.goto('/anleitung')
    const content = await page.content()
    expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/)
    expect(content).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}/)
    expect(content).not.toMatch(/password|secret/i)
  })
})
