import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const schema = z.object({
  account_id:   z.string().uuid(),
  week_start:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  focus_assets: z.array(z.string()).optional(),
  weekly_goals: z.array(z.string()).optional(),
  max_trades:   z.number().int().positive().optional(),
  max_drawdown: z.number().positive().optional(),
  notes:        z.string().max(2000).optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const week = req.nextUrl.searchParams.get('week')
  const accountId = req.nextUrl.searchParams.get('account_id')

  let query = supabase.from('weekly_plans').select('*').eq('user_id', user.id)
  if (accountId) query = query.eq('account_id', accountId)
  if (week) query = query.eq('week_start', week)
  else query = query.order('week_start', { ascending: false }).limit(1)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data?.[0] ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { data, error } = await supabase
    .from('weekly_plans')
    .upsert(
      { user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,account_id,week_start' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
}
