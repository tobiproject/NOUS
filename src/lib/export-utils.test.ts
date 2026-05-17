import { describe, it, expect } from 'vitest'
import { escapeCell, buildCsvRow, computeKpi } from './export-utils'

describe('escapeCell', () => {
  it('returns empty string for null', () => {
    expect(escapeCell(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeCell(undefined)).toBe('')
  })

  it('returns plain string as-is when no special chars', () => {
    expect(escapeCell('EURUSD')).toBe('EURUSD')
  })

  it('wraps in quotes when value contains comma', () => {
    expect(escapeCell('Good trade, clean entry')).toBe('"Good trade, clean entry"')
  })

  it('escapes internal double quotes by doubling them', () => {
    expect(escapeCell('He said "buy"')).toBe('"He said ""buy"""')
  })

  it('wraps in quotes when value contains newline', () => {
    expect(escapeCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('converts number to string', () => {
    expect(escapeCell(1.1234)).toBe('1.1234')
  })

  it('converts boolean to string', () => {
    expect(escapeCell(true)).toBe('true')
    expect(escapeCell(false)).toBe('false')
  })

  it('joins array with semicolons', () => {
    expect(escapeCell(['A-Setup', 'Clean', 'FOMC'])).toBe('A-Setup; Clean; FOMC')
  })

  it('wraps array in quotes if joined string contains comma', () => {
    expect(escapeCell(['tag,one', 'tag2'])).toBe('"tag,one; tag2"')
  })
})

describe('buildCsvRow', () => {
  it('joins cells with commas', () => {
    expect(buildCsvRow(['EURUSD', 'long', 100])).toBe('EURUSD,long,100')
  })

  it('handles mixed nulls and values', () => {
    expect(buildCsvRow([null, 'win', undefined, 1.5])).toBe(',win,,1.5')
  })
})

describe('computeKpi', () => {
  it('returns zeros for empty trade list', () => {
    const kpi = computeKpi([])
    expect(kpi.totalTrades).toBe(0)
    expect(kpi.winrate).toBe(0)
    expect(kpi.totalPnl).toBe(0)
    expect(kpi.avgPnl).toBe(0)
  })

  it('calculates winrate correctly', () => {
    const trades = [
      { outcome: 'win', result_currency: 100 },
      { outcome: 'win', result_currency: 200 },
      { outcome: 'loss', result_currency: -50 },
      { outcome: 'loss', result_currency: -30 },
    ]
    const kpi = computeKpi(trades)
    expect(kpi.winrate).toBe(50)
    expect(kpi.totalTrades).toBe(4)
  })

  it('excludes breakeven trades from winrate calculation', () => {
    const trades = [
      { outcome: 'win', result_currency: 100 },
      { outcome: 'breakeven', result_currency: 0 },
      { outcome: 'breakeven', result_currency: 0 },
    ]
    const kpi = computeKpi(trades)
    expect(kpi.winrate).toBe(100)
    expect(kpi.totalTrades).toBe(3)
  })

  it('calculates totalPnl and avgPnl correctly', () => {
    const trades = [
      { outcome: 'win', result_currency: 200 },
      { outcome: 'loss', result_currency: -100 },
    ]
    const kpi = computeKpi(trades)
    expect(kpi.totalPnl).toBe(100)
    expect(kpi.avgPnl).toBe(50)
  })

  it('identifies best and worst trades correctly', () => {
    const trades = [
      { outcome: 'win', result_currency: 500 },
      { outcome: 'win', result_currency: 150 },
      { outcome: 'loss', result_currency: -300 },
    ]
    const kpi = computeKpi(trades)
    expect(kpi.bestTrade).toBe(500)
    expect(kpi.worstTrade).toBe(-300)
  })

  it('handles null result_currency as 0', () => {
    const trades = [
      { outcome: 'win', result_currency: null },
      { outcome: 'loss', result_currency: -100 },
    ]
    const kpi = computeKpi(trades)
    expect(kpi.totalPnl).toBe(-100)
  })
})
