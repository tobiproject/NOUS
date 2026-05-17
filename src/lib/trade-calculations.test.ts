import { describe, it, expect } from 'vitest'
import {
  calcRR,
  calcRiskPercent,
  calcResultPercent,
  calcOutcome,
  validateSLSide,
  calculateTrade,
} from './trade-calculations'

describe('calcRR', () => {
  it('calculates RR for a long trade', () => {
    expect(calcRR(100, 95, 115)).toBe(3)
  })

  it('calculates RR for a short trade', () => {
    expect(calcRR(100, 110, 80)).toBe(2)
  })

  it('returns null when entry is missing', () => {
    expect(calcRR(undefined, 95, 115)).toBeNull()
  })

  it('returns null when sl is missing', () => {
    expect(calcRR(100, undefined, 115)).toBeNull()
  })

  it('returns null when tp is missing', () => {
    expect(calcRR(100, 95, undefined)).toBeNull()
  })

  it('returns null when sl equals entry (zero distance)', () => {
    expect(calcRR(100, 100, 115)).toBeNull()
  })

  it('rounds to 2 decimal places', () => {
    expect(calcRR(100, 97, 107)).toBe(2.33)
  })
})

describe('calcRiskPercent', () => {
  it('calculates risk percent correctly', () => {
    expect(calcRiskPercent(100, 95, 1, 1000)).toBe(0.5)
  })

  it('returns null when entry is missing', () => {
    expect(calcRiskPercent(undefined, 95, 1, 1000)).toBeNull()
  })

  it('returns null when sl is missing', () => {
    expect(calcRiskPercent(100, undefined, 1, 1000)).toBeNull()
  })

  it('returns null when lotSize is missing', () => {
    expect(calcRiskPercent(100, 95, undefined, 1000)).toBeNull()
  })

  it('returns null when accountBalance is zero', () => {
    expect(calcRiskPercent(100, 95, 1, 0)).toBeNull()
  })

  it('returns null when accountBalance is missing', () => {
    expect(calcRiskPercent(100, 95, 1, undefined)).toBeNull()
  })
})

describe('calcResultPercent', () => {
  it('calculates positive result percent', () => {
    expect(calcResultPercent(50, 1000)).toBe(5)
  })

  it('calculates negative result percent', () => {
    expect(calcResultPercent(-100, 1000)).toBe(-10)
  })

  it('returns null when resultCurrency is undefined', () => {
    expect(calcResultPercent(undefined, 1000)).toBeNull()
  })

  it('returns null when accountBalance is zero', () => {
    expect(calcResultPercent(50, 0)).toBeNull()
  })

  it('handles zero result (breakeven)', () => {
    expect(calcResultPercent(0, 1000)).toBe(0)
  })
})

describe('calcOutcome', () => {
  it('returns win for positive result', () => {
    expect(calcOutcome(100)).toBe('win')
  })

  it('returns loss for negative result', () => {
    expect(calcOutcome(-50)).toBe('loss')
  })

  it('returns breakeven for zero', () => {
    expect(calcOutcome(0)).toBe('breakeven')
  })

  it('returns breakeven within threshold (0.01)', () => {
    expect(calcOutcome(0.005)).toBe('breakeven')
    expect(calcOutcome(-0.005)).toBe('breakeven')
  })

  it('returns win just above threshold', () => {
    expect(calcOutcome(0.02)).toBe('win')
  })

  it('returns null when resultCurrency is undefined', () => {
    expect(calcOutcome(undefined)).toBeNull()
  })

  it('returns null when resultCurrency is null', () => {
    expect(calcOutcome(null as unknown as undefined)).toBeNull()
  })
})

describe('validateSLSide', () => {
  it('returns null for valid long trade (SL below entry)', () => {
    expect(validateSLSide('long', 100, 95)).toBeNull()
  })

  it('returns null for valid short trade (SL above entry)', () => {
    expect(validateSLSide('short', 100, 105)).toBeNull()
  })

  it('returns error for long trade with SL above entry', () => {
    expect(validateSLSide('long', 100, 105)).not.toBeNull()
  })

  it('returns error for long trade with SL equal to entry', () => {
    expect(validateSLSide('long', 100, 100)).not.toBeNull()
  })

  it('returns error for short trade with SL below entry', () => {
    expect(validateSLSide('short', 100, 95)).not.toBeNull()
  })

  it('returns error for short trade with SL equal to entry', () => {
    expect(validateSLSide('short', 100, 100)).not.toBeNull()
  })
})

describe('calculateTrade', () => {
  it('returns all derived values for a complete long trade', () => {
    const result = calculateTrade({
      entryPrice: 100,
      slPrice: 95,
      tpPrice: 115,
      lotSize: 1,
      resultCurrency: 150,
      accountBalance: 10000,
    })
    expect(result.rrRatio).toBe(3)
    expect(result.riskPercent).toBe(0.05)
    expect(result.resultPercent).toBe(1.5)
    expect(result.outcome).toBe('win')
  })

  it('returns nulls for incomplete input', () => {
    const result = calculateTrade({})
    expect(result.rrRatio).toBeNull()
    expect(result.riskPercent).toBeNull()
    expect(result.resultPercent).toBeNull()
    expect(result.outcome).toBeNull()
  })

  it('calculates loss outcome for negative result', () => {
    const result = calculateTrade({
      entryPrice: 100,
      slPrice: 95,
      tpPrice: 115,
      lotSize: 1,
      resultCurrency: -50,
      accountBalance: 10000,
    })
    expect(result.outcome).toBe('loss')
    expect(result.resultPercent).toBe(-0.5)
  })
})
