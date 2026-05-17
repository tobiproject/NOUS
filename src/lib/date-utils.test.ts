import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { getWeekRange, getMonthRange } from './date-utils'

describe('getWeekRange', () => {
  afterEach(() => { vi.useRealTimers() })

  function mockDate(isoDate: string) {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(isoDate))
  }

  test('returns Mon–Sun for a Wednesday', () => {
    mockDate('2026-04-22') // Wednesday
    const { start, end } = getWeekRange(0)
    expect(start).toBe('2026-04-20') // Monday
    expect(end).toBe('2026-04-26')   // Sunday
  })

  test('returns Mon–Sun when called on a Monday', () => {
    mockDate('2026-04-20') // Monday
    const { start, end } = getWeekRange(0)
    expect(start).toBe('2026-04-20')
    expect(end).toBe('2026-04-26')
  })

  test('Sunday edge case: returns previous Mon–Sun (not next week)', () => {
    mockDate('2026-04-26') // Sunday
    const { start, end } = getWeekRange(0)
    expect(start).toBe('2026-04-20') // Monday of same ISO week
    expect(end).toBe('2026-04-26')
  })

  test('offsetWeeks=1 returns the previous week', () => {
    mockDate('2026-04-22') // Wednesday, week starts 2026-04-20
    const { start, end } = getWeekRange(1)
    expect(start).toBe('2026-04-13')
    expect(end).toBe('2026-04-19')
  })

  test('start and end are always 6 days apart', () => {
    mockDate('2026-04-22')
    for (let offset = 0; offset < 5; offset++) {
      const { start, end } = getWeekRange(offset)
      const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000
      expect(diff).toBe(6)
    }
  })
})

describe('getMonthRange', () => {
  afterEach(() => { vi.useRealTimers() })

  function mockDate(isoDate: string) {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(isoDate))
  }

  test('returns first and last day of current month', () => {
    mockDate('2026-04-15')
    const { start, end } = getMonthRange(0)
    expect(start).toBe('2026-04-01')
    expect(end).toBe('2026-04-30')
  })

  test('offsetMonths=1 returns previous month', () => {
    mockDate('2026-04-15')
    const { start, end } = getMonthRange(1)
    expect(start).toBe('2026-03-01')
    expect(end).toBe('2026-03-31')
  })

  test('handles February in leap year correctly', () => {
    mockDate('2024-02-10')
    const { start, end } = getMonthRange(0)
    expect(start).toBe('2024-02-01')
    expect(end).toBe('2024-02-29') // 2024 is a leap year
  })

  test('handles month overflow: offset crosses year boundary', () => {
    mockDate('2026-02-15')
    const { start, end } = getMonthRange(2) // December 2025
    expect(start).toBe('2025-12-01')
    expect(end).toBe('2025-12-31')
  })
})
