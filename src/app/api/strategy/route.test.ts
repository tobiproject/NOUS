// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

function makeGetRequest(accountId?: string) {
  const url = accountId
    ? `http://localhost/api/strategy?account_id=${accountId}`
    : 'http://localhost/api/strategy'
  return new NextRequest(url, { method: 'GET' })
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest('acc-1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account_id missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('account_id required')
  })

  it('returns strategies array for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockStrategies = [
      { id: 'str-1', name: 'Momentum', user_id: 'user-1', account_id: 'acc-1' },
      { id: 'str-2', name: 'Reversal', user_id: 'user-1', account_id: 'acc-1' },
    ]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockStrategies, error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest('acc-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.strategies).toHaveLength(2)
    expect(json.strategies[0].name).toBe('Momentum')
  })

  it('returns empty array when no strategies exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest('acc-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.strategies).toEqual([])
  })

  it('returns 500 on database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockFrom.mockReturnValue(chain)
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest('acc-1'))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ account_id: 'acc-1', name: 'Test' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ account_id: 'acc-1', name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when account_id is not a UUID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ account_id: 'not-a-uuid', name: 'Momentum' }))
    expect(res.status).toBe(400)
  })

  it('creates strategy and returns new id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // First call: uniqueness check (count = 0 → no duplicate)
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      }),
    }
    // Second call: insert
    const insertChain = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-str-id' }, error: null }),
        }),
      }),
    }
    let idx = 0
    mockFrom.mockImplementation(() => [countChain, insertChain][idx++])
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({
      account_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Momentum Breakout',
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.id).toBe('new-str-id')
  })

  it('returns 409 when strategy name already exists for this account', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      }),
    })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({
      account_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Existing Strategy',
    }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toContain('existiert bereits')
  })

  it('enforces max 100 char name', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({
      account_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'A'.repeat(101),
    }))
    expect(res.status).toBe(400)
  })
})
