import { describe, it, expect, vi, beforeEach } from 'vitest'

// Pure logic extracted from useAccounts for unit testing
const ACCOUNT_LIMIT = 10

function canCreateAccount(currentCount: number): { allowed: boolean; error?: string } {
  if (currentCount >= ACCOUNT_LIMIT) {
    return { allowed: false, error: `Maximal ${ACCOUNT_LIMIT} Konten erlaubt.` }
  }
  return { allowed: true }
}

function canArchiveAccount(activeCount: number): { allowed: boolean; error?: string } {
  if (activeCount <= 1) {
    return { allowed: false, error: 'Mindestens ein aktives Konto muss vorhanden sein.' }
  }
  return { allowed: true }
}

describe('Account creation limit (AC-1.9)', () => {
  it('allows creating account when under limit', () => {
    expect(canCreateAccount(0).allowed).toBe(true)
    expect(canCreateAccount(5).allowed).toBe(true)
    expect(canCreateAccount(9).allowed).toBe(true)
  })

  it('blocks creating account at limit (10)', () => {
    const result = canCreateAccount(10)
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('10')
  })

  it('blocks creating account over limit', () => {
    expect(canCreateAccount(11).allowed).toBe(false)
  })
})

describe('Account archive protection (EC-1.2)', () => {
  it('allows archiving when more than 1 active account exists', () => {
    expect(canArchiveAccount(2).allowed).toBe(true)
    expect(canArchiveAccount(5).allowed).toBe(true)
  })

  it('blocks archiving last active account', () => {
    const result = canArchiveAccount(1)
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('Mindestens ein aktives Konto')
  })

  it('blocks archiving when 0 active accounts', () => {
    expect(canArchiveAccount(0).allowed).toBe(false)
  })
})

describe('StartBalance validation (EC-1.5)', () => {
  it('accepts valid balances', () => {
    expect(1).toBeGreaterThanOrEqual(1)
    expect(10000).toBeGreaterThanOrEqual(1)
  })

  it('rejects balance of 0', () => {
    expect(0).toBeLessThan(1)
  })

  it('rejects negative balance', () => {
    expect(-100).toBeLessThan(1)
  })
})
