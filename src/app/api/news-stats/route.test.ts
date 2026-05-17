// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001'

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/news-stats')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

function makeTrade(overrides: Partial<{
  outcome: string; result_currency: number;
  news_event_present: boolean; news_impact_level: string; news_timing_minutes: number
}> = {}) {
  return {
    outcome: 'win',
    result_currency: 100,
    news_event_present: false,
    news_impact_level: null,
    news_timing_minutes: null,
    ...overrides,
  }
}

function setupMocks(user: { id: string } | null, trades: unknown[] | null, dbError = false) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockResolvedValue(
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

describe('GET /api/news-stats', () => {
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

  it('returns newsCount=0 and stats=null when no trades', async () => {
    setupMocks({ id: USER_ID }, [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.newsCount).toBe(0)
    expect(body.stats).toBeNull()
  })

  it('returns stats=null when fewer than 5 news trades', async () => {
    const trades = [
      makeTrade({ news_event_present: true, news_impact_level: 'high' }),
      makeTrade({ news_event_present: true, news_impact_level: 'high' }),
    ]
    setupMocks({ id: USER_ID }, trades)
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const body = await res.json()
    expect(body.newsCount).toBe(2)
    expect(body.stats).toBeNull()
  })

  it('returns full stats with 5+ news trades', async () => {
    const newsTrades = [
      makeTrade({ news_event_present: true, news_impact_level: 'high', news_timing_minutes: -15, outcome: 'win', result_currency: 200 }),
      makeTrade({ news_event_present: true, news_impact_level: 'high', news_timing_minutes: -15, outcome: 'win', result_currency: 150 }),
      makeTrade({ news_event_present: true, news_impact_level: 'medium', news_timing_minutes: 15, outcome: 'loss', result_currency: -100 }),
      makeTrade({ news_event_present: true, news_impact_level: 'medium', news_timing_minutes: 15, outcome: 'win', result_currency: 80 }),
      makeTrade({ news_event_present: true, news_impact_level: 'low', news_timing_minutes: 30, outcome: 'loss', result_currency: -50 }),
    ]
    const noNewsTrades = [
      makeTrade({ outcome: 'win', result_currency: 100 }),
      makeTrade({ outcome: 'loss', result_currency: -50 }),
    ]
    setupMocks({ id: USER_ID }, [...newsTrades, ...noNewsTrades])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.newsCount).toBe(5)
    expect(body.stats.withNews.count).toBe(5)
    expect(body.stats.withoutNews.count).toBe(2)
    expect(body.stats.byImpact).toHaveLength(3)
    expect(body.stats.byTiming.length).toBeGreaterThan(0)

    const highImpact = body.stats.byImpact.find((i: { level: string }) => i.level === 'high')
    expect(highImpact.winrate).toBe(100)
    expect(highImpact.avgPnl).toBe(175)
  })

  it('returns 500 on database error', async () => {
    setupMocks({ id: USER_ID }, null, true)
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(500)
  })
})
