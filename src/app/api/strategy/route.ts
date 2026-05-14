import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const schema = z.object({
  account_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  rules: z.array(z.string().max(500)).max(30),
  preferred_timeframes: z.array(z.string().max(20)).max(10),
  instruments: z.array(z.string().max(50)).max(30),
})

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = req.nextUrl.searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const { data } = await supabase
    .from('user_strategy')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .maybeSingle()

  return NextResponse.json({ strategy: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { account_id, ...strategyData } = parsed.data

  const { error } = await supabase
    .from('user_strategy')
    .upsert(
      { user_id: user.id, account_id, ...strategyData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,account_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
