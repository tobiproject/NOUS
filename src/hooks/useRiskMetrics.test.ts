import { describe, it, expect } from 'vitest'

// ─── Pure calculation helpers extracted for testing ──────────────────────────
// These mirror the logic inside useRiskMetrics without requiring React/Supabase

function calcDailyLossPct(trades: { result_currency: number | null }[], balance: number): number {
  if (balance <= 0) return 0
  const totalLoss = trades.reduce((sum, t) => {
    const val = t.result_currency ?? 0
    return sum + (val < 0 ? val : 0)
  }, 0)
  return Math.round((Math.abs(totalLoss) / balance) * 10000) / 100
}

function calcDrawdownPct(
  trades: { result_currency: number | null }[],
  startBalance: number
): number {
  let equity = startBalance
  let peak = startBalance
  let maxDrawdown = 0

  for (const trade of trades) {
    equity += trade.result_currency ?? 0
    if (equity > peak) peak = equity
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    if (dd > maxDrawdown) maxDrawdown = dd
  }
  return Math.round(maxDrawdown * 100) / 100
}

function checkLimitRatio(currentPct: number, limitPct: number | null) {
  if (limitPct === null) return { ratio: null, breached: false, warning: false }
  const ratio = currentPct / limitPct
  return {
    ratio,
    breached: ratio >= 1,
    warning: ratio >= 0.8 && ratio < 1,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('calcDailyLossPct', () => {
  it('returns 0 when no trades', () => {
    expect(calcDailyLossPct([], 10000)).toBe(0)
  })

  it('returns 0 when all trades are winners', () => {
    const trades = [{ result_currency: 100 }, { result_currency: 200 }]
    expect(calcDailyLossPct(trades, 10000)).toBe(0)
  })

  it('calculates loss % correctly for losing trades', () => {
    const trades = [{ result_currency: -200 }, { result_currency: 100 }]
    // Loss = 200, balance = 10000 → 2%
    expect(calcDailyLossPct(trades, 10000)).toBe(2)
  })

  it('returns 0 when balance is 0 or negative', () => {
    expect(calcDailyLossPct([{ result_currency: -100 }], 0)).toBe(0)
    expect(calcDailyLossPct([{ result_currency: -100 }], -500)).toBe(0)
  })

  it('handles null result_currency as 0', () => {
    const trades = [{ result_currency: null }, { result_currency: -100 }]
    expect(calcDailyLossPct(trades, 10000)).toBe(1)
  })
})

describe('calcDrawdownPct', () => {
  it('returns 0 with no trades', () => {
    expect(calcDrawdownPct([], 10000)).toBe(0)
  })

  it('returns 0 when all trades are profitable', () => {
    const trades = [{ result_currency: 100 }, { result_currency: 200 }]
    expect(calcDrawdownPct(trades, 10000)).toBe(0)
  })

  it('calculates drawdown from equity peak', () => {
    // Start: 10000, +500 → peak 10500, then -1050 → equity 9450
    // DD = (10500 - 9450) / 10500 = 10%
    const trades = [{ result_currency: 500 }, { result_currency: -1050 }]
    expect(calcDrawdownPct(trades, 10000)).toBe(10)
  })

  it('tracks the maximum drawdown, not just current', () => {
    // 10000 → +1000 (peak 11000) → -2200 (equity 8800, DD 20%) → +500 (equity 9300, DD still 20%)
    const trades = [
      { result_currency: 1000 },
      { result_currency: -2200 },
      { result_currency: 500 },
    ]
    expect(calcDrawdownPct(trades, 10000)).toBe(20)
  })

  it('handles null result_currency', () => {
    const trades = [{ result_currency: null }, { result_currency: -500 }]
    // Start 10000, -500 → equity 9500, peak was 10000 → DD 5%
    expect(calcDrawdownPct(trades, 10000)).toBe(5)
  })
})

describe('checkLimitRatio', () => {
  it('returns nulls when no limit configured', () => {
    const result = checkLimitRatio(3, null)
    expect(result.ratio).toBeNull()
    expect(result.breached).toBe(false)
    expect(result.warning).toBe(false)
  })

  it('returns breached when at or above 100% of limit', () => {
    expect(checkLimitRatio(5, 5).breached).toBe(true)
    expect(checkLimitRatio(6, 5).breached).toBe(true)
  })

  it('returns warning between 80% and 100%', () => {
    expect(checkLimitRatio(4, 5).warning).toBe(true)   // 80%
    expect(checkLimitRatio(4.9, 5).warning).toBe(true) // 98%
  })

  it('returns neither breached nor warning below 80%', () => {
    const result = checkLimitRatio(3, 5) // 60%
    expect(result.breached).toBe(false)
    expect(result.warning).toBe(false)
  })

  it('breached takes precedence over warning', () => {
    const result = checkLimitRatio(5.5, 5) // 110%
    expect(result.breached).toBe(true)
    expect(result.warning).toBe(false)
  })
})
