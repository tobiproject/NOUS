import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tradeId, asset, direction, dueAt } = await req.json()
  if (!tradeId || !asset || !direction || !dueAt) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Upsert — one reminder per trade per user
  const { error } = await supabase
    .from('trade_analysis_reminders')
    .upsert(
      { user_id: user.id, trade_id: tradeId, asset, direction, due_at: dueAt, sent_at: null },
      { onConflict: 'user_id,trade_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tradeId } = await req.json()
  if (!tradeId) return NextResponse.json({ error: 'Missing tradeId' }, { status: 400 })

  await supabase
    .from('trade_analysis_reminders')
    .delete()
    .eq('user_id', user.id)
    .eq('trade_id', tradeId)

  return NextResponse.json({ ok: true })
}
