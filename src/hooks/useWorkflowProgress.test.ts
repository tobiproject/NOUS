import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Pure helper: getISOWeek ─────────────────────────────────────────────────
// Mirrors the private function used in all /api/workflow/* routes
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

// ─── Pure helper: matchesWatchlist ──────────────────────────────────────────
// Mirrors the FIXED matching logic in /api/workflow/progress/route.ts
function matchesWatchlist(currency: string, watchlistSymbols: string[]): boolean {
  const curr = (currency ?? '').toLowerCase()
  if (!curr) return false
  return watchlistSymbols.some(sym => {
    const symLow = sym.toLowerCase()
    if (symLow.includes(curr)) return true
    const base = symLow.slice(0, 3)
    if (base && curr.includes(base)) return true
    const quote = symLow.slice(3, 6)
    if (quote && curr.includes(quote)) return true
    return false
  })
}

// ─── Pure helper: stale check ────────────────────────────────────────────────
// Mirrors the stale logic in useWorkflowProgress
const STALE_MS = 30_000
function isFetchNeeded(lastFetchTime: number, now: number, force: boolean): boolean {
  return force || now - lastFetchTime >= STALE_MS
}

// ─────────────────────────────────────────────────────────────────────────────

describe('getISOWeek', () => {
  it('returns correct week for a known Monday', () => {
    // 2026-05-11 is a Monday, ISO week 20
    expect(getISOWeek(new Date('2026-05-11'))).toBe('2026-W20')
  })

  it('returns correct week for a Sunday (end of week)', () => {
    // 2026-05-17 is a Sunday, still ISO week 20
    expect(getISOWeek(new Date('2026-05-17'))).toBe('2026-W20')
  })

  it('returns correct week for the year-boundary week', () => {
    // 2025-12-31 belongs to week 1 of 2026 in ISO
    expect(getISOWeek(new Date('2026-01-01'))).toBe('2026-W01')
  })

  it('formats week number with leading zero for single-digit weeks', () => {
    // 2026-01-05 is a Monday, ISO week 2
    expect(getISOWeek(new Date('2026-01-05'))).toMatch(/W\d{2}$/)
    expect(getISOWeek(new Date('2026-01-05'))).toBe('2026-W02')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('matchesWatchlist (calendar warning logic)', () => {
  it('matches EUR event for EURUSD watchlist symbol', () => {
    expect(matchesWatchlist('EUR', ['EURUSD'])).toBe(true)
  })

  it('matches USD event for EURUSD watchlist symbol', () => {
    // USD is chars 3–6 of EURUSD
    expect(matchesWatchlist('USD', ['EURUSD'])).toBe(true)
  })

  it('does not match unrelated currency', () => {
    expect(matchesWatchlist('JPY', ['EURUSD'])).toBe(false)
  })

  it('matches XAUUSD for USD event', () => {
    expect(matchesWatchlist('USD', ['XAUUSD'])).toBe(true)
  })

  it('returns false for empty watchlist', () => {
    expect(matchesWatchlist('EUR', [])).toBe(false)
  })

  it('3-char symbol (BTC) does not false-positive match an unrelated currency (BUG-2 fixed)', () => {
    // Before fix: sym.slice(3,6) === '' caused ''.includes('') = true → false positive
    // After fix: empty quote slice is guarded, so no spurious match
    expect(matchesWatchlist('JPY', ['BTC'])).toBe(false)
  })

  it('3-char symbol (BTC) still matches if currency is literally in the symbol', () => {
    // 'btc'.includes('btc') is true — real match should still work
    expect(matchesWatchlist('BTC', ['BTC'])).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('stale-time logic (useWorkflowProgress)', () => {
  it('forces fetch when force=true regardless of last fetch time', () => {
    const now = Date.now()
    expect(isFetchNeeded(now - 5_000, now, true)).toBe(true)
  })

  it('skips fetch when within stale window and not forced', () => {
    const now = Date.now()
    expect(isFetchNeeded(now - 5_000, now, false)).toBe(false)
  })

  it('triggers fetch when stale window has elapsed', () => {
    const now = Date.now()
    expect(isFetchNeeded(now - 31_000, now, false)).toBe(true)
  })

  it('triggers fetch when no previous fetch (lastFetchTime = 0)', () => {
    expect(isFetchNeeded(0, Date.now(), false)).toBe(true)
  })
})
