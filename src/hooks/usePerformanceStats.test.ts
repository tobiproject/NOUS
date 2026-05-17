import { describe, it, expect } from 'vitest'

// Mirror private pure functions from usePerformanceStats.ts for isolated testing

type MockTrade = {
  traded_at: string
  asset: string
  outcome: 'win' | 'loss' | 'breakeven' | null
  result_currency: number | null
  rr_ratio: number | null
  strategy: string | null
  setup_type: string | null
}

// ─── applyFilter ──────────────────────────────────────────────────────────────

function applyFilter(trades: MockTrade[], f: {
  dateFrom?: string; dateTo?: string; assets?: string[]; strategies?: string[]; setupTypes?: string[]
}): MockTrade[] {
  return trades.filter(t => {
    const day = t.traded_at.split('T')[0]
    if (f.dateFrom && day < f.dateFrom) return false
    if (f.dateTo && day > f.dateTo) return false
    if (f.assets?.length && !f.assets.includes(t.asset)) return false
    if (f.strategies?.length && !f.strategies.includes(t.strategy ?? '')) return false
    if (f.setupTypes?.length && !f.setupTypes.includes(t.setup_type ?? '')) return false
    return true
  })
}

// ─── calcStreaks ───────────────────────────────────────────────────────────────

function calcStreaks(trades: MockTrade[]): { best: number; worst: number } {
  let best = 0, worst = 0, curWin = 0, curLoss = 0
  for (const t of trades) {
    if (t.outcome === 'win') { curWin++; curLoss = 0; if (curWin > best) best = curWin }
    else if (t.outcome === 'loss') { curLoss++; curWin = 0; if (curLoss > worst) worst = curLoss }
    else { curWin = 0; curLoss = 0 }
  }
  return { best, worst }
}

// ─── calcKpi ──────────────────────────────────────────────────────────────────

function calcKpi(trades: MockTrade[], startBalance: number) {
  const wins = trades.filter(t => t.outcome === 'win')
  const losses = trades.filter(t => t.outcome === 'loss')
  const decided = wins.length + losses.length

  const winRate = decided > 0 ? Math.round((wins.length / decided) * 1000) / 10 : null
  const grossProfit = wins.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.result_currency ?? 0), 0))
  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : null
  const avgWin = wins.length > 0 ? Math.round((grossProfit / wins.length) * 100) / 100 : null
  const avgLoss = losses.length > 0 ? Math.round((grossLoss / losses.length) * 100) / 100 : null
  const rrWins = wins.filter(t => t.rr_ratio !== null)
  const avgRRWins = rrWins.length > 0
    ? Math.round((rrWins.reduce((s, t) => s + (t.rr_ratio ?? 0), 0) / rrWins.length) * 100) / 100
    : null
  const rrAll = trades.filter(t => t.rr_ratio !== null)
  const avgRRAll = rrAll.length > 0
    ? Math.round((rrAll.reduce((s, t) => s + t.rr_ratio!, 0) / rrAll.length) * 100) / 100
    : null

  const { best, worst } = calcStreaks(trades)

  let equity = startBalance, peak = startBalance, maxDd = 0
  for (const t of [...trades].sort((a, b) => a.traded_at.localeCompare(b.traded_at))) {
    equity += t.result_currency ?? 0
    if (equity > peak) peak = equity
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    if (dd > maxDd) maxDd = dd
  }

  return {
    totalTrades: trades.length,
    winRate, profitFactor, avgWin, avgLoss, avgRRWins, avgRRAll,
    bestStreak: best, worstStreak: worst,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
  }
}

// ─── calcWinrateGroup ─────────────────────────────────────────────────────────

