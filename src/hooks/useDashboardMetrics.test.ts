import { describe, it, expect } from 'vitest'

// ─── Extract testable pure functions ─────────────────────────────────────────
// These mirror the private functions in useDashboardMetrics.ts

function calcDrawdown(
  trades: { result_currency: number | null; traded_at: string }[],
  startBalance: number
): number {
  let equity = startBalance
  let peak = startBalance
  let maxDd = 0
  const sorted = [...trades].sort((a, b) => a.traded_at.localeCompare(b.traded_at))
  for (const t of sorted) {
    equity += t.result_currency ?? 0
    if (equity > peak) peak = equity
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    if (dd > maxDd) maxDd = dd
  }
  return Math.round(maxDd * 100) / 100
}

function calcWinRate(outcomes: Array<'win' | 'loss' | 'breakeven' | null>): number | null {
  const decided = outcomes.filter(o => o === 'win' || o === 'loss')
  if (decided.length === 0) return null
  const wins = decided.filter(o => o === 'win').length
  return Math.round((wins / decided.length) * 1000) / 10
}

function calcAvgRR(rrValues: Array<number | null>): number | null {
  const valid = rrValues.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  const avg = valid.reduce((s, v) => s + v, 0) / valid.length
  return Math.round(avg * 100) / 100
}

type MockTrade = {
  traded_at: string
  result_currency: number | null
  outcome: 'win' | 'loss' | 'breakeven' | null
  rr_ratio: number | null
  strategy: string | null
}

function calcTopStrategy(trades: MockTrade[]): { name: string; tradeCount: number; profitFactor: number } | null {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const recent = trades.filter(t => t.traded_at >= cutoff && t.strategy)
  const byStrategy = new Map<string, MockTrade[]>()
  for (const t of recent) {
    const key = t.strategy!
    const arr = byStrategy.get(key) ?? []
    arr.push(t)
    byStrategy.set(key, arr)
  }

  let best: { name: string; tradeCount: number; profitFactor: number } | null = null
  for (const [name, group] of byStrategy.entries()) {
    if (group.length < 5) continue
    const wins = group.filter(t => t.outcome === 'win')
    const losses = group.filter(t => t.outcome === 'loss')
    const grossProfit = wins.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.result_currency ?? 0), 0))
    const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    if (!best || pf > best.profitFactor) {
      best = { name, tradeCount: group.length, profitFactor: isFinite(pf) ? Math.round(pf * 100) / 100 : 999 }
    }
  }
  return best
}

// ─── calcDrawdown ─────────────────────────────────────────────────────────────

describe('calcDrawdown', () => {
  it('returns 0 with no trades', () => {
    expect(calcDrawdown([], 10000)).toBe(0)
  })

  it('returns 0 when all trades are profitable', () => {
    const trades = [
      { result_currency: 200, traded_at: '2026-01-01T10:00:00Z' },
      { result_currency: 300, traded_at: '2026-01-02T10:00:00Z' },
    ]
    expect(calcDrawdown(trades, 10000)).toBe(0)
  })

  it('calculates drawdown from equity peak', () => {
    const trades = [
      { result_currency: 1000, traded_at: '2026-01-01T10:00:00Z' }, // peak 11000
      { result_currency: -2000, traded_at: '2026-01-02T10:00:00Z' }, // equity 9000 → dd = 2000/11000 ≈ 18.18%
    ]
    const dd = calcDrawdown(trades, 10000)
    expect(dd).toBeCloseTo(18.18, 1)
  })

  it('tracks maximum drawdown across multiple dips', () => {
    const trades = [
      { result_currency: 500, traded_at: '2026-01-01T10:00:00Z' },  // equity 10500, peak 10500, dd 0%
      { result_currency: -800, traded_at: '2026-01-02T10:00:00Z' }, // equity 9700, peak 10500, dd 7.62%
      { result_currency: 600, traded_at: '2026-01-03T10:00:00Z' },  // equity 10300, peak 10500, dd 1.90%
      { result_currency: -1500, traded_at: '2026-01-04T10:00:00Z' }, // equity 8800, peak 10500, dd 16.19% (max)
    ]
    const dd = calcDrawdown(trades, 10000)
    expect(dd).toBeCloseTo(16.19, 0)
  })

  it('treats null result_currency as 0', () => {
    const trades = [
      { result_currency: null, traded_at: '2026-01-01T10:00:00Z' },
    ]
    expect(calcDrawdown(trades, 10000)).toBe(0)
  })
})

// ─── calcWinRate ──────────────────────────────────────────────────────────────

