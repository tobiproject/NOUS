// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001'
const TODAY = new Date().toISOString().split('T')[0]

const PLAN = {
  id: 'plan-1',
  user_id: USER_ID,
  account_id: ACCOUNT_ID,
  plan_date: TODAY,
  market_bias: 'bullish',
  focus_assets: ['EURUSD', 'BTC'],
  errors_to_avoid: ['FOMO Trade'],
  notes: 'Watch ECB',
  created_at: new Date().toISOString(),
}

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/daily-plan')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/daily-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupGetMocks(user: { id: string } | null, plan: unknown) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: plan, error: null }),
    }),
  } as never)
}

function setupPostMocks(user: { id: string } | null, account: unknown, returnedPlan: unknown) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: account, error: null }),
        }
      }
      return {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: returnedPlan, error: null }),
      }
    }),
  } as never)
}

describe('GET /api/daily-plan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    setupGetMocks(null, null)
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest({ account_id: ACCOUNT_ID }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account_id is missing', async () => {
    setupGetMocks({ id: USER_ID }, null)
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(400)
  })

  it('returns plan: null when no plan exists', async () => {
    setupGetMocks({ id: USER_ID }, null)
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest({ account_id: ACCOUNT_ID }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.plan).toBeNull()
  })

  it('returns existing plan', async () => {
    setupGetMocks({ id: USER_ID }, PLAN)
    const { GET } = await import('./route')
    const res = await GET(makeGetRequest({ account_id: ACCOUNT_ID }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.plan.market_bias).toBe('bullish')
    expect(body.plan.focus_assets).toEqual(['EURUSD', 'BTC'])
  })
})

describe('POST /api/daily-plan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    setupPostMocks(null, null, null)
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ account_id: ACCOUNT_ID, plan_date: TODAY }))
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid plan_date format', async () => {
    setupPostMocks({ id: USER_ID }, { id: ACCOUNT_ID }, null)
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ account_id: ACCOUNT_ID, plan_date: '15-01-2024' }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when account not found', async () => {
    setupPostMocks({ id: USER_ID }, null, null)
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ account_id: ACCOUNT_ID, plan_date: TODAY }))
    expect(res.status).toBe(403)
  })

  it('creates a new plan successfully', async () => {
    setupPostMocks({ id: USER_ID }, { id: ACCOUNT_ID }, PLAN)
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({
      account_id: ACCOUNT_ID,
      plan_date: TODAY,
      market_bias: 'bullish',
      focus_assets: ['EURUSD'],
      errors_to_avoid: ['FOMO Trade'],
      notes: 'Watch ECB',
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.plan.market_bias).toBe('bullish')
  })

  it('accepts null market_bias', async () => {
    setupPostMocks({ id: USER_ID }, { id: ACCOUNT_ID }, { ...PLAN, market_bias: null })
    const { POST } = await import('./route')
    const res = await POST(makePostRequest({ account_id: ACCOUNT_ID, plan_date: TODAY, market_bias: null }))
    expect(res.status).toBe(200)
  })
})
