// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

function makePutRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/strategy/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/strategy/${id}`, { method: 'DELETE' })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('PUT /api/strategy/[id]', () => {
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
    const { PUT } = await import('./route')
    const res = await PUT(makePutRequest('str-1', { name: 'Updated' }), mockParams('str-1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when name exceeds 100 chars', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { PUT } = await import('./route')
    const res = await PUT(
      makePutRequest('str-1', { name: 'A'.repeat(101) }),
      mockParams('str-1')
    )
    expect(res.status).toBe(400)
  })

  it('updates strategy and returns ok', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ error: null, count: 1 }),
          }),
        }),
      }),
    })
    const { PUT } = await import('./route')
    const res = await PUT(makePutRequest('str-1', { name: 'Momentum' }), mockParams('str-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns 404 when updating a non-existent strategy ID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ error: null, count: 0 }),
          }),
        }),
      }),
    })
    const { PUT } = await import('./route')
    const res = await PUT(makePutRequest('nonexistent-id', { name: 'X' }), mockParams('nonexistent-id'))
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/strategy/[id]', () => {
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
    const { DELETE } = await import('./route')
    const res = await DELETE(makeDeleteRequest('str-1'), mockParams('str-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when strategy not found or belongs to other user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fromMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockFrom.mockReturnValue(fromMock)
    const { DELETE } = await import('./route')
    const res = await DELETE(makeDeleteRequest('other-user-str'), mockParams('other-user-str'))
    expect(res.status).toBe(404)
  })

  it('deletes strategy and returns tradesAffected count', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    // user_strategy fetch (find strategy by id + user_id)
    const fetchChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'str-1', name: 'Momentum' }, error: null }),
    }
    // trades count (2 eq calls: user_id + strategy name)
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
      }),
    }
    // user_strategy delete (2 eq calls: id + user_id)
    const deleteChain = {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

    let idx = 0
    const chains = [fetchChain, countChain, deleteChain]
    mockFrom.mockImplementation(() => chains[idx++])

    const { DELETE } = await import('./route')
    const res = await DELETE(makeDeleteRequest('str-1'), mockParams('str-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tradesAffected).toBe(3)
  })
})
