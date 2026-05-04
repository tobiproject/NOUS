import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const addSchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase(),
  name: z.string().max(100).optional(),
  category: z.enum(['futures', 'forex', 'crypto', 'stocks', 'indices', 'cfd', 'other']).optional(),
})

const CME_PRESETS: Record<string, { tick_size: number; tick_value: number; point_value: number }> = {
  NQ:  { tick_size: 0.25, tick_value: 5.00,  point_value: 20.00 },
  MNQ: { tick_size: 0.25, tick_value: 0.50,  point_value: 2.00 },
  ES:  { tick_size: 0.25, tick_value: 12.50, point_value: 50.00 },
  MES: { tick_size: 0.25, tick_value: 1.25,  point_value: 5.00 },
  YM:  { tick_size: 1.00, tick_value: 5.00,  point_value: 5.00 },
  MYM: { tick_size: 1.00, tick_value: 0.50,  point_value: 0.50 },
  RTY: { tick_size: 0.10, tick_value: 5.00,  point_value: 50.00 },
  CL:  { tick_size: 0.01, tick_value: 10.00, point_value: 1000.00 },
  MCL: { tick_size: 0.01, tick_value: 1.00,  point_value: 100.00 },
  GC:  { tick_size: 0.10, tick_value: 10.00, point_value: 100.00 },
  MGC: { tick_size: 0.10, tick_value: 1.00,  point_value: 10.00 },
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = req.nextUrl.searchParams.get('account_id')

  let query = supabase
    .from('watchlist_items')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (accountId) {
    query = query.eq('account_id', accountId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { account_id, ...itemData } = body

  if (account_id) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()
    if (!account) return NextResponse.json({ error: 'Ungültige account_id' }, { status: 403 })
  }

  const preset = CME_PRESETS[parsed.data.symbol]
  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({ user_id: user.id, account_id: account_id ?? null, ...itemData, ...(preset ?? {}) })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Symbol bereits in Watchlist' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ item: data })
}
