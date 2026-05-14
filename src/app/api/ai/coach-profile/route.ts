import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')

  let query = supabase
    .from('coach_profiles')
    .select('trading_style, strengths, weaknesses, key_patterns, coaching_focus, raw_profile, trades_analyzed, last_updated_at')
    .eq('user_id', user.id)

  if (accountId) {
    query = query.eq('account_id', accountId)
  } else {
    query = query.is('account_id', null)
  }

  const { data } = await query.maybeSingle()
  return NextResponse.json({ profile: data ?? null })
}
