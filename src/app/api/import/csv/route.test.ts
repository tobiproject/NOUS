// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001'

const VALID_MAPPING = {
  traded_at: 'Open Time',
  asset: 'Symbol',
  direction: 'Type',
  entry_price: 'Price',
  sl_price: 'S/L',
  tp_price: 'T/P',
  lot_size: 'Size',
  result_currency: 'Profit',
}

const VALID_ROWS = [
  { 'Open Time': '2024-01-15 09:30:00', Symbol: 'EURUSD', Type: 'buy', Price: '1.0850', 'S/L': '1.0800', 'T/P': '1.0950', Size: '0.10', Profit: '150' },
  { 'Open Time': '2024-01-16 10:00:00', Symbol: 'GBPUSD', Type: 'sell', Price: '1.2700', 'S/L': '1.2750', 'T/P': '1.2600', Size: '0.05', Profit: '-80' },
]

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/import/csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupMocks({
  user = { id: USER_ID },
  account = { id: ACCOUNT_ID },
  existingTrades = [] as unknown[],
  insertError = null as { message: string } | null,
} = {}) {
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
      if (table === 'trades') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: existingTrades, error: null }),
          insert: vi.fn().mockResolvedValue({ error: insertError }),
        }
      }
      if (table === 'import_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    }),
  } as never)
}

describe('POST /api/import/csv', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    setupMocks({ user: null as never })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ account_id: ACCOUNT_ID, rows: VALID_ROWS, mapping: VALID_MAPPING }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account_id is missing', async () => {
    setupMocks()
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ rows: VALID_ROWS, mapping: VALID_MAPPING }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when rows is empty', async () => {
    setupMocks()
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ account_id: ACCOUNT_ID, rows: [], mapping: VALID_MAPPING }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when account does not belong to user', async () => {
    setupMocks({ account: null as never })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ account_id: ACCOUNT_ID, rows: VALID_ROWS, mapping: VALID_MAPPING }))
    expect(res.status).toBe(403)
  })

  it('imports rows with no duplicates', async () => {
    setupMocks()
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ account_id: ACCOUNT_ID, rows: VALID_ROWS, mapping: VALID_MAPPING }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.imported).toBe(2)
    expect(body.skipped).toBe(0)
    expect(body.errors).toBe(0)
  })

  it('skips duplicate trades', async () => {
    // Use a row with ISO date to ensure timezone-safe dedup key matching
    const isoRow = { 'Open Time': '2024-01-15T09:30:00.000Z', Symbol: 'EURUSD', Type: 'buy', Price: '1.0850', 'S/L': '', 'T/P': '', Size: '0.10', Profit: '150' }
    const { format } = await import('date-fns')
    const parsedDate = new Date(isoRow['Open Time'])
    const existingTrades = [
      { traded_at: parsedDate.toISOString(), asset: 'EURUSD', direction: 'long', entry_price: 1.085 },
    ]
    setupMocks({ existingTrades })
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ account_id: ACCOUNT_ID, rows: [isoRow, VALID_ROWS[1]], mapping: VALID_MAPPING }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.skipped).toBe(1)
    expect(body.imported).toBe(1)
  })

  it('counts rows with invalid required fields as errors', async () => {
    setupMocks()
    const badRows = [
      { 'Open Time': 'not-a-date', Symbol: 'EURUSD', Type: 'buy', Price: '1.08', 'S/L': '', 'T/P': '', Size: '0.1', Profit: '100' },
    ]
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ account_id: ACCOUNT_ID, rows: badRows, mapping: VALID_MAPPING }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.imported).toBe(0)
    expect(body.errors).toBeGreaterThanOrEqual(1)
  })

  it('parses MT4-style date format', async () => {
    setupMocks()
    const mt4Rows = [
      { 'Open Time': '2024.01.15 09:30', Symbol: 'EURUSD', Type: 'buy', Price: '1.0850', 'S/L': '', 'T/P': '', Size: '0.10', Profit: '150' },
    ]
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ account_id: ACCOUNT_ID, rows: mt4Rows, mapping: VALID_MAPPING }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.imported).toBe(1)
  })
})
