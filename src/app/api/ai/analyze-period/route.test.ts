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

const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440002'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai/analyze-period', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  account_id: ACCOUNT_ID,
  type: 'weekly',
  period_start: '2026-04-14',
  period_end: '2026-04-20',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/ai/analyze-period', () => {
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
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid input (bad UUID)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ ...VALID_BODY, account_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid input')
  })

  it('returns 400 for invalid type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ ...VALID_BODY, type: 'quarterly' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid date format', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ ...VALID_BODY, period_start: '14-04-2026' }))
    expect(res.status).toBe(400)
  })

  it('returns pending status when new analysis is created', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'period-analysis-1' }, error: null }),
      }
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('pending')
    expect(json.id).toBe('period-analysis-1')
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
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-period', status: 'failed' }, error: null }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('pending')
    expect(json.id).toBe('existing-period')
  })
})
