import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription } = await req.json()
  if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  await supabase.from('notification_settings').upsert(
    { user_id: user.id, push_enabled: true, push_subscription: subscription },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('notification_settings')
    .update({ push_enabled: false, push_subscription: null })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
