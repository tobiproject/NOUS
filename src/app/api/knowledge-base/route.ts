import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse is in serverExternalPackages — loaded natively, not bundled
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const result = await pdfParse(buffer)
  return result.text?.trim() ?? ''
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id, name, file_size, status, error_message, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check document count limit
  const { count } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Maximal 10 Dokumente erlaubt. Bitte erst ein Dokument löschen.' }, { status: 409 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Keine Datei übermittelt' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Nur PDF-Dateien erlaubt' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Datei zu groß (max. 20 MB)' }, { status: 400 })

  const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  // Upload to Supabase Storage
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('knowledge-base')
    .upload(fileName, bytes, { contentType: 'application/pdf', upsert: false })
  if (uploadError) return NextResponse.json({ error: 'Upload fehlgeschlagen: ' + uploadError.message }, { status: 500 })

  // Create DB record
  const cleanName = file.name
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()

  const { data: doc, error: insertError } = await supabase
    .from('knowledge_documents')
    .insert({ user_id: user.id, name: cleanName, file_path: fileName, file_size: file.size, status: 'processing' })
    .select('id')
    .single()
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Extract text from PDF
  try {
    const text = await extractPdfText(Buffer.from(bytes))

    if (!text) {
      await supabase.from('knowledge_documents').update({
        status: 'error',
        error_message: 'Dieses PDF enthält keinen lesbaren Text (möglicherweise gescannt oder passwortgeschützt). Bitte Tab "Text einfügen" verwenden.',
      }).eq('id', doc.id)
      return NextResponse.json({ document: { ...doc, status: 'error' } })
    }

    await supabase.from('knowledge_documents').update({
      status: 'ready',
      extracted_text: text.slice(0, 200_000),
    }).eq('id', doc.id)

    return NextResponse.json({ document: { id: doc.id, name: cleanName, file_size: file.size, status: 'ready' } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('knowledge_documents').update({
      status: 'error',
      error_message: `PDF-Parsing fehlgeschlagen: ${msg.slice(0, 200)}`,
    }).eq('id', doc.id)
    return NextResponse.json({ document: { id: doc.id, status: 'error' } })
  }
}
