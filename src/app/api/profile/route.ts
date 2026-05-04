import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    display_name: data?.display_name ?? null,
    avatar_url: data?.avatar_url ?? null,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { display_name } = await req.json()
  if (typeof display_name !== 'string' || display_name.length > 50) {
    return NextResponse.json({ error: 'Ungültiger Name' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: display_name.trim() || null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
