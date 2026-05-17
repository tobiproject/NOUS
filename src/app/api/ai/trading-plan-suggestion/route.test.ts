// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/knowledge-context', () => ({
  getKnowledgeContext: vi.fn(),
}))

vi.mock('@/lib/ai-client', () => ({
  callAI: vi.fn(),
}))

import { getKnowledgeContext } from '@/lib/knowledge-context'
import { callAI } from '@/lib/ai-client'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai/trading-plan-suggestion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockKbDocs(docs: unknown[]) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: docs }),
  })
}

describe('POST /api/ai/trading-plan-suggestion', () => {
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
    const res = await POST(makeRequest({ section_key: 'risiko_regeln' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid section_key', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ section_key: 'unknown_section' }))
    expect(res.status).toBe(400)
  })

  it('returns 422 when no KB documents exist (EC-1)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockKbDocs([])
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ section_key: 'risiko_regeln' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toContain('Knowledge Base')
  })

  it('returns 422 when KB context is empty (EC-2)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockKbDocs([{ id: 'doc-1' }])
    vi.mocked(getKnowledgeContext).mockResolvedValue(null)
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ section_key: 'risiko_regeln' }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toContain('Knowledge Base')
  })

  it('returns 422 when AI responds with KEINE_INHALTE (EC-2)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockKbDocs([{ id: 'doc-1' }])
    vi.mocked(getKnowledgeContext).mockResolvedValue('KB context')
    vi.mocked(callAI).mockResolvedValue({ text: 'KEINE_INHALTE' } as any)
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ section_key: 'risiko_regeln' }))
    expect(res.status).toBe(422)
  })

  it('parses structured AI response and returns rules, notes, source', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockKbDocs([{ id: 'doc-1' }])
    vi.mocked(getKnowledgeContext).mockResolvedValue('KB context')
    vi.mocked(callAI).mockResolvedValue({
      text: `REGELN:\n- Max 1% Risk pro Trade\n- Stop Loss hinter letztem Swing\n\nNOTIZEN:\nRisikomanagement ist entscheidend.\n\nQUELLE:\nMein Trading-Regelwerk.pdf, ca. Seite 5, Abschnitt Risiko`,
    } as any)

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ section_key: 'risiko_regeln' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.rules).toContain('Max 1% Risk pro Trade')
    expect(json.rules).toContain('Stop Loss hinter letztem Swing')
    expect(json.notes).toBe('Risikomanagement ist entscheidend.')
    expect(json.source).toContain('Mein Trading-Regelwerk.pdf')
  })

  it('source field is always present in successful response (AC-18)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockKbDocs([{ id: 'doc-1' }])
    vi.mocked(getKnowledgeContext).mockResolvedValue('KB context')
    vi.mocked(callAI).mockResolvedValue({
      text: `REGELN:\n- Regel 1\n\nNOTIZEN:\nNotizen hier.\n\nQUELLE:\nDokument.pdf, Abschnitt 3`,
    } as any)

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ section_key: 'psychologie_mindset' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBeTruthy()
  })

  it('returns 400 for malformed JSON body', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const req = new NextRequest('http://localhost/api/ai/trading-plan-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json',
    })
    const { POST } = await import('./route')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
