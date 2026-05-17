// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const USER_ID = 'user-uuid-001'
const ACCOUNT_ID = 'account-uuid-001'

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/export/full')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

function setupMocks(opts: {
  user: { id: string } | null
  account?: { id: string; name: string } | null
  accountError?: boolean
}) {
  const { user, account = { id: ACCOUNT_ID, name: 'Test Account' }, accountError = false } = opts

  const makeChain = (returnData: unknown, error: unknown = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: returnData, error }),
    single: vi.fn().mockResolvedValue(
      accountError
        ? { data: null, error: { message: 'Not found' } }
        : { data: account, error: null }
    ),
  })

  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'accounts') return makeChain([{ id: ACCOUNT_ID, name: 'Test' }])
      if (table === 'trades') return makeChain([{ id: 'trade-1', asset: 'EURUSD' }])
      if (table === 'ai_analyses') return makeChain([])
      if (table === 'risk_configs') return makeChain([])
      return makeChain([])
    }),
  } as never)
}

describe('GET /api/export/full', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    setupMocks({ user: null })
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account_id missing', async () => {
    setupMocks({ user: { id: USER_ID } })
    const { GET } = await import('./route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(400)
  })

  it('returns ZIP file with correct content-type', async () => {
    setupMocks({ user: { id: USER_ID } })
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/zip')
  })

  it('has correct Content-Disposition filename', async () => {
    setupMocks({ user: { id: USER_ID } })
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const disposition = res.headers.get('Content-Disposition')
    expect(disposition).toMatch(/nous-export-\d{4}-\d{2}-\d{2}\.zip/)
  })

  it('returns non-empty binary ZIP response', async () => {
    setupMocks({ user: { id: USER_ID } })
    const { GET } = await import('./route')
    const res = await GET(makeRequest({ account_id: ACCOUNT_ID }))
    const buffer = await res.arrayBuffer()
    // ZIP magic bytes: PK (0x50 0x4B)
    const bytes = new Uint8Array(buffer)
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4B)
  })
})
