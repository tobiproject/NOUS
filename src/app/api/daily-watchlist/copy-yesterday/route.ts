import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const schema = z.object({
  account_id: z.string().uuid(),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { account_id, today: inputToday } = parsed.data
  const today = inputToday ?? new Date().toISOString().split('T')[0]

  const d = new Date(today + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  const yesterday = d.toISOString().split('T')[0]

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  const { data: yesterdayItems, error: fetchError } = await supabase
    .from('daily_watchlist')
    .select('symbol')
    .eq('user_id', user.id)
    .eq('account_id', account_id)
    .eq('date', yesterday)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!yesterdayItems || yesterdayItems.length === 0) {
    return NextResponse.json({ error: 'Keine gestrigen Einträge gefunden', items: [] }, { status: 200 })
  }

  const rows = yesterdayItems.map(i => ({
    user_id: user.id,
    account_id,
    symbol: i.symbol,
    date: today,
  }))

  const { data, error } = await supabase
    .from('daily_watchlist')
    .upsert(rows, { onConflict: 'user_id,account_id,symbol,date', ignoreDuplicates: true })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}
