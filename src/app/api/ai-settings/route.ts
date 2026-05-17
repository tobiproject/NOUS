import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const schema = z.object({
  provider: z.literal('anthropic').optional(),
  api_key:  z.string().max(200).nullable().optional(),
  model:    z.string().max(100).nullable().optional(),
})

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_ai_settings')
    .select('provider, api_key, model')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    provider: data?.provider ?? 'anthropic',
    api_key:  data?.api_key  ?? '',
    model:    data?.model    ?? '',
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { error } = await supabase
    .from('user_ai_settings')
    .upsert(
      { user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
