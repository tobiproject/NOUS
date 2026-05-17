import { describe, it, expect } from 'vitest'

// Mirror private functions from DashboardTabs.tsx for unit testing

type MockTrade = {
  traded_at: string
  result_currency: number | null
  outcome: 'win' | 'loss' | 'breakeven' | null
  rr_ratio: number | null
  strategy: string | null
}

interface TabKpiData {
  pnl: number
  pnlPct: number
  tradeCount: number
  winRate: number | null
  avgRR: number | null
}

function calcPeriodKpis(trades: MockTrade[], startBalance: number): TabKpiData {
  const pnl = trades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  const pnlPct = startBalance > 0 ? (pnl / startBalance) * 100 : 0
  const decided = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  const wins = decided.filter(t => t.outcome === 'win')
  const winRate = decided.length > 0 ? (wins.length / decided.length) * 100 : null
  const rrTrades = trades.filter(t => t.rr_ratio !== null)
  const avgRR =
    rrTrades.length > 0
      ? rrTrades.reduce((s, t) => s + t.rr_ratio!, 0) / rrTrades.length
      : null
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
    tradeCount: trades.length,
    winRate: winRate !== null ? Math.round(winRate * 10) / 10 : null,
    avgRR: avgRR !== null ? Math.round(avgRR * 100) / 100 : null,
  }
}

function calcDrawdown(trades: MockTrade[], startBalance: number): number {
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

interface TopStrategy {
  name: string
  tradeCount: number
  totalPnl: number
  profitFactor: number
  winRate: number
}

function calcTopStrategy(trades: MockTrade[], minCount: number): TopStrategy | null {
  const byStrategy = new Map<string, MockTrade[]>()
  for (const t of trades.filter(t => t.strategy)) {
    const key = t.strategy!
    const arr = byStrategy.get(key) ?? []
    arr.push(t)
    byStrategy.set(key, arr)
  }

  let best: TopStrategy | null = null
  for (const [name, group] of byStrategy.entries()) {
    if (group.length < minCount) continue
    const wins = group.filter(t => t.outcome === 'win')
    const losses = group.filter(t => t.outcome === 'loss')
    const grossProfit = wins.reduce((s, t) => s + (t.result_currency ?? 0), 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.result_currency ?? 0), 0))
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
    const decided = group.filter(t => t.outcome !== null)
    const winRate = decided.length > 0 ? (wins.length / decided.length) * 100 : 0
    const totalPnl = group.reduce((s, t) => s + (t.result_currency ?? 0), 0)

    if (!best || profitFactor > best.profitFactor) {
      best = {
        name,
        tradeCount: group.length,
        totalPnl: Math.round(totalPnl * 100) / 100,
        profitFactor: isFinite(profitFactor)
          ? Math.round(profitFactor * 100) / 100
          : 999,
        winRate: Math.round(winRate * 10) / 10,
      }
    }
  }
  return best
}

// ─── calcPeriodKpis ───────────────────────────────────────────────────────────

describe('calcPeriodKpis', () => {
  it('returns zeros and nulls when no trades', () => {
    const result = calcPeriodKpis([], 10000)
    expect(result.pnl).toBe(0)
    expect(result.tradeCount).toBe(0)
    expect(result.winRate).toBeNull()
    expect(result.avgRR).toBeNull()
  })

  it('sums P&L from all trades', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-15T09:00:00Z', result_currency: 200, outcome: 'win', rr_ratio: 2, strategy: null },
      { traded_at: '2026-05-15T10:00:00Z', result_currency: -100, outcome: 'loss', rr_ratio: -1, strategy: null },
    ]
    const result = calcPeriodKpis(trades, 10000)
    expect(result.pnl).toBe(100)
    expect(result.tradeCount).toBe(2)
  })

  it('calculates pnlPct relative to startBalance', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-15T09:00:00Z', result_currency: 1000, outcome: 'win', rr_ratio: 2, strategy: null },
    ]
    const result = calcPeriodKpis(trades, 10000)
    expect(result.pnlPct).toBe(10)
  })

  it('returns winRate null when no decided trades (only pending)', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-15T09:00:00Z', result_currency: 0, outcome: null, rr_ratio: null, strategy: null },
    ]
    const result = calcPeriodKpis(trades, 10000)
    expect(result.winRate).toBeNull()
  })

  it('calculates 100% win rate for all wins', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-15T09:00:00Z', result_currency: 100, outcome: 'win', rr_ratio: 2, strategy: null },
      { traded_at: '2026-05-15T10:00:00Z', result_currency: 200, outcome: 'win', rr_ratio: 3, strategy: null },
    ]
    expect(calcPeriodKpis(trades, 10000).winRate).toBe(100)
  })

  it('excludes breakeven from win rate calculation (EC: win rate at 0 decided trades)', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-15T09:00:00Z', result_currency: 0, outcome: 'breakeven', rr_ratio: 0, strategy: null },
    ]
    expect(calcPeriodKpis(trades, 10000).winRate).toBeNull()
  })

  it('calculates avgRR from trades with non-null rr_ratio', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-15T09:00:00Z', result_currency: 100, outcome: 'win', rr_ratio: 2, strategy: null },
      { traded_at: '2026-05-15T10:00:00Z', result_currency: 100, outcome: 'win', rr_ratio: 4, strategy: null },
      { traded_at: '2026-05-15T11:00:00Z', result_currency: 100, outcome: 'win', rr_ratio: null, strategy: null },
    ]
    expect(calcPeriodKpis(trades, 10000).avgRR).toBe(3)
  })

  it('returns avgRR null when no trades have rr_ratio', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-15T09:00:00Z', result_currency: 100, outcome: 'win', rr_ratio: null, strategy: null },
    ]
    expect(calcPeriodKpis(trades, 10000).avgRR).toBeNull()
  })

  it('handles null result_currency as 0', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-15T09:00:00Z', result_currency: null, outcome: null, rr_ratio: null, strategy: null },
    ]
    const result = calcPeriodKpis(trades, 10000)
    expect(result.pnl).toBe(0)
    expect(result.tradeCount).toBe(1)
  })
})

