import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const postSchema = z.object({
  account_id: z.string().uuid(),
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'plan_date must be YYYY-MM-DD'),
  market_bias: z.enum(['bullish', 'bearish', 'neutral']).nullable().optional(),
  focus_assets: z.array(z.string().max(20)).max(20).optional(),
  errors_to_avoid: z.array(z.string().max(100)).max(20).optional(),
  notes: z.string().max(2000).optional(),
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
    .from('daily_plans')
    .select('*')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .eq('plan_date', date)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ plan: data ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { account_id, plan_date, market_bias, focus_assets = [], errors_to_avoid = [], notes } = parsed.data

  // Verify account belongs to user
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  const { data, error } = await supabase
    .from('daily_plans')
    .upsert(
      {
        user_id: user.id,
        account_id,
        plan_date,
        market_bias: market_bias ?? null,
        focus_assets,
        errors_to_avoid,
        notes: notes || null,
      },
      { onConflict: 'account_id,plan_date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ plan: data })
}
