import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, text } = await req.json().catch(() => ({}))
  if (!name?.trim()) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 })
  if (!text?.trim()) return NextResponse.json({ error: 'Text darf nicht leer sein' }, { status: 400 })
  if (text.length > 200_000) return NextResponse.json({ error: 'Text zu lang (max. 200.000 Zeichen)' }, { status: 400 })

  const { count } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Maximal 10 Dokumente erlaubt.' }, { status: 409 })
  }

  const { data: doc, error } = await supabase
    .from('knowledge_documents')
    .insert({
      user_id: user.id,
      name: name.trim(),
      file_path: null,
      file_size: text.length,
      status: 'ready',
      extracted_text: text.trim(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ document: { id: doc.id, name: name.trim(), status: 'ready' } })
}
