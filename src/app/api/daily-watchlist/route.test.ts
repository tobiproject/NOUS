// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

function makeSupabaseMock(user: { id: string } | null) {
  mockGetUser.mockResolvedValue({ data: { user } })
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  mockFrom.mockReturnValue(chain)
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as any)
  return chain
}

// Zod v4 requires strict RFC 4122 UUID (version bits [1-8], variant bits [89abAB])
const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

function makeGET(params: Record<string, string>) {
  const url = new URL('http://localhost/api/daily-watchlist')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), { method: 'GET' })
}

function makePOST(body: unknown) {
  return new NextRequest('http://localhost/api/daily-watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/daily-watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 when unauthenticated', async () => {
    makeSupabaseMock(null)
    const { GET } = await import('./route')
    const res = await GET(makeGET({ account_id: '123e4567-e89b-12d3-a456-426614174000' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account_id missing', async () => {
    makeSupabaseMock({ id: 'user-1' })
    const { GET } = await import('./route')
    const res = await GET(makeGET({}))
    expect(res.status).toBe(400)
  })

  it('returns items for authenticated user with valid account_id', async () => {
    const chain = makeSupabaseMock({ id: 'user-1' })
    const fakeItems = [
      { id: 'item-1', symbol: 'ES', date: '2026-05-15', account_id: 'acc-1', user_id: 'user-1', created_at: '' },
    ]
    chain.order.mockResolvedValue({ data: fakeItems, error: null })
    const { GET } = await import('./route')
    const res = await GET(makeGET({ account_id: '123e4567-e89b-12d3-a456-426614174000', date: '2026-05-15' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual(fakeItems)
  })
})

describe('POST /api/daily-watchlist', () => {
  // Import the route once — do not reset modules to avoid mock re-instantiation issues
  let POST: Awaited<ReturnType<typeof import('./route')>>['POST']

  beforeAll(async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as any)
    const mod = await import('./route')
    POST = mod.POST
  })

  beforeEach(() => {
    // Re-apply mock resolved value each test (do NOT clearAllMocks — it can break mockResolvedValue state)
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as any)
    mockGetUser.mockReset()
    mockFrom.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makePOST({ account_id: '123e4567-e89b-12d3-a456-426614174000', symbol: 'ES' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid account_id (not UUID)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await POST(makePOST({ account_id: 'not-a-uuid', symbol: 'ES' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty symbol', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const res = await POST(makePOST({ account_id: '123e4567-e89b-12d3-a456-426614174000', symbol: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when account does not belong to user (AC-10, AC-7)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const res = await POST(makePOST({
      account_id: '123e4567-e89b-12d3-a456-426614174000',
      symbol: 'ES',
    }))
    expect(res.status).toBe(403)
  })

  it('returns 409 on duplicate symbol (unique constraint) (AC-9)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'acc-1' }, error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const res = await POST(makePOST({
      account_id: '123e4567-e89b-12d3-a456-426614174000',
      symbol: 'ES',
    }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('bereits')
  })

  it('uppercases symbol before insert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const insertedRows: unknown[] = []
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'acc-1' }, error: null }),
      insert: vi.fn().mockImplementation((row: unknown) => { insertedRows.push(row); return chain }),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-id', symbol: 'ES', date: '2026-05-15', account_id: 'acc-1', user_id: 'user-1', created_at: '' }, error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockFrom.mockReturnValue(chain)
    const res = await POST(makePOST({
      account_id: '123e4567-e89b-12d3-a456-426614174000',
      symbol: 'es',
    }))
    expect(res.status).toBe(200)
    const inserted = insertedRows[0] as Record<string, unknown>
    expect(inserted.symbol).toBe('ES')
  })
})
