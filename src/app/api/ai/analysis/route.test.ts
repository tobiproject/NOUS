// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRADE_ID = '550e8400-e29b-41d4-a716-446655440001'

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/ai/analysis')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString())
}

function mockChain(returnValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
  }
  return chain
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/ai/analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as any)
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { GET } = await import('./route')
    const res = await GET(makeRequest({ trade_id: TRADE_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when neither trade_id nor period_start is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { GET } = await import('./route')
    const res = await GET(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('trade_id or period_start required')
  })

  it('returns null when no analysis found for trade', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(mockChain({ data: null, error: null }))

    const { GET } = await import('./route')
    const res = await GET(makeRequest({ trade_id: TRADE_ID }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toBeNull()
  })

  it('returns analysis data when found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const analysis = { id: 'analysis-1', status: 'completed', score: 8, summary: 'Good trade' }
    mockFrom.mockReturnValue(mockChain({ data: analysis, error: null }))

    const { GET } = await import('./route')
    const res = await GET(makeRequest({ trade_id: TRADE_ID }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('analysis-1')
    expect(json.status).toBe('completed')
  })

  it('returns analysis when queried by period_start', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const analysis = { id: 'period-analysis-1', status: 'completed', type: 'weekly' }
    mockFrom.mockReturnValue(mockChain({ data: analysis, error: null }))

    const { GET } = await import('./route')
    const res = await GET(makeRequest({ period_start: '2026-04-14', type: 'weekly' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('period-analysis-1')
  })
})
