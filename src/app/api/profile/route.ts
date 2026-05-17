import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, workflow_reset_hour')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    display_name: data?.display_name ?? null,
    avatar_url: data?.avatar_url ?? null,
    workflow_reset_hour: data?.workflow_reset_hour ?? 0,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { display_name, workflow_reset_hour } = body

  const update: Record<string, unknown> = {}

  if (typeof display_name === 'string') {
    if (display_name.length > 50) return NextResponse.json({ error: 'Ungültiger Name' }, { status: 400 })
    update.display_name = display_name.trim() || null
  }

  if (workflow_reset_hour !== undefined) {
    const h = Number(workflow_reset_hour)
    if (!Number.isInteger(h) || h < 0 || h > 23) return NextResponse.json({ error: 'Ungültige Uhrzeit' }, { status: 400 })
    update.workflow_reset_hour = h
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
