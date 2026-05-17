import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const title = req.nextUrl.searchParams.get('title')
  const currency = req.nextUrl.searchParams.get('currency')

  if (!title || !currency) {
    return NextResponse.json({ error: 'title and currency required' }, { status: 400 })
  }

  // Fetch last 6 past releases of this event (same title + currency, has actual value)
  const { data, error } = await supabase
    .from('economic_events')
    .select('date, actual, forecast, previous')
    .eq('title', title)
    .eq('currency', currency)
    .not('actual', 'is', null)
    .lt('date', new Date().toISOString().slice(0, 10))
    .order('date', { ascending: false })
    .limit(6)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ history: data ?? [] })
}
