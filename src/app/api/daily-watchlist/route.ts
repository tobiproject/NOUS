import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const addSchema = z.object({
  account_id: z.string().uuid(),
  symbol: z.string().min(1).max(20).toUpperCase(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('daily_watchlist')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .eq('date', date)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { account_id, symbol, date: inputDate } = parsed.data
  const date = inputDate ?? new Date().toISOString().split('T')[0]

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  const { data, error } = await supabase
    .from('daily_watchlist')
    .insert({ user_id: user.id, account_id, symbol, date })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Symbol bereits in heutiger Watchlist' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ item: data })
}
