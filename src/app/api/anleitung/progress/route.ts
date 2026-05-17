import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ANLEITUNG_SECTION_IDS } from '@/lib/anleitung-progress'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('anleitung_read_sections')
    .eq('id', user.id)
    .maybeSingle()

  const sections = (data?.anleitung_read_sections ?? []).filter((id: string) =>
    ANLEITUNG_SECTION_IDS.includes(id)
  )
  return NextResponse.json({ sections })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const sections: string[] = Array.isArray(body.sections)
    ? body.sections.filter((id: unknown) => typeof id === 'string' && ANLEITUNG_SECTION_IDS.includes(id))
    : []

  await supabase
    .from('profiles')
    .update({ anleitung_read_sections: sections })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
