import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const createSchema = z.object({
  account_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  rules: z.array(z.string().max(500)).max(30).default([]),
  preferred_timeframes: z.array(z.string().max(20)).max(10).default([]),
  instruments: z.array(z.string().max(50)).max(30).default([]),
})

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = req.nextUrl.searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('user_strategy')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ strategies: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { account_id, ...strategyData } = parsed.data

  const { count: existing } = await supabase
    .from('user_strategy')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('account_id', account_id)
    .eq('name', strategyData.name)

  if (existing && existing > 0) {
    return NextResponse.json({ error: 'Eine Strategie mit diesem Namen existiert bereits.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('user_strategy')
    .insert({ user_id: user.id, account_id, ...strategyData, updated_at: new Date().toISOString() })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
