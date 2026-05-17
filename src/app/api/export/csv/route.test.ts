// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const USER_ID = 'user-uuid-001'
const ACCOUNT_ID = 'account-uuid-001'

const SAMPLE_TRADE = {
  id: 'trade-uuid-001',
  account_id: ACCOUNT_ID,
  user_id: USER_ID,
  traded_at: '2026-04-01T10:00:00.000Z',
  asset: 'EURUSD',
  direction: 'long',
  entry_price: 1.1000,
  sl_price: 1.0950,
  tp_price: 1.1100,
  lot_size: 0.1,
  result_currency: 100,
  result_percent: 1.0,
  rr_ratio: 2.0,
  risk_percent: 0.5,
  outcome: 'win',
  setup_type: 'Break & Retest',
  strategy: 'Momentum',
  market_phase: 'trend_bullish',
  tags: ['A-Setup', 'Clean'],
  emotion_before: 'calm',
  emotion_after: 'focused',
  news_event_present: true,
  news_event_name: 'NFP',
  news_impact_level: 'high',
  news_timing_minutes: -15,
  notes: 'Good trade',
  created_at: '2026-04-01T10:05:00.000Z',
  updated_at: '2026-04-01T10:05:00.000Z',
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/export/csv')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

function setupMocks(user: { id: string } | null, trades: unknown[] | null, dbError = false) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(
      dbError
        ? { data: null, error: { message: 'DB error' } }
        : { data: trades, error: null }
    ),
  }
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(mockQuery),
  } as never)
}

describe('GET /api/export/csv', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    setupMocks(null, [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account_id missing', async () => {
    setupMocks({ id: USER_ID }, [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(400)
  })

  it('returns CSV with German headers by default', async () => {
    setupMocks({ id: USER_ID }, [SAMPLE_TRADE])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    const text = await res.text()
    expect(text).toContain('Asset')
    expect(text).toContain('Richtung')
    expect(text).toContain('EURUSD')
    expect(text).toContain('long')
  })

  it('returns CSV with English headers when lang=en', async () => {
    setupMocks({ id: USER_ID }, [SAMPLE_TRADE])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID, lang: 'en' }))
    const text = await res.text()
    expect(text).toContain('Direction')
    expect(text).toContain('Outcome')
  })

  it('returns empty CSV with only header when no trades', async () => {
    setupMocks({ id: USER_ID }, [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(200)
    const text = await res.text()
    const lines = text.trim().split('\n')
    expect(lines).toHaveLength(1)
  })

  it('has correct Content-Disposition filename', async () => {
    setupMocks({ id: USER_ID }, [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const disposition = res.headers.get('Content-Disposition')
    expect(disposition).toMatch(/nous-export-\d{4}-\d{2}-\d{2}\.csv/)
  })

  it('escapes cells with commas correctly', async () => {
    const tradeWithComma = { ...SAMPLE_TRADE, notes: 'Good trade, solid entry' }
    setupMocks({ id: USER_ID }, [tradeWithComma])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const text = await res.text()
    expect(text).toContain('"Good trade, solid entry"')
  })

  it('returns 500 on database error', async () => {
    setupMocks({ id: USER_ID }, null, true)
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(500)
  })
})
