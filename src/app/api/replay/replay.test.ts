import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase-server'

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/replay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/replay', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when unauthenticated', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const res = await POST(makeReq({ account_id: '00000000-0000-0000-0000-000000000001', trade_id: '00000000-0000-0000-0000-000000000002', would_take: true }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user1' } } }) },
    })
    const res = await POST(makeReq({ account_id: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })
})
