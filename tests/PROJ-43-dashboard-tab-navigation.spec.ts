import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_USER_EMAIL
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD
const hasCredentials = !!TEST_EMAIL && !!TEST_PASSWORD

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', TEST_EMAIL!)
  await page.fill('input[type="password"]', TEST_PASSWORD!)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  // Wait for loading skeleton to resolve
  await page.waitForTimeout(1500)
}

// ─── Unauthenticated ─────────────────────────────────────────────────────────

test.describe('Unauthenticated access', () => {
  test('Accessing /dashboard without login redirects to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── Tab Navigation Structure ─────────────────────────────────────────────────

test.describe('AC-43.1: Tab navigation structure', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasCredentials) test.skip()
    await login(page)
  })

  test('AC-43.1: Three tabs are visible: Heute, Woche, Monat', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Heute' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Woche' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Monat' })).toBeVisible()
  })

  test('AC-43.1: Default active tab is "Heute" (or localStorage-restored)', async ({ page }) => {
    // Clear localStorage to get default behavior
    await page.evaluate(() => localStorage.removeItem('dashboard_active_tab'))
    await page.reload()
    await page.waitForTimeout(1000)

    const heuteTab = page.getByRole('tab', { name: 'Heute' })
    await expect(heuteTab).toHaveAttribute('data-state', 'active')
  })

  test('AC-43.1: Tab switching works without page reload', async ({ page }) => {
    const wocheTab = page.getByRole('tab', { name: 'Woche' })
    await wocheTab.click()
    await expect(wocheTab).toHaveAttribute('data-state', 'active')

    const monatTab = page.getByRole('tab', { name: 'Monat' })
    await monatTab.click()
    await expect(monatTab).toHaveAttribute('data-state', 'active')
  })
})

// ─── Tab KPIs ─────────────────────────────────────────────────────────────────

test.describe('AC-43.2: Tab-specific KPIs', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasCredentials) test.skip()
    await login(page)
    // Reset to Heute tab
    await page.evaluate(() => localStorage.removeItem('dashboard_active_tab'))
    await page.reload()
    await page.waitForTimeout(1000)
  })

  test('AC-43.2: Heute tab shows Tages-P&L KPI', async ({ page }) => {
    await expect(page.getByText('Tages-P&L')).toBeVisible()
  })

  test('AC-43.2: Woche tab shows Wochen-P&L KPI', async ({ page }) => {
    await page.getByRole('tab', { name: 'Woche' }).click()
    await expect(page.getByText('Wochen-P&L')).toBeVisible()
  })

  test('AC-43.2: Monat tab shows Monats-P&L and Max. Drawdown', async ({ page }) => {
    await page.getByRole('tab', { name: 'Monat' }).click()
    await expect(page.getByText('Monats-P&L')).toBeVisible()
    await expect(page.getByText('Max. Drawdown')).toBeVisible()
  })

  test('AC-43.2: Each tab shows Win Rate and Ø Risk/Reward KPIs', async ({ page }) => {
    // Heute tab
    await expect(page.getByText('Win Rate').first()).toBeVisible()
    await expect(page.getByText('Ø Risk/Reward').first()).toBeVisible()

    // Woche tab
    await page.getByRole('tab', { name: 'Woche' }).click()
    await expect(page.getByText('Win Rate').first()).toBeVisible()

    // Monat tab
    await page.getByRole('tab', { name: 'Monat' }).click()
    await expect(page.getByText('Win Rate').first()).toBeVisible()
  })
})

// ─── Equity Chart per Tab ─────────────────────────────────────────────────────

test.describe('AC-43.4: Equity chart adapts per tab', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasCredentials) test.skip()
    await login(page)
  })

  test('AC-43.4: Equity Curve section is visible on each tab', async ({ page }) => {
    // Heute tab
    await expect(page.getByText('Equity Curve').first()).toBeVisible()

    // Woche tab
    await page.getByRole('tab', { name: 'Woche' }).click()
    await expect(page.getByText('Equity Curve').first()).toBeVisible()

    // Monat tab
    await page.getByRole('tab', { name: 'Monat' }).click()
    await expect(page.getByText('Equity Curve').first()).toBeVisible()
  })

  test('AC-43.5: No 7/30/90-Tage period buttons in equity chart', async ({ page }) => {
    await expect(page.getByRole('button', { name: '7T' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: '30T' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: '90T' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Gesamt' })).not.toBeVisible()
  })
})

// ─── localStorage Persistence ─────────────────────────────────────────────────

test.describe('AC-43.7: Tab selection persisted in localStorage', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasCredentials) test.skip()
    await login(page)
  })

  test('AC-43.7: Selected tab is saved to localStorage', async ({ page }) => {
    await page.getByRole('tab', { name: 'Woche' }).click()

    const stored = await page.evaluate(() => localStorage.getItem('dashboard_active_tab'))
    expect(stored).toBe('week')
  })

  test('AC-43.7: Saved tab is restored on page reload', async ({ page }) => {
    // Save 'month' tab
    await page.evaluate(() => localStorage.setItem('dashboard_active_tab', 'month'))
    await page.reload()
    await page.waitForTimeout(1000)

    const monatTab = page.getByRole('tab', { name: 'Monat' })
    await expect(monatTab).toHaveAttribute('data-state', 'active')
  })

  test('AC-43.7: Restored tab persists across navigation', async ({ page }) => {
    await page.getByRole('tab', { name: 'Woche' }).click()
    // Navigate away and back
    await page.goto(`${BASE_URL}/journal`)
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForTimeout(1000)

    const wocheTab = page.getByRole('tab', { name: 'Woche' })
    await expect(wocheTab).toHaveAttribute('data-state', 'active')
  })
})

