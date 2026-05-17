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

vi.mock('@/lib/anthropic', () => ({
  getAnthropicClient: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRADE_ID = '550e8400-e29b-41d4-a716-446655440001'
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440002'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai/analyze-trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockChain(returnValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
  }
  return chain
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/ai/analyze-trade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as any)
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ trade_id: TRADE_ID, account_id: ACCOUNT_ID }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 for invalid UUID input', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ trade_id: 'not-a-uuid', account_id: 'also-not-uuid' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid input')
  })

  it('returns 400 when body is missing required fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ trade_id: TRADE_ID }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when trade does not belong to user/account', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(mockChain({ data: null, error: null }))

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ trade_id: TRADE_ID, account_id: ACCOUNT_ID }))
    expect(res.status).toBe(404)
  })

  it('returns pending status when trade is found and new analysis is created', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'trade-1' }, error: null }),
        }
      }
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'analysis-1' }, error: null }),
      }
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ trade_id: TRADE_ID, account_id: ACCOUNT_ID }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('pending')
    expect(json.id).toBe('analysis-1')
  })

  it('returns pending status and resets existing analysis', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'trade-1' }, error: null }),
        }
      }
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-analysis', status: 'completed' }, error: null }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ trade_id: TRADE_ID, account_id: ACCOUNT_ID }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('pending')
    expect(json.id).toBe('existing-analysis')
  })
})