function calcWinrateGroup(trades: MockTrade[], keyFn: (t: MockTrade) => string | null) {
  const map = new Map<string, { wins: number; losses: number; count: number }>()
  for (const t of trades) {
    const k = keyFn(t)
    if (!k) continue
    const cur = map.get(k) ?? { wins: 0, losses: 0, count: 0 }
    cur.count++
    if (t.outcome === 'win') cur.wins++
    if (t.outcome === 'loss') cur.losses++
    map.set(k, cur)
  }
  return Array.from(map.entries())
    .map(([label, d]) => ({
      label,
      winRate: (d.wins + d.losses) > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 1000) / 10 : 0,
      tradeCount: d.count,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, 10)
}

// ─── calcDrawdownSeries ───────────────────────────────────────────────────────

function calcDrawdownSeries(trades: MockTrade[], startBalance: number) {
  const sorted = [...trades].sort((a, b) => a.traded_at.localeCompare(b.traded_at))
  let equity = startBalance
  let peak = startBalance
  let inDrawdown = false
  let phaseStart = ''
  let phasePeak = startBalance
  const curve: { date: string; drawdownPct: number }[] = []
  const phases: { startDate: string; endDate: string; peakPct: number; recoveryDays: number | null }[] = []

  for (const t of sorted) {
    equity += t.result_currency ?? 0
    if (equity > peak) {
      if (inDrawdown) {
        const depth = ((phasePeak - (equity - (t.result_currency ?? 0))) / phasePeak) * 100
        const startD = new Date(phaseStart)
        const endD = new Date(t.traded_at)
        phases.push({
          startDate: phaseStart.split('T')[0],
          endDate: t.traded_at.split('T')[0],
          peakPct: Math.round(depth * 100) / 100,
          recoveryDays: Math.round((endD.getTime() - startD.getTime()) / 86400000),
        })
        inDrawdown = false
      }
      peak = equity
    } else if (equity < peak) {
      if (!inDrawdown) { inDrawdown = true; phaseStart = t.traded_at; phasePeak = peak }
    }
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    curve.push({ date: t.traded_at.split('T')[0], drawdownPct: Math.round(dd * 100) / 100 })
  }

  if (inDrawdown && phaseStart) {
    const lastTrade = sorted[sorted.length - 1]
    const depth = peak > 0 ? ((peak - equity) / peak) * 100 : 0
    phases.push({
      startDate: phaseStart.split('T')[0],
      endDate: lastTrade?.traded_at.split('T')[0] ?? phaseStart.split('T')[0],
      peakPct: Math.round(depth * 100) / 100,
      recoveryDays: null,
    })
  }

  const current = curve.length > 0 ? curve[curve.length - 1].drawdownPct : 0
  const top5 = [...phases].sort((a, b) => b.peakPct - a.peakPct).slice(0, 5)
  return { curve, phases: top5, current }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trade(overrides: Partial<MockTrade> & { traded_at: string; outcome: 'win' | 'loss' | 'breakeven' | null }): MockTrade {
  return {
    asset: 'EURUSD',
    result_currency: null,
    rr_ratio: null,
    strategy: null,
    setup_type: null,
    ...overrides,
  }
}

// ─── applyFilter tests ────────────────────────────────────────────────────────

describe('applyFilter', () => {
  const trades: MockTrade[] = [
    trade({ traded_at: '2026-01-05T10:00:00Z', outcome: 'win', asset: 'EURUSD', strategy: 'StratA', setup_type: 'Breakout' }),
    trade({ traded_at: '2026-01-10T10:00:00Z', outcome: 'loss', asset: 'BTCUSD', strategy: 'StratB', setup_type: 'Reversal' }),
    trade({ traded_at: '2026-01-20T10:00:00Z', outcome: 'win', asset: 'EURUSD', strategy: 'StratA', setup_type: 'Breakout' }),
  ]

  it('returns all trades with empty filter', () => {
    expect(applyFilter(trades, {})).toHaveLength(3)
  })

  it('filters by dateFrom (AC-6.5)', () => {
    const result = applyFilter(trades, { dateFrom: '2026-01-10' })
    expect(result).toHaveLength(2)
    expect(result[0].traded_at).toBe('2026-01-10T10:00:00Z')
  })

  it('filters by dateTo (AC-6.5)', () => {
    const result = applyFilter(trades, { dateTo: '2026-01-09' })
    expect(result).toHaveLength(1)
  })

  it('filters by date range', () => {
    const result = applyFilter(trades, { dateFrom: '2026-01-10', dateTo: '2026-01-15' })
    expect(result).toHaveLength(1)
    expect(result[0].asset).toBe('BTCUSD')
  })

  it('filters by asset (AC-6.5)', () => {
    const result = applyFilter(trades, { assets: ['EURUSD'] })
    expect(result).toHaveLength(2)
    result.forEach(t => expect(t.asset).toBe('EURUSD'))
  })

  it('filters by multiple assets', () => {
    const result = applyFilter(trades, { assets: ['EURUSD', 'BTCUSD'] })
    expect(result).toHaveLength(3)
  })

  it('filters by strategy (AC-6.5)', () => {
    const result = applyFilter(trades, { strategies: ['StratA'] })
    expect(result).toHaveLength(2)
  })

  it('filters by setup type (AC-6.5)', () => {
    const result = applyFilter(trades, { setupTypes: ['Reversal'] })
    expect(result).toHaveLength(1)
    expect(result[0].asset).toBe('BTCUSD')
  })

  it('returns empty array when no trades match filter', () => {
    expect(applyFilter(trades, { assets: ['XAUUSD'] })).toHaveLength(0)
  })
})

// ─── calcStreaks tests ────────────────────────────────────────────────────────

describe('calcStreaks', () => {
  it('returns 0/0 with no trades (AC-6.1)', () => {
    expect(calcStreaks([])).toEqual({ best: 0, worst: 0 })
  })

  it('counts consecutive wins (AC-6.1)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-04T10:00:00Z', outcome: 'loss' }),
    ]
    expect(calcStreaks(trades).best).toBe(3)
  })

  it('counts consecutive losses (AC-6.1)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'loss' }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'loss' }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'win' }),
    ]
    expect(calcStreaks(trades).worst).toBe(2)
  })

  it('resets streak on breakeven', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'breakeven' }),
      trade({ traded_at: '2026-01-04T10:00:00Z', outcome: 'win' }),
    ]
    expect(calcStreaks(trades).best).toBe(2)
  })

  it('tracks best streak across multiple streaks', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'loss' }),
      trade({ traded_at: '2026-01-04T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-05T10:00:00Z', outcome: 'win' }),
      trade({ traded_at: '2026-01-06T10:00:00Z', outcome: 'win' }),
    ]
    expect(calcStreaks(trades).best).toBe(3)
  })
})

