import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 60

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Use lib/ path to bypass index.js test-file loading (known v1 issue in serverless)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js')
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 45_000)
  )
  const result = await Promise.race([pdfParse(buffer, { max: 150 }), timeout])
  return result.text?.trim() ?? ''
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storagePath, name, fileSize } = await req.json()
  if (!storagePath || !name) {
    return NextResponse.json({ error: 'storagePath and name required' }, { status: 400 })
  }

  // Check document count limit
  const { count } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= 10) {
    // Clean up the already-uploaded file
    await supabase.storage.from('knowledge-base').remove([storagePath])
    return NextResponse.json({ error: 'Maximal 10 Dokumente erlaubt. Bitte erst ein Dokument löschen.' }, { status: 409 })
  }

  const cleanName = name
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()

  const { data: doc, error: insertError } = await supabase
    .from('knowledge_documents')
    .insert({ user_id: user.id, name: cleanName, file_path: storagePath, file_size: fileSize ?? 0, status: 'processing' })
    .select('id')
    .single()
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Download file from storage server-side (small request body — just metadata was sent to Vercel)
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('knowledge-base')
    .download(storagePath)

  if (downloadError || !fileData) {
    await supabase.from('knowledge_documents').update({
      status: 'error',
      error_message: 'Datei konnte nicht aus dem Speicher geladen werden.',
    }).eq('id', doc.id)
    return NextResponse.json({ document: { id: doc.id, status: 'error' } })
  }

  try {
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const text = await extractPdfText(buffer)

    if (!text) {
      await supabase.from('knowledge_documents').update({
        status: 'error',
        error_message: 'Dieses PDF enthält keinen lesbaren Text (möglicherweise gescannt). Bitte "Text einfügen" verwenden.',
      }).eq('id', doc.id)
      return NextResponse.json({ document: { id: doc.id, status: 'error' } })
    }

    await supabase.from('knowledge_documents').update({
      status: 'ready',
      extracted_text: text.slice(0, 200_000),
    }).eq('id', doc.id)

    return NextResponse.json({ document: { id: doc.id, name: cleanName, file_size: fileSize, status: 'ready' } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const isTimeout = msg === 'timeout'
    await supabase.from('knowledge_documents').update({
      status: 'error',
      error_message: isTimeout
        ? 'PDF zu komplex zum automatischen Verarbeiten. Bitte "Text einfügen" verwenden.'
        : `PDF-Parsing fehlgeschlagen: ${msg.slice(0, 200)}`,
    }).eq('id', doc.id)
    return NextResponse.json({ document: { id: doc.id, status: 'error' } })
  }
}
