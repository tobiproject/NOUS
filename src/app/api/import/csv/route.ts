import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { format, parse, isValid } from 'date-fns'
import { escapeCell } from '@/lib/export-utils'

// ─── Schema ──────────────────────────────────────────────────────────────────

const mappingSchema = z.object({
  traded_at: z.string(),
  asset: z.string(),
  direction: z.string(),
  entry_price: z.string(),
  sl_price: z.string().optional(),
  tp_price: z.string().optional(),
  lot_size: z.string(),
  result_currency: z.string(),
})

const bodySchema = z.object({
  account_id: z.string().uuid(),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(100),
  mapping: mappingSchema,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDirection(raw: string): 'long' | 'short' | null {
  const v = raw.toLowerCase().trim()
  if (v === 'buy' || v === 'long') return 'long'
  if (v === 'sell' || v === 'short') return 'short'
  return null
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  // Try ISO first
  const iso = new Date(raw)
  if (isValid(iso)) return iso.toISOString()
  // Try MT4/MT5 format: "2024.01.15 09:30"
  const mt4 = parse(raw, 'yyyy.MM.dd HH:mm', new Date())
  if (isValid(mt4)) return mt4.toISOString()
  // Try "2024-01-15 09:30:00"
  const sql = parse(raw, 'yyyy-MM-dd HH:mm:ss', new Date())
  if (isValid(sql)) return sql.toISOString()
  return null
}

function parseNum(raw: string): number | null {
  if (!raw) return null
  const n = parseFloat(raw.replace(',', '.').replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? null : n
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { account_id, rows, mapping } = parsed.data

  // Verify account belongs to user
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  // Map rows → trade objects
  const tradesToInsert: Record<string, unknown>[] = []
  const errorDetails: string[] = []

  for (const row of rows) {
    const traded_at = parseDate(row[mapping.traded_at] ?? '')
    const asset = (row[mapping.asset] ?? '').trim().toUpperCase()
    const direction = parseDirection(row[mapping.direction] ?? '')
    const entry_price = parseNum(row[mapping.entry_price] ?? '')
    const lot_size = parseNum(row[mapping.lot_size] ?? '')
    const result_currency = parseNum(row[mapping.result_currency] ?? '')

    if (!traded_at || !asset || !direction || entry_price === null || lot_size === null || result_currency === null) {
      errorDetails.push(`Zeile übersprungen: ungültige Pflichtfelder (Asset: ${asset || '?'})`)
      continue
    }

    tradesToInsert.push({
      user_id: user.id,
      account_id,
      traded_at,
      asset,
      direction,
      entry_price,
      sl_price: parseNum(row[mapping.sl_price ?? ''] ?? '') ?? null,
      tp_price: parseNum(row[mapping.tp_price ?? ''] ?? '') ?? null,
      lot_size,
      result_currency,
      outcome: result_currency > 0 ? 'win' : result_currency < 0 ? 'loss' : 'breakeven',
    })
  }

  if (tradesToInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, errors: errorDetails.length, error_details: errorDetails })
  }

  // Deduplication: fetch existing trades in this account matching (traded_at, asset, direction, entry_price)
  const dedupeKeys = tradesToInsert.map(t => ({
    traded_at: t.traded_at as string,
    asset: t.asset as string,
    direction: t.direction as string,
    entry_price: t.entry_price as number,
  }))

  const assetSet = [...new Set(dedupeKeys.map(k => k.asset))]
  const { data: existing } = await supabase
    .from('trades')
    .select('traded_at, asset, direction, entry_price')
    .eq('account_id', account_id)
    .in('asset', assetSet)

  const existingSet = new Set(
    (existing ?? []).map(e =>
      `${format(new Date(e.traded_at), 'yyyy-MM-dd HH:mm')}|${e.asset}|${e.direction}|${e.entry_price}`
    )
  )

  const unique = tradesToInsert.filter(t => {
    const key = `${format(new Date(t.traded_at as string), 'yyyy-MM-dd HH:mm')}|${t.asset}|${t.direction}|${t.entry_price}`
    return !existingSet.has(key)
  })

  const skipped = tradesToInsert.length - unique.length

  let imported = 0
  if (unique.length > 0) {
    const { error: insertError } = await supabase.from('trades').insert(unique)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    imported = unique.length
  }

  // Log the import
  await supabase.from('import_logs').insert({
    user_id: user.id,
    account_id,
    imported_count: imported,
    skipped_count: skipped,
    error_count: errorDetails.length,
    error_details: errorDetails.length > 0 ? errorDetails : null,
  })

  return NextResponse.json({ imported, skipped, errors: errorDetails.length })
}