describe('calcWinRate', () => {
  it('returns null when no decided trades', () => {
    expect(calcWinRate([])).toBeNull()
  })

  it('returns null when all trades are breakeven (EC-2.2)', () => {
    expect(calcWinRate(['breakeven', 'breakeven', 'breakeven'])).toBeNull()
  })

  it('returns null when all outcomes are null', () => {
    expect(calcWinRate([null, null])).toBeNull()
  })

  it('calculates 100% for all wins', () => {
    expect(calcWinRate(['win', 'win', 'win'])).toBe(100)
  })

  it('calculates 0% for all losses', () => {
    expect(calcWinRate(['loss', 'loss'])).toBe(0)
  })

  it('calculates 50% for equal wins and losses', () => {
    expect(calcWinRate(['win', 'loss'])).toBe(50)
  })

  it('ignores breakeven and null outcomes in ratio', () => {
    // 2 wins, 2 losses, 2 breakeven → winRate on decided = 2/4 = 50%
    expect(calcWinRate(['win', 'win', 'loss', 'loss', 'breakeven', null])).toBe(50)
  })
})

// ─── calcAvgRR ────────────────────────────────────────────────────────────────

describe('calcAvgRR', () => {
  it('returns null when no RR values', () => {
    expect(calcAvgRR([])).toBeNull()
  })

  it('returns null when all are null', () => {
    expect(calcAvgRR([null, null])).toBeNull()
  })

  it('calculates average correctly', () => {
    expect(calcAvgRR([2.0, 3.0, 1.0])).toBe(2)
  })

  it('ignores null values in average', () => {
    expect(calcAvgRR([2.0, null, 4.0])).toBe(3)
  })

  it('rounds to 2 decimal places', () => {
    expect(calcAvgRR([1.5, 2.0])).toBe(1.75)
  })
})

// ─── calcTopStrategy ─────────────────────────────────────────────────────────

describe('calcTopStrategy', () => {
  function recentDate(daysAgo = 5): string {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return d.toISOString()
  }

  it('returns null when no trades', () => {
    expect(calcTopStrategy([])).toBeNull()
  })

  it('returns null when no strategy has 5+ trades (AC-2.15)', () => {
    const trades: MockTrade[] = Array.from({ length: 4 }, () => ({
      traded_at: recentDate(),
      result_currency: 100,
      outcome: 'win',
      rr_ratio: 2,
      strategy: 'ScalpingA',
    }))
    expect(calcTopStrategy(trades)).toBeNull()
  })

  it('returns strategy when it has exactly 5 trades (AC-2.15 boundary)', () => {
    const trades: MockTrade[] = Array.from({ length: 5 }, () => ({
      traded_at: recentDate(),
      result_currency: 100,
      outcome: 'win',
      rr_ratio: 2,
      strategy: 'ScalpingA',
    }))
    const result = calcTopStrategy(trades)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('ScalpingA')
    expect(result!.tradeCount).toBe(5)
  })

  it('ignores trades older than 30 days (AC-2.14)', () => {
    const old: MockTrade[] = Array.from({ length: 5 }, () => ({
      traded_at: recentDate(35),
      result_currency: 100,
      outcome: 'win',
      rr_ratio: 2,
      strategy: 'OldStrategy',
    }))
    expect(calcTopStrategy(old)).toBeNull()
  })

  it('ignores trades with no strategy', () => {
    const trades: MockTrade[] = Array.from({ length: 5 }, () => ({
      traded_at: recentDate(),
      result_currency: 100,
      outcome: 'win',
      rr_ratio: 2,
      strategy: null,
    }))
    expect(calcTopStrategy(trades)).toBeNull()
  })

  it('picks strategy with higher profit factor', () => {
    const a: MockTrade[] = Array.from({ length: 5 }, () => ({
      traded_at: recentDate(), result_currency: 100, outcome: 'win', rr_ratio: 2, strategy: 'StratA',
    }))
    // StratA: all wins, pf = Infinity → 999
    const b: MockTrade[] = [
      ...Array.from({ length: 4 }, () => ({
        traded_at: recentDate(), result_currency: 50, outcome: 'win' as const, rr_ratio: 1, strategy: 'StratB',
      })),
      { traded_at: recentDate(), result_currency: -100, outcome: 'loss', rr_ratio: 1, strategy: 'StratB' },
    ]
    const result = calcTopStrategy([...a, ...b])
    expect(result!.name).toBe('StratA')
    expect(result!.profitFactor).toBe(999)
  })
})
