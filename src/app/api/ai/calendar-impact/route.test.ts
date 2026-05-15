// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/ai-client'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/ai-client', () => ({
  getAnthropicClient: vi.fn(),
}))

const mockGetUser = vi.fn()

function makeValidBody() {
  return {
    eventName: 'Non-Farm Payrolls',
    country: 'USD',
    impactLevel: 'High',
    actual: '280K',
    forecast: '250K',
    previous: '240K',
    watchlistSymbols: ['EURUSD', 'NAS100'],
  }
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai/calendar-impact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeMockStream(chunks: string[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const text of chunks) {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
      }
    },
  }
}

describe('POST /api/ai/calendar-impact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest(makeValidBody()))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when eventName is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const { eventName: _, ...bodyWithoutName } = makeValidBody()
    const res = await POST(makeRequest(bodyWithoutName))
    expect(res.status).toBe(400)
  })

  it('returns 400 when impactLevel is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ ...makeValidBody(), impactLevel: 'critical' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when impactLevel uses lowercase (spec discrepancy — only PascalCase accepted)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ ...makeValidBody(), impactLevel: 'high' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when watchlistSymbols is not an array', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ ...makeValidBody(), watchlistSymbols: 'EURUSD' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when country is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { POST } = await import('./route')
    const { country: _, ...bodyWithoutCountry } = makeValidBody()
    const res = await POST(makeRequest(bodyWithoutCountry))
    expect(res.status).toBe(400)
  })

  it('streams text response for valid request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    vi.mocked(getAnthropicClient).mockResolvedValue({
      client: {
        messages: {
          stream: vi.fn().mockReturnValue(makeMockStream([
            '**1. Bedeutung des Events**\n',
            'NFP ist ein Schlüsselindikator.',
            '\n**2. Watchlist-Relevanz**\n',
            'EURUSD und NAS100 betroffen.',
            '\n**3. Was du beachten solltest**\n',
            'Volatilität in den ersten 30 Min.',
          ])),
        },
      } as any,
      model: 'claude-sonnet-4-6',
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest(makeValidBody()))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')
    expect(res.headers.get('cache-control')).toBe('no-cache')

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      accumulated += decoder.decode(value)
    }
    expect(accumulated).toContain('**1. Bedeutung des Events**')
    expect(accumulated).toContain('EURUSD')
    expect(accumulated).toContain('**3. Was du beachten solltest**')
  })

  it('accepts null values for actual, forecast, previous', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    vi.mocked(getAnthropicClient).mockResolvedValue({
      client: {
        messages: { stream: vi.fn().mockReturnValue(makeMockStream(['Noch nicht veröffentlicht.'])) },
      } as any,
      model: 'claude-sonnet-4-6',
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ ...makeValidBody(), actual: null, forecast: null, previous: null }))
    expect(res.status).toBe(200)
  })

  it('accepts empty watchlistSymbols and indicates no watchlist in stream', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const streamFn = vi.fn().mockReturnValue(makeMockStream(['Keine Assets auf der Watchlist hinterlegt.']))
    vi.mocked(getAnthropicClient).mockResolvedValue({
      client: { messages: { stream: streamFn } } as any,
      model: 'claude-sonnet-4-6',
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest({ ...makeValidBody(), watchlistSymbols: [] }))
    expect(res.status).toBe(200)

    // Verify the prompt includes the empty-watchlist text
    const callArgs = streamFn.mock.calls[0][0]
    expect(callArgs.messages[0].content).toContain('Keine Assets auf der Watchlist hinterlegt.')
  })

  it('streams error message instead of empty response when AI client throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    vi.mocked(getAnthropicClient).mockResolvedValue({
      client: {
        messages: {
          stream: vi.fn().mockReturnValue({
            [Symbol.asyncIterator]: async function* () {
              throw new Error('API rate limit exceeded')
            },
          }),
        },
      } as any,
      model: 'claude-sonnet-4-6',
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest(makeValidBody()))
    expect(res.status).toBe(200)

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      accumulated += decoder.decode(value)
    }
    expect(accumulated).toContain('[Fehler:')
    expect(accumulated).toContain('API rate limit exceeded')
  })

  it('prompt includes all three required analysis questions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const streamFn = vi.fn().mockReturnValue(makeMockStream(['OK']))
    vi.mocked(getAnthropicClient).mockResolvedValue({
      client: { messages: { stream: streamFn } } as any,
      model: 'claude-sonnet-4-6',
    })

    const { POST } = await import('./route')
    await POST(makeRequest(makeValidBody()))

    const callArgs = streamFn.mock.calls[0][0]
    const prompt = callArgs.messages[0].content as string
    expect(prompt).toContain('Bedeutung des Events')
    expect(prompt).toContain('Watchlist-Relevanz')
    expect(prompt).toContain('Was du beachten solltest')
  })

  it('prompt includes event name, country, and watchlist symbols', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const streamFn = vi.fn().mockReturnValue(makeMockStream(['OK']))
    vi.mocked(getAnthropicClient).mockResolvedValue({
      client: { messages: { stream: streamFn } } as any,
      model: 'claude-sonnet-4-6',
    })

    const { POST } = await import('./route')
    await POST(makeRequest(makeValidBody()))

    const callArgs = streamFn.mock.calls[0][0]
    const prompt = callArgs.messages[0].content as string
    expect(prompt).toContain('Non-Farm Payrolls')
    expect(prompt).toContain('USD')
    expect(prompt).toContain('EURUSD')
    expect(prompt).toContain('NAS100')
  })
})
