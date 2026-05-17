import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tradeId = searchParams.get('trade_id')
  const accountId = searchParams.get('account_id')
  const type = searchParams.get('type') ?? 'trade'
  const periodStart = searchParams.get('period_start')

  if (!tradeId && !periodStart) {
    return NextResponse.json({ error: 'trade_id or period_start required' }, { status: 400 })
  }

  let query = supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', type)

  if (tradeId) query = query.eq('trade_id', tradeId)
  if (accountId) query = query.eq('account_id', accountId)
  if (periodStart) query = query.eq('period_start', periodStart)

  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json(null)

  return NextResponse.json(data)
}
