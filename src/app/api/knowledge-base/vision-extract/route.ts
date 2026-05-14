import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 180

const BodySchema = z.object({
  storagePath: z.string().min(1),
  name: z.string().min(1),
  fileSize: z.number(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { storagePath, name, fileSize } = parsed.data

  // Check document count limit
  const { count } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= 10) {
    await supabase.storage.from('knowledge-base').remove([storagePath])
    return NextResponse.json({ error: 'Maximal 10 Dokumente erlaubt. Bitte erst eines löschen.' }, { status: 409 })
  }

  // Get user's AI settings
  const { data: aiSettings } = await supabase
    .from('user_ai_settings')
    .select('provider, api_key, model')
    .eq('user_id', user.id)
    .maybeSingle()

  const provider = (aiSettings?.provider as 'anthropic' | 'openai') ?? 'anthropic'
  const userApiKey = aiSettings?.api_key ?? null
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      error: 'Kein API-Key hinterlegt. Bitte in Einstellungen → KI-Provider eintragen.',
    }, { status: 422 })
  }

  // Download PDF from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('knowledge-base')
    .download(storagePath)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'PDF konnte nicht geladen werden.' }, { status: 500 })
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer())

  // Save document record
  const { data: doc, error: insertError } = await supabase
    .from('knowledge_documents')
    .insert({
      user_id: user.id,
      name: name.trim(),
      file_path: storagePath,
      file_size: fileSize,
      status: 'processing',
    })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  try {
    let extractedText = ''

    if (provider === 'openai') {
      // OpenAI doesn't support PDFs natively — text extraction only
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js')
      const result = await Promise.race([
        pdfParse(pdfBuffer, { max: 50 }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 45_000)),
      ])
      extractedText = result.text?.trim() ?? ''
      if (!extractedText) {
        await supabase.from('knowledge_documents').update({
          status: 'error',
          error_message: 'OpenAI unterstützt keine PDF-Zeichnungen. Bitte Anthropic Claude als KI-Provider verwenden oder Text manuell einfügen.',
        }).eq('id', doc.id)
        return NextResponse.json({ document: { id: doc.id, status: 'error' } })
      }
    } else {
      // Anthropic: send PDF natively via beta API — reads text AND drawings/charts
      const pdfBase64 = pdfBuffer.toString('base64')
      const anthropic = new Anthropic({ apiKey })

      const res = await (anthropic.beta.messages.create as Function)({
        model: aiSettings?.model ?? 'claude-sonnet-4-6',
        max_tokens: 4096,
        betas: ['pdfs-2024-09-25'],
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            {
              type: 'text',
              text: 'Extrahiere den gesamten Inhalt dieses Dokuments vollständig auf Deutsch: allen Text, alle Zahlen, alle Tabellen. Beschreibe außerdem alle Diagramme, Charts, Zeichnungen und visuellen Elemente präzise. Gib alles strukturiert und vollständig wieder.',
            },
          ],
        }],
      })
      extractedText = res.content[0]?.type === 'text' ? res.content[0].text : ''
    }

    if (!extractedText) {
      await supabase.from('knowledge_documents').update({
        status: 'error',
        error_message: 'KI konnte keinen Inhalt extrahieren.',
      }).eq('id', doc.id)
      return NextResponse.json({ document: { id: doc.id, status: 'error' } })
    }

    await supabase.from('knowledge_documents').update({
      status: 'ready',
      extracted_text: extractedText.slice(0, 200_000),
    }).eq('id', doc.id)

    return NextResponse.json({ document: { id: doc.id, name: name.trim(), status: 'ready' } })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('knowledge_documents').update({
      status: 'error',
      error_message: msg.includes('api') || msg.includes('key') || msg.includes('auth')
        ? 'KI API-Key ungültig. Bitte in Einstellungen prüfen.'
        : `KI-Fehler: ${msg.slice(0, 200)}`,
    }).eq('id', doc.id)
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 })
  }
}