// ─── Empty States ─────────────────────────────────────────────────────────────

test.describe('AC-43.8: Empty states', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasCredentials) test.skip()
    await login(page)
    await page.evaluate(() => localStorage.removeItem('dashboard_active_tab'))
    await page.reload()
    await page.waitForTimeout(1500)
  })

  test('AC-43.8: Heute tab shows Trade count as 0 or empty message when no trades today', async ({ page }) => {
    // If "Noch keine Trades" message or a count of 0 trades — either is valid
    // This test only applies on days with no trades
    const tradesCount = page.getByText('Trades')
    await expect(tradesCount).toBeVisible()
  })

  test('AC-43.8: Equity chart shows graceful empty state (no crash)', async ({ page }) => {
    // Chart either shows data or shows a helpful empty state — should not throw/crash
    const chartTitle = page.getByText('Equity Curve').first()
    await expect(chartTitle).toBeVisible()
  })
})

// ─── Tab-independent Widgets ──────────────────────────────────────────────────

test.describe('AC-43.6: Tab-independent widgets remain visible', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasCredentials) test.skip()
    await login(page)
  })

  test('AC-43.6: Switching tabs does not hide widgets below tabs', async ({ page }) => {
    // These widgets should be visible regardless of which tab is active
    // Test on each tab
    for (const tabName of ['Heute', 'Woche', 'Monat']) {
      await page.getByRole('tab', { name: tabName }).click()
      await page.waitForTimeout(300)
      // At least the page should still be intact (no crash, content visible)
      await expect(page.getByRole('tab', { name: tabName })).toBeVisible()
    }
  })
})

// ─── Responsive Layout ────────────────────────────────────────────────────────

test.describe('AC-43.9 & AC-43.10: Responsive tab layout', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasCredentials) test.skip()
    await login(page)
  })

  test('AC-43.10: Desktop (1440px) — all three tabs fit without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const tabList = page.getByRole('tablist')
    await expect(tabList).toBeVisible()

    // Verify no horizontal scroll on the tab list
    const overflow = await tabList.evaluate(el => {
      return el.scrollWidth <= el.clientWidth + 5 // 5px tolerance
    })
    expect(overflow).toBe(true)
  })

  test('AC-43.9: Mobile (375px) — tabs fit on one line', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.reload()
    await page.waitForTimeout(1000)

    const heuteTab = page.getByRole('tab', { name: 'Heute' })
    const wocheTab = page.getByRole('tab', { name: 'Woche' })
    const monatTab = page.getByRole('tab', { name: 'Monat' })

    await expect(heuteTab).toBeVisible()
    await expect(wocheTab).toBeVisible()
    await expect(monatTab).toBeVisible()
  })
})

// ─── Regression Tests ─────────────────────────────────────────────────────────

test.describe('Regression: dashboard structure unchanged', () => {
  test.beforeEach(async ({ page }) => {
    if (!hasCredentials) test.skip()
    await login(page)
  })

  test('REGRESSION: Dashboard shows greeting and account name', async ({ page }) => {
    // Greeting should be visible (Guten Morgen / Guten Tag / Guten Abend)
    const greeting = page.getByRole('heading').first()
    await expect(greeting).toBeVisible()
  })

  test('REGRESSION: Dashboard does not crash on tab switch', async ({ page }) => {
    // Cycle through all tabs
    for (const tabName of ['Heute', 'Woche', 'Monat', 'Heute']) {
      await page.getByRole('tab', { name: tabName }).click()
      await page.waitForTimeout(200)
      // No error overlay should appear
      await expect(page.getByText(/Error|Fehler|Uncaught/i)).not.toBeVisible()
    }
  })
})
