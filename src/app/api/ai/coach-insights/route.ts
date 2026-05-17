import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const postSchema = z.object({
  account_id: z.string().uuid().nullable().optional(),
  insight: z.string().min(5).max(500),
  source: z.enum(['conversation', 'trade_checkin', 'pattern_detection']).default('pattern_detection'),
})

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const status = searchParams.get('status') // 'all' | 'confirmed' | 'pending' | 'rejected'

  let query = supabase
    .from('coach_memory_insights')
    .select('*')
    .eq('user_id', user.id)
    .order('weight', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (accountId) {
    query = query.eq('account_id', accountId)
  }

  if (status === 'confirmed') {
    query = query.eq('confirmed', true)
  } else if (status === 'pending') {
    query = query.is('confirmed', null)
  } else if (status === 'rejected') {
    query = query.eq('confirmed', false)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = {
    total: data?.length ?? 0,
    confirmed: data?.filter((i) => i.confirmed === true).length ?? 0,
    pending: data?.filter((i) => i.confirmed === null).length ?? 0,
    rejected: data?.filter((i) => i.confirmed === false).length ?? 0,
  }

  return NextResponse.json({ insights: data ?? [], counts })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { account_id, insight, source } = parsed.data

  const { data, error } = await supabase
    .from('coach_memory_insights')
    .insert({
      user_id: user.id,
      account_id: account_id ?? null,
      insight,
      source,
      confirmed: null,
      weight: 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