// ─── calcKpi tests ────────────────────────────────────────────────────────────

describe('calcKpi', () => {
  it('returns all null/zero with no trades (EC-6.2)', () => {
    const kpi = calcKpi([], 10000)
    expect(kpi.totalTrades).toBe(0)
    expect(kpi.winRate).toBeNull()
    expect(kpi.profitFactor).toBeNull()
    expect(kpi.avgWin).toBeNull()
    expect(kpi.avgLoss).toBeNull()
    expect(kpi.maxDrawdownPct).toBe(0)
  })

  it('calculates winRate correctly (AC-6.1, AC-6.2)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 100 }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win', result_currency: 100 }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'loss', result_currency: -50 }),
      trade({ traded_at: '2026-01-04T10:00:00Z', outcome: 'loss', result_currency: -50 }),
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.winRate).toBe(50)
    expect(kpi.totalTrades).toBe(4)
  })

  it('calculates profitFactor as grossProfit/grossLoss (AC-6.2)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 200 }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'loss', result_currency: -100 }),
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.profitFactor).toBe(2)
  })

  it('returns profitFactor = 999 when no losses and there are wins (EC-6.1 inverse)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 100 }),
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.profitFactor).toBe(999)
  })

  it('returns profitFactor = null when all trades are breakeven (EC-6.1)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'breakeven', result_currency: 0 }),
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.profitFactor).toBeNull()
  })

  it('calculates avgWin and avgLoss (AC-6.1)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 300 }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win', result_currency: 100 }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'loss', result_currency: -80 }),
      trade({ traded_at: '2026-01-04T10:00:00Z', outcome: 'loss', result_currency: -40 }),
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.avgWin).toBe(200)
    expect(kpi.avgLoss).toBe(60)
  })

  it('calculates avgRRWins only from winning trades (AC-6.1)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 100, rr_ratio: 2 }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win', result_currency: 100, rr_ratio: 4 }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'loss', result_currency: -50, rr_ratio: 1 }),
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.avgRRWins).toBe(3)
    expect(kpi.avgRRAll).toBe(2.33)
  })

  it('calculates maxDrawdownPct correctly (AC-6.1)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 1000 }),   // equity 11000, peak 11000
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'loss', result_currency: -2200 }), // equity 8800, dd = 2200/11000 = 20%
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.maxDrawdownPct).toBe(20)
  })

  it('returns winRate=null when only breakevens (EC-6.1)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'breakeven', result_currency: 0 }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'breakeven', result_currency: 0 }),
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.winRate).toBeNull()
  })

  it('handles single trade (EC-6.3)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 100 }),
    ]
    const kpi = calcKpi(trades, 10000)
    expect(kpi.totalTrades).toBe(1)
    expect(kpi.winRate).toBe(100)
  })
})

// ─── calcWinrateGroup tests ───────────────────────────────────────────────────

