import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const type = searchParams.get('type')
  const limit = Math.min(Number(searchParams.get('limit') ?? '8'), 50)

  if (!accountId || !type) {
    return NextResponse.json({ error: 'account_id and type required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .eq('type', type)
    .eq('status', 'completed')
    .order('period_start', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
