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
  const url = new URL('http://localhost/api/trades/suggestions')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

function setupMocks(
  user: { id: string } | null,
  recentTrades: { setup_type: string }[],
  stratTrades: { strategy: string }[]
) {
  let callCount = 0
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation(() => {
      callCount++
      const isFirst = callCount <= 1
      const data = isFirst ? recentTrades : stratTrades
      // First query uses .limit(), second query ends with .order()
      const chain: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data, error: null }),
      }
      chain.order = vi.fn().mockImplementation(() => {
        if (!isFirst) return Promise.resolve({ data, error: null })
        return chain
      })
      return chain
    }),
  } as never)
}

describe('GET /api/trades/suggestions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    setupMocks(null, [], [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account_id is missing', async () => {
    setupMocks({ id: USER_ID }, [], [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(400)
  })

  it('returns empty arrays when no data', async () => {
    setupMocks({ id: USER_ID }, [], [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.topSetups).toEqual([])
    expect(body.strategies).toEqual([])
  })

  it('returns top 3 setups by frequency', async () => {
    const recentTrades = [
      { setup_type: 'Breakout' },
      { setup_type: 'Breakout' },
      { setup_type: 'Breakout' },
      { setup_type: 'ICT' },
      { setup_type: 'ICT' },
      { setup_type: 'Reversal' },
      { setup_type: 'Scalp' },
    ]
    setupMocks({ id: USER_ID }, recentTrades, [])
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.topSetups).toHaveLength(3)
    expect(body.topSetups[0]).toBe('Breakout')
    expect(body.topSetups[1]).toBe('ICT')
  })

  it('deduplicates strategies', async () => {
    const stratTrades = [
      { strategy: 'ICT Concepts' },
      { strategy: 'ICT Concepts' },
      { strategy: 'Smart Money' },
    ]
    setupMocks({ id: USER_ID }, [{ setup_type: '' }], stratTrades)
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.strategies).toEqual(expect.arrayContaining(['ICT Concepts', 'Smart Money']))
    expect(body.strategies.filter((s: string) => s === 'ICT Concepts')).toHaveLength(1)
  })
})