describe('calcWinrateGroup', () => {
  it('returns empty array when no trades', () => {
    expect(calcWinrateGroup([], t => t.asset)).toHaveLength(0)
  })

  it('skips trades where keyFn returns null (strategy/setup not set)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', strategy: null }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win', strategy: 'StratA' }),
    ]
    const result = calcWinrateGroup(trades, t => t.strategy)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('StratA')
  })

  it('calculates winrate per group (AC-6.7)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', asset: 'EURUSD' }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win', asset: 'EURUSD' }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'loss', asset: 'EURUSD' }),
      trade({ traded_at: '2026-01-04T10:00:00Z', outcome: 'win', asset: 'BTCUSD' }),
    ]
    const result = calcWinrateGroup(trades, t => t.asset)
    const eu = result.find(r => r.label === 'EURUSD')!
    expect(eu.winRate).toBeCloseTo(66.7, 0)
    expect(eu.tradeCount).toBe(3)
    const bt = result.find(r => r.label === 'BTCUSD')!
    expect(bt.winRate).toBe(100)
  })

  it('sorts by tradeCount descending (AC-6.7)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', asset: 'A' }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win', asset: 'B' }),
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'win', asset: 'B' }),
      trade({ traded_at: '2026-01-04T10:00:00Z', outcome: 'win', asset: 'B' }),
    ]
    const result = calcWinrateGroup(trades, t => t.asset)
    expect(result[0].label).toBe('B')
  })

  it('limits to top 10 (AC-6.7)', () => {
    const trades = Array.from({ length: 15 }, (_, i) =>
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', asset: `Asset${i}` })
    )
    expect(calcWinrateGroup(trades, t => t.asset)).toHaveLength(10)
  })
})

// ─── calcDrawdownSeries tests ─────────────────────────────────────────────────

describe('calcDrawdownSeries', () => {
  it('returns empty with no trades', () => {
    const { curve, phases, current } = calcDrawdownSeries([], 10000)
    expect(curve).toHaveLength(0)
    expect(phases).toHaveLength(0)
    expect(current).toBe(0)
  })

  it('curve has 0 drawdown when equity only rises', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 500 }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'win', result_currency: 300 }),
    ]
    const { curve, current } = calcDrawdownSeries(trades, 10000)
    expect(curve.every(c => c.drawdownPct === 0)).toBe(true)
    expect(current).toBe(0)
  })

  it('detects open drawdown phase (recoveryDays = null)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 1000 }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'loss', result_currency: -500 }),
    ]
    const { phases, current } = calcDrawdownSeries(trades, 10000)
    expect(phases).toHaveLength(1)
    expect(phases[0].recoveryDays).toBeNull()
    expect(current).toBeGreaterThan(0)
  })

  it('detects recovered drawdown phase (AC-6.11)', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 1000 }),  // peak 11000
      trade({ traded_at: '2026-01-03T10:00:00Z', outcome: 'loss', result_currency: -2000 }), // equity 9000 → in DD
      trade({ traded_at: '2026-01-05T10:00:00Z', outcome: 'win', result_currency: 3000 }),   // equity 12000 → recovered
    ]
    const { phases } = calcDrawdownSeries(trades, 10000)
    expect(phases).toHaveLength(1)
    expect(phases[0].recoveryDays).not.toBeNull()
    expect(phases[0].recoveryDays).toBe(2) // 2 days from Jan 3 to Jan 5
  })

  it('returns top 5 phases sorted by peakPct descending (AC-6.12)', () => {
    // Build 7 drawdown phases of varying depth
    const trades: MockTrade[] = []
    let equity = 10000
    for (let i = 0; i < 7; i++) {
      const depth = (i + 1) * 100
      trades.push(
        trade({ traded_at: `2026-0${i + 1}-01T10:00:00Z`, outcome: 'loss', result_currency: -depth }),
        trade({ traded_at: `2026-0${i + 1}-02T10:00:00Z`, outcome: 'win', result_currency: depth + 200 }),
      )
      equity = equity - depth + depth + 200
    }
    const { phases } = calcDrawdownSeries(trades, 10000)
    expect(phases.length).toBeLessThanOrEqual(5)
    // Should be sorted descending by peakPct
    for (let i = 0; i < phases.length - 1; i++) {
      expect(phases[i].peakPct).toBeGreaterThanOrEqual(phases[i + 1].peakPct)
    }
  })

  it('current drawdown matches last curve point', () => {
    const trades = [
      trade({ traded_at: '2026-01-01T10:00:00Z', outcome: 'win', result_currency: 2000 }),
      trade({ traded_at: '2026-01-02T10:00:00Z', outcome: 'loss', result_currency: -1000 }),
    ]
    const { curve, current } = calcDrawdownSeries(trades, 10000)
    expect(current).toBe(curve[curve.length - 1].drawdownPct)
  })
})
