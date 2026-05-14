import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 180

const BodySchema = z.object({
  name: z.string().min(1),
  fileSize: z.number(),
  pageImages: z.array(z.string()).min(1).max(5),
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
  const { name, fileSize, pageImages } = parsed.data

  // Check document count limit
  const { count } = await supabase
    .from('knowledge_documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Maximal 10 Dokumente erlaubt. Bitte erst eines löschen.' }, { status: 409 })
  }

  // Get user's AI API key
  const { data: aiSettings } = await supabase
    .from('user_ai_settings')
    .select('provider, api_key, model')
    .eq('user_id', user.id)
    .maybeSingle()

  const provider = (aiSettings?.provider as 'anthropic' | 'openai') ?? 'anthropic'
  const userApiKey = aiSettings?.api_key ?? null
  const apiKey = userApiKey || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY)

  if (!apiKey) {
    return NextResponse.json({
      error: 'Kein KI API-Key hinterlegt. Bitte in Einstellungen → KI-Provider eintragen.',
    }, { status: 422 })
  }

  // Extract content from all pages in parallel using Vision AI
  const PROMPT = 'Extrahiere den gesamten Text dieser Seite. Beschreibe außerdem alle Diagramme, Charts, Tabellen und wichtigen visuellen Elemente präzise auf Deutsch. Gib alles vollständig wieder.'

  let rawResults: (string | null)[]
  try {
    rawResults = await Promise.all(pageImages.map(async (b64) => {
      if (provider === 'openai') {
        const openai = new OpenAI({ apiKey })
        const res = await openai.chat.completions.create({
          model: aiSettings?.model ?? 'gpt-4o',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'high' } },
              { type: 'text', text: PROMPT },
            ],
          }],
        })
        return res.choices[0]?.message?.content ?? null
      } else {
        const anthropic = new Anthropic({ apiKey })
        const res = await anthropic.messages.create({
          model: aiSettings?.model ?? 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
              { type: 'text', text: PROMPT },
            ],
          }],
        })
        return res.content[0]?.type === 'text' ? res.content[0].text : null
      }
    }))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      error: msg.includes('api') || msg.includes('key') || msg.includes('auth')
        ? 'KI API-Key ungültig. Bitte in Einstellungen prüfen.'
        : `KI-Fehler: ${msg.slice(0, 200)}`,
    }, { status: 500 })
  }

  const pageTexts = rawResults
    .map((content, i) => content?.trim() ? `--- Seite ${i + 1} ---\n${content.trim()}` : null)
    .filter((t): t is string => t !== null)

  if (pageTexts.length === 0) {
    return NextResponse.json({ error: 'KI konnte keinen Inhalt extrahieren.' }, { status: 422 })
  }

  const extractedText = pageTexts.join('\n\n').slice(0, 200_000)

  const { data: doc, error: insertError } = await supabase
    .from('knowledge_documents')
    .insert({
      user_id: user.id,
      name: name.trim(),
      file_path: null,
      file_size: fileSize,
      status: 'ready',
      extracted_text: extractedText,
    })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({
    document: { id: doc.id, name: name.trim(), status: 'ready', pages: pageTexts.length },
  })
}
