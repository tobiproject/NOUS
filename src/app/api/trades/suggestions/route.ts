import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  // Last 30 trades for setup frequency
  const { data: recent, error: recentErr } = await supabase
    .from('trades')
    .select('setup_type')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .not('setup_type', 'is', null)
    .order('traded_at', { ascending: false })
    .limit(30)

  if (recentErr) return NextResponse.json({ error: recentErr.message }, { status: 500 })

  // Count frequency per setup_type
  const freq: Record<string, number> = {}
  for (const t of recent ?? []) {
    if (t.setup_type) freq[t.setup_type] = (freq[t.setup_type] ?? 0) + 1
  }
  const topSetups = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([setup]) => setup)

  // All distinct strategies (all time)
  const { data: strats, error: stratsErr } = await supabase
    .from('trades')
    .select('strategy')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .not('strategy', 'is', null)
    .order('traded_at', { ascending: false })

  if (stratsErr) return NextResponse.json({ error: stratsErr.message }, { status: 500 })

  const strategies = [...new Set((strats ?? []).map(t => t.strategy).filter(Boolean))] as string[]

  return NextResponse.json({ topSetups, strategies })
}
