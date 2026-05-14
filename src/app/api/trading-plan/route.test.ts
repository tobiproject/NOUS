// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

function makeChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/trading-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/trading-plan', () => {
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
    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns sections array for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockSections = [
      { section_key: 'risiko_regeln', rules: ['Max 1% Risk'], notes: 'Strict', updated_at: '2026-05-14T10:00:00Z' },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockSections, error: null }),
    })

    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sections).toEqual(mockSections)
  })

  it('returns empty array when no sections exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sections).toEqual([])
  })

  it('returns 500 on database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })

    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('POST /api/trading-plan', () => {
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
    const res = await POST(makePostRequest({ section_key: 'risiko_regeln', rules: [], notes: '' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid section_key', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ section_key: 'invalid_key', rules: [], notes: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for notes exceeding 5000 chars', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({
      section_key: 'risiko_regeln',
      rules: [],
      notes: 'x'.repeat(5001),
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for rule exceeding 1000 chars', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({
      section_key: 'risiko_regeln',
      rules: ['x'.repeat(1001)],
      notes: '',
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for more than 100 rules', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({
      section_key: 'risiko_regeln',
      rules: Array(101).fill('rule'),
      notes: '',
    }))
    expect(res.status).toBe(400)
  })

  it('saves section successfully with upsert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(makeChain({ error: null }))

    const { POST } = await import('./route')
    const res = await POST(makePostRequest({
      section_key: 'risiko_regeln',
      rules: ['Max 1% Risk per Trade', 'Max 3% Daily Loss'],
      notes: 'Strict risk management required.',
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('accepts all 8 valid section keys', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(makeChain({ error: null }))

    const validKeys = [
      'strategie_uebersicht', 'setup_kriterien', 'entry_exit_regeln',
      'risiko_regeln', 'psychologie_mindset', 'verbotene_verhaltensweisen',
      'review_prozess', 'prop_firm_regeln',
    ]
    const { POST } = await import('./route')
    for (const key of validKeys) {
      const res = await POST(makePostRequest({ section_key: key, rules: [], notes: '' }))
      expect(res.status).toBe(200)
    }
  })

  it('returns 500 when upsert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue(makeChain({ error: { message: 'Upsert failed' } }))

    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ section_key: 'risiko_regeln', rules: [], notes: '' }))
    expect(res.status).toBe(500)
  })

  it('returns 400 for malformed JSON body', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/trading-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
