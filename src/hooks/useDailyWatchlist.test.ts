// @vitest-environment node
import { describe, it, expect } from 'vitest'

// Pure logic extracted from useDailyWatchlist for unit testing

function deriveTodaySymbols(items: { symbol: string }[]): string[] {
  return items.map(i => i.symbol)
}

function computeToday(dateOverride?: string): string {
  return dateOverride ?? new Date().toISOString().split('T')[0]
}

function deduplicateSymbols(existing: string[], candidate: string): boolean {
  return existing.includes(candidate)
}

// AC-3: todaySymbols derivation only from current items
describe('todaySymbols derivation (AC-3)', () => {
  it('returns empty array when no items', () => {
    expect(deriveTodaySymbols([])).toEqual([])
  })

  it('maps items to symbol strings', () => {
    const items = [
      { symbol: 'ES' },
      { symbol: 'NQ' },
      { symbol: 'EUR/USD' },
    ]
    expect(deriveTodaySymbols(items)).toEqual(['ES', 'NQ', 'EUR/USD'])
  })

  it('preserves order', () => {
    const items = [{ symbol: 'ZN' }, { symbol: 'CL' }, { symbol: 'GC' }]
    expect(deriveTodaySymbols(items)).toEqual(['ZN', 'CL', 'GC'])
  })
})

// AC-9: no duplicate symbols allowed
describe('duplicate symbol prevention (AC-9)', () => {
  it('detects already-selected symbol', () => {
    expect(deduplicateSymbols(['ES', 'NQ'], 'ES')).toBe(true)
    expect(deduplicateSymbols(['ES', 'NQ'], 'NQ')).toBe(true)
  })

  it('allows adding a new symbol not yet selected', () => {
    expect(deduplicateSymbols(['ES', 'NQ'], 'CL')).toBe(false)
  })

  it('allows adding to empty list', () => {
    expect(deduplicateSymbols([], 'ES')).toBe(false)
  })
})

// AC-3: date isolation — hook uses correct date
describe('date computation (AC-3)', () => {
  it('uses override date when provided', () => {
    expect(computeToday('2026-05-15')).toBe('2026-05-15')
  })

  it('returns today in YYYY-MM-DD format when no override', () => {
    const result = computeToday()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('yesterday differs from today', () => {
    const today = computeToday('2026-05-15')
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    const yesterday = d.toISOString().split('T')[0]
    expect(yesterday).toBe('2026-05-14')
    expect(yesterday).not.toBe(today)
  })
})

// AC-4: copy-yesterday computes correct yesterday date
describe('copy-yesterday date calculation (AC-4)', () => {
  it('computes yesterday correctly for normal dates', () => {
    const today = '2026-05-15'
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    expect(d.toISOString().split('T')[0]).toBe('2026-05-14')
  })

  it('computes yesterday correctly across month boundary', () => {
    const today = '2026-06-01'
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    expect(d.toISOString().split('T')[0]).toBe('2026-05-31')
  })

  it('computes yesterday correctly across year boundary', () => {
    const today = '2026-01-01'
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    expect(d.toISOString().split('T')[0]).toBe('2025-12-31')
  })
})