// ─── calcDrawdown (tab version) ───────────────────────────────────────────────

describe('calcDrawdown (tab)', () => {
  it('returns 0 when no trades', () => {
    expect(calcDrawdown([], 10000)).toBe(0)
  })

  it('returns 0 for all-profitable month', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-01T10:00:00Z', result_currency: 300, outcome: 'win', rr_ratio: 3, strategy: null },
      { traded_at: '2026-05-02T10:00:00Z', result_currency: 200, outcome: 'win', rr_ratio: 2, strategy: null },
    ]
    expect(calcDrawdown(trades, 10000)).toBe(0)
  })

  it('calculates drawdown from peak equity', () => {
    const trades: MockTrade[] = [
      { traded_at: '2026-05-01T10:00:00Z', result_currency: 1000, outcome: 'win', rr_ratio: 2, strategy: null },
      { traded_at: '2026-05-02T10:00:00Z', result_currency: -2200, outcome: 'loss', rr_ratio: -1, strategy: null },
    ]
    // peak 11000, equity 8800 → dd = 2200/11000 = 20%
    expect(calcDrawdown(trades, 10000)).toBeCloseTo(20, 1)
  })
})

// ─── calcTopStrategy (tab version with variable minCount) ─────────────────────

describe('calcTopStrategy (tab)', () => {
  function makeTrade(strategy: string, outcome: 'win' | 'loss', pnl: number, daysAgo = 5): MockTrade {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return {
      traded_at: d.toISOString(),
      result_currency: pnl,
      outcome,
      rr_ratio: 2,
      strategy,
    }
  }

  it('returns null for empty list', () => {
    expect(calcTopStrategy([], 3)).toBeNull()
  })

  it('respects minCount=3 for week tab', () => {
    const trades = [makeTrade('StratA', 'win', 100), makeTrade('StratA', 'win', 100)]
    expect(calcTopStrategy(trades, 3)).toBeNull()

    const withThree = [...trades, makeTrade('StratA', 'win', 100)]
    expect(calcTopStrategy(withThree, 3)).not.toBeNull()
  })

  it('respects minCount=5 for month tab', () => {
    const trades = Array.from({ length: 4 }, () => makeTrade('StratA', 'win', 100))
    expect(calcTopStrategy(trades, 5)).toBeNull()

    const withFive = [...trades, makeTrade('StratA', 'win', 100)]
    expect(calcTopStrategy(withFive, 5)).not.toBeNull()
  })

  it('ignores trades with no strategy', () => {
    const trades: MockTrade[] = Array.from({ length: 5 }, () => ({
      ...makeTrade('', 'win', 100),
      strategy: null,
    }))
    expect(calcTopStrategy(trades, 3)).toBeNull()
  })

  it('picks strategy with higher profit factor', () => {
    const allWins = Array.from({ length: 3 }, () => makeTrade('PerfectStrat', 'win', 200))
    const mixed = [
      makeTrade('MixedStrat', 'win', 100),
      makeTrade('MixedStrat', 'win', 100),
      makeTrade('MixedStrat', 'loss', -200),
    ]
    const result = calcTopStrategy([...allWins, ...mixed], 3)
    expect(result!.name).toBe('PerfectStrat')
    expect(result!.profitFactor).toBe(999) // Infinity capped at 999
  })

  it('calculates correct win rate', () => {
    const trades = [
      makeTrade('StratA', 'win', 100),
      makeTrade('StratA', 'win', 100),
      makeTrade('StratA', 'loss', -100),
    ]
    const result = calcTopStrategy(trades, 3)
    expect(result!.winRate).toBeCloseTo(66.7, 0)
  })

  it('sums totalPnl correctly', () => {
    const trades = [
      makeTrade('StratA', 'win', 300),
      makeTrade('StratA', 'win', 200),
      makeTrade('StratA', 'loss', -100),
    ]
    const result = calcTopStrategy(trades, 3)
    expect(result!.totalPnl).toBe(400)
  })
})
