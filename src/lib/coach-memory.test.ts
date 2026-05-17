import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}))

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { formatInsightsForPrompt } from './coach-memory'
import type { CoachInsight } from './coach-memory'

const base: Omit<CoachInsight, 'insight' | 'confirmed' | 'weight' | 'id'> = {
  user_id: 'user-1',
  account_id: 'acc-1',
  source: 'conversation',
  created_at: '2026-05-15T10:00:00Z',
  updated_at: '2026-05-15T10:00:00Z',
}

describe('formatInsightsForPrompt', () => {
  it('returns empty string when no insights', () => {
    expect(formatInsightsForPrompt([])).toBe('')
  })

  it('includes header block when insights exist', () => {
    const insights: CoachInsight[] = [
      { ...base, id: '1', insight: 'Bricht SL nach 2 Losses', confirmed: null, weight: 1 },
    ]
    const result = formatInsightsForPrompt(insights)
    expect(result).toContain('GESPEICHERTE PSYCHOLOGISCHE ERKENNTNISSE')
  })

  it('shows confirmed insights in confirmed section', () => {
    const insights: CoachInsight[] = [
      { ...base, id: '1', insight: 'Revenge-Trading nach Losses', confirmed: true, weight: 2 },
    ]
    const result = formatInsightsForPrompt(insights)
    expect(result).toContain('BESTÄTIGTE MUSTER')
    expect(result).toContain('Revenge-Trading nach Losses')
    expect(result).toContain('[2x bestätigt]')
  })

  it('shows weight indicator only when weight > 1', () => {
    const insights: CoachInsight[] = [
      { ...base, id: '1', insight: 'Einstieg zu früh', confirmed: true, weight: 1 },
    ]
    const result = formatInsightsForPrompt(insights)
    expect(result).not.toContain('[1x bestätigt]')
  })

  it('shows pending insights in observed section', () => {
    const insights: CoachInsight[] = [
      { ...base, id: '1', insight: 'Impulsiver Einstieg bei News', confirmed: null, weight: 1 },
    ]
    const result = formatInsightsForPrompt(insights)
    expect(result).toContain('BEOBACHTETE MUSTER')
    expect(result).toContain('Impulsiver Einstieg bei News')
  })

  it('separates confirmed and pending insights into distinct sections', () => {
    const insights: CoachInsight[] = [
      { ...base, id: '1', insight: 'Bestätigtes Muster', confirmed: true, weight: 3 },
      { ...base, id: '2', insight: 'Offenes Muster', confirmed: null, weight: 1 },
    ]
    const result = formatInsightsForPrompt(insights)
    expect(result).toContain('BESTÄTIGTE MUSTER')
    expect(result).toContain('BEOBACHTETE MUSTER')
    expect(result).toContain('Bestätigtes Muster')
    expect(result).toContain('Offenes Muster')
  })

  it('does not include rejected insights', () => {
    // rejected insights are filtered out before calling this function (via getMemoryInsights .neq('confirmed', false))
    // but formatInsightsForPrompt itself should not show them if passed in
    const insights: CoachInsight[] = [
      { ...base, id: '1', insight: 'Abgelehntes Muster', confirmed: false, weight: 1 },
    ]
    const result = formatInsightsForPrompt(insights)
    // false-confirmed items have neither confirmed=true nor confirmed=null so they appear in neither section
    expect(result).not.toContain('BESTÄTIGTE MUSTER')
    expect(result).not.toContain('BEOBACHTETE MUSTER')
  })

  it('includes call-to-action for coach to reference patterns', () => {
    const insights: CoachInsight[] = [
      { ...base, id: '1', insight: 'Test insight', confirmed: true, weight: 1 },
    ]
    const result = formatInsightsForPrompt(insights)
    expect(result).toContain('Wenn der Trader ein bekanntes Muster zeigt')
  })
})
