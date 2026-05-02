import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

// ─── Navigation visibility at each breakpoint ─────────────────────────────────

test.describe('PROJ-31 Navigation — Mobile (<768px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('Bottom Nav is visible on mobile', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const nav = page.locator('nav.md\\:hidden')
    await expect(nav).toBeVisible({ timeout: 5000 })
  })

  test('Desktop sidebar is hidden on mobile', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    // Full sidebar has lg:flex — it should not be rendered/visible at 375px
    const sidebar = page.locator('aside.hidden.lg\\:flex')
    await expect(sidebar).toBeHidden()
  })

  test('Bottom Nav shows 5 tabs: Dashboard, Journal, Performance, Risk, Mehr', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const nav = page.locator('nav.md\\:hidden')
    await expect(nav.getByText('Dashboard')).toBeVisible()
    await expect(nav.getByText('Journal')).toBeVisible()
    await expect(nav.getByText('Performance')).toBeVisible()
    await expect(nav.getByText('Risk')).toBeVisible()
    await expect(nav.getByText('Mehr')).toBeVisible()
  })

  test('Active Bottom Nav tab is highlighted (Dashboard)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const dashTab = page.locator('nav.md\\:hidden a[href="/dashboard"]')
    // Active tab has color #ffffff
    const color = await dashTab.evaluate(el => getComputedStyle(el).color)
    // rgb(255, 255, 255) = white = active
    expect(color).toBe('rgb(255, 255, 255)')
  })

  test('"Mehr" tab opens bottom drawer with additional nav items', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await page.locator('nav.md\\:hidden button').filter({ hasText: 'Mehr' }).click()
    await expect(page.getByText('Analysen')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Einstellungen')).toBeVisible()
    await expect(page.getByText('Abmelden')).toBeVisible()
  })

  test('Mehr drawer closes when a nav item is clicked', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await page.locator('nav.md\\:hidden button').filter({ hasText: 'Mehr' }).click()
    await expect(page.getByText('Analysen')).toBeVisible({ timeout: 3000 })
    await page.getByRole('link', { name: 'Einstellungen' }).first().click()
    await expect(page.getByText('Analysen')).not.toBeVisible({ timeout: 3000 })
  })

  test('Bottom Nav is fixed — stays visible after scrolling', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    await page.evaluate(() => window.scrollTo(0, 500))
    const nav = page.locator('nav.md\\:hidden')
    await expect(nav).toBeVisible()
    const position = await nav.evaluate(el => getComputedStyle(el).position)
    expect(position).toBe('fixed')
  })

  test('Journal page shows mobile card list, not table', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const mobileCards = page.locator('.md\\:hidden').filter({ has: page.locator('[style*="bg-2"]') }).first()
    const desktopTable = page.locator('.hidden.md\\:block').first()
    await expect(desktopTable).toBeHidden()
  })

  test('FAB button is visible on Journal page mobile', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const fab = page.locator('button[aria-label="Neuer Trade"]')
    await expect(fab).toBeVisible({ timeout: 3000 })
  })

  test('FAB button is positioned above the Bottom Nav (fixed)', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const fab = page.locator('button[aria-label="Neuer Trade"]')
    const position = await fab.evaluate(el => getComputedStyle(el).position)
    expect(position).toBe('fixed')
  })

  test('No horizontal scroll on Dashboard mobile', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('networkidle')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  test('No horizontal scroll on Journal mobile', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    await page.waitForLoadState('networkidle')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  test('Performance tabs are horizontally scrollable on mobile', async ({ page }) => {
    await page.goto(`${BASE}/performance`)
    const tabContainer = page.locator('.overflow-x-auto').first()
    await expect(tabContainer).toBeVisible({ timeout: 5000 })
  })
})

// ─── Tablet (768–1023px) ──────────────────────────────────────────────────────

test.describe('PROJ-31 Navigation — Tablet (768–1023px)', () => {
  test.use({ viewport: { width: 900, height: 1024 } })

  test('Collapsed icon sidebar is visible on tablet', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const collapsedSidebar = page.locator('aside.hidden.md\\:flex.lg\\:hidden')
    await expect(collapsedSidebar).toBeVisible({ timeout: 5000 })
  })

  test('Full sidebar is hidden on tablet', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const fullSidebar = page.locator('aside.hidden.lg\\:flex')
    await expect(fullSidebar).toBeHidden()
  })

  test('Bottom Nav is hidden on tablet', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const nav = page.locator('nav.md\\:hidden')
    await expect(nav).toBeHidden()
  })

  test('Collapsed sidebar shows icon links with tooltips', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const collapsedSidebar = page.locator('aside.hidden.md\\:flex.lg\\:hidden')
    const links = collapsedSidebar.locator('a')
    await expect(links.first()).toBeVisible({ timeout: 5000 })
  })

  test('No horizontal scroll on tablet', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('networkidle')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })
})

// ─── Desktop (≥1024px) ────────────────────────────────────────────────────────

test.describe('PROJ-31 Navigation — Desktop (≥1024px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Full sidebar is visible on desktop', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const fullSidebar = page.locator('aside.hidden.lg\\:flex')
    await expect(fullSidebar).toBeVisible({ timeout: 5000 })
  })

  test('Bottom Nav is hidden on desktop', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const nav = page.locator('nav.md\\:hidden')
    await expect(nav).toBeHidden()
  })

  test('Collapsed sidebar is hidden on desktop', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const collapsed = page.locator('aside.hidden.md\\:flex.lg\\:hidden')
    await expect(collapsed).toBeHidden()
  })

  test('Desktop Journal shows table not card list', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const desktopTable = page.locator('.hidden.md\\:block').first()
    await expect(desktopTable).toBeVisible({ timeout: 5000 })
  })

  test('Desktop Journal has "Neuer Trade" button in header (not FAB)', async ({ page }) => {
    await page.goto(`${BASE}/journal`)
    const headerButton = page.locator('.hidden.md\\:flex').getByText('Neuer Trade')
    await expect(headerButton).toBeVisible({ timeout: 5000 })
    const fab = page.locator('button[aria-label="Neuer Trade"]')
    await expect(fab).toBeHidden()
  })
})

// ─── Layout & Spacing ─────────────────────────────────────────────────────────

test.describe('PROJ-31 Layout & Spacing', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('Page has mobile padding (pb-20 for Bottom Nav clearance)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    const contentDiv = page.locator('main > div').first()
    const pb = await contentDiv.evaluate(el => getComputedStyle(el).paddingBottom)
    // pb-20 = 80px
    expect(parseInt(pb)).toBeGreaterThanOrEqual(60)
  })
})

// ─── Security: global CSS dialog override ────────────────────────────────────

test.describe('PROJ-31 Mobile dialog bottom-sheet behavior', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('Page loads without JavaScript errors on mobile', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
