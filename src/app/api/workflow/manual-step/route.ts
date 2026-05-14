import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getISOWeekString } from '@/lib/workflow-utils'

const schema = z.object({
  account_id: z.string().uuid(),
  step: z.enum(['trade_prepared']),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { account_id } = parsed.data
  const now = new Date()
  const weekIso = getISOWeekString(now)

  const { error } = await supabase
    .from('workflow_state')
    .upsert(
      {
        user_id: user.id,
        account_id,
        week_iso: weekIso,
        trade_prepared_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id,account_id,week_iso' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
