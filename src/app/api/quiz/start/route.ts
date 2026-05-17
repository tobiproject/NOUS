import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const QUIZ_SIZE = 5

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  // Get IDs of already-quizzed trades (within last 30 days to avoid immediate repeat)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: answeredRows } = await supabase
    .from('quiz_answers')
    .select('trade_id')
    .eq('account_id', accountId)
    .gte('answered_at', thirtyDaysAgo)

  const answeredIds = (answeredRows ?? []).map(r => r.trade_id)

  // All trades qualify — chart_url or screenshots both work, minimum 1 trade
  let query = supabase
    .from('trades')
    .select('*')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .order('traded_at', { ascending: false })

  if (answeredIds.length > 0) {
    query = query.not('id', 'in', `(${answeredIds.join(',')})`)
  }

  const { data: trades, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If no unquizzed trades left, fall back to all trades (repeat session)
  let pool = trades ?? []
  let repeated = false
  if (pool.length === 0 && answeredIds.length > 0) {
    const { data: allTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .order('traded_at', { ascending: false })
    pool = allTrades ?? []
    repeated = true
  }

  if (pool.length === 0) {
    return NextResponse.json(
      { error: 'Noch keine Trades vorhanden. Logge deinen ersten Trade um den Quiz-Modus zu starten.' },
      { status: 422 }
    )
  }

  // Shuffle and pick up to QUIZ_SIZE (or fewer if not enough trades)
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, QUIZ_SIZE)

  const { data: session } = await supabase
    .from('quiz_sessions')
    .insert({ account_id: accountId, user_id: user.id })
    .select('id')
    .single()

  await supabase
    .from('learn_activity')
    .upsert(
      {
        account_id: accountId,
        user_id: user.id,
        activity_date: new Date().toISOString().split('T')[0],
        activity_type: 'quiz',
      },
      { onConflict: 'account_id,user_id,activity_date,activity_type' }
    )

  return NextResponse.json({ sessionId: session?.id ?? null, trades: shuffled, repeated })
}
