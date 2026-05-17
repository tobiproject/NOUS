import { describe, it, expect } from 'vitest'
import { getPnlStyle, getDirectionColor } from './trade-display'

describe('getPnlStyle', () => {
  it('returns neutral color for null P&L', () => {
    expect(getPnlStyle(null)).toEqual({ color: 'var(--fg-3)' })
  })

  it('returns neutral color for breakeven (0)', () => {
    expect(getPnlStyle(0)).toEqual({ color: 'var(--fg-3)' })
  })

  it('returns long/green color for positive P&L', () => {
    expect(getPnlStyle(100)).toEqual({ color: 'var(--long)' })
    expect(getPnlStyle(0.01)).toEqual({ color: 'var(--long)' })
  })

  it('returns short/red color for negative P&L', () => {
    expect(getPnlStyle(-50)).toEqual({ color: 'var(--short)' })
    expect(getPnlStyle(-0.01)).toEqual({ color: 'var(--short)' })
  })
})

describe('getDirectionColor', () => {
  it('returns long color for long trades', () => {
    expect(getDirectionColor('long')).toBe('var(--long)')
  })

  it('returns short color for short trades', () => {
    expect(getDirectionColor('short')).toBe('var(--short)')
  })
})
