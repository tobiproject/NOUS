import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = req.nextUrl.searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const { data } = await supabase
    .from('calendar_ki_briefings')
    .select('content')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()

  return NextResponse.json({ content: data?.content ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { event_id, content } = body
  if (!event_id || !content) return NextResponse.json({ error: 'event_id and content required' }, { status: 400 })

  await supabase
    .from('calendar_ki_briefings')
    .upsert({ user_id: user.id, event_id, content }, { onConflict: 'user_id,event_id' })

  return NextResponse.json({ ok: true })
}
