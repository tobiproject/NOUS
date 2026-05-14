import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const VALID_SECTION_KEYS = [
  'strategie_uebersicht',
  'setup_kriterien',
  'entry_exit_regeln',
  'risiko_regeln',
  'psychologie_mindset',
  'verbotene_verhaltensweisen',
  'review_prozess',
  'prop_firm_regeln',
] as const

const SaveSectionSchema = z.object({
  section_key: z.enum(VALID_SECTION_KEYS),
  rules: z.array(z.string().max(1000)).max(100),
  notes: z.string().max(5000),
})

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('trading_plan_sections')
    .select('section_key, rules, notes, updated_at')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sections: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = SaveSectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { section_key, rules, notes } = parsed.data

  const { error } = await supabase
    .from('trading_plan_sections')
    .upsert(
      { user_id: user.id, section_key, rules, notes, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,section_key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
