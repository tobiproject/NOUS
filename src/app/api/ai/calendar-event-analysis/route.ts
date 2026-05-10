import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const BodySchema = z.object({
  event_title: z.string(),
  event_currency: z.string(),
  event_impact: z.string(),
  actual: z.string().nullable().optional(),
  forecast: z.string().nullable().optional(),
  previous: z.string().nullable().optional(),
  event_date: z.string(),
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

  const { event_title, event_currency, event_impact, actual, forecast, previous, event_date } = parsed.data

  // Load user's AI settings and watchlist
  const [aiSettingsRes, watchlistRes] = await Promise.all([
    supabase.from('user_ai_settings').select('provider, api_key, model').eq('user_id', user.id).maybeSingle(),
    supabase.from('watchlist_items').select('symbol, name').eq('user_id', user.id).limit(20),
  ])

  const provider = (aiSettingsRes.data?.provider as 'anthropic' | 'openai') ?? 'anthropic'
  const userApiKey = aiSettingsRes.data?.api_key ?? null
  const model = aiSettingsRes.data?.model ?? (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-6')

  const watchlistContext = watchlistRes.data?.length
    ? `Meine aktuellen Watchlist-Assets: ${watchlistRes.data.map(w => `${w.symbol}${w.name ? ` (${w.name})` : ''}`).join(', ')}`
    : 'Keine Watchlist-Assets hinterlegt.'

  const actualInfo = actual
    ? `Actual: ${actual}${forecast ? ` (Forecast war: ${forecast})` : ''}${previous ? `, Previous: ${previous}` : ''}`
    : 'Actual-Wert noch nicht veröffentlicht.'

  const prompt = `Du bist ein erfahrener Makro-Analyst. Analysiere das folgende Wirtschaftsereignis und erkläre kompakt, wie das Ergebnis meine Tradingentscheidungen beeinflusst.

Event: ${event_title} (${event_currency}, ${event_impact} Impact)
Datum: ${event_date}
${actualInfo}

${watchlistContext}

Gib eine kompakte Analyse (3–5 Sätze) mit diesen Punkten:
1. Was bedeutet das Ergebnis für ${event_currency} und verwandte Märkte?
2. Welche meiner Watchlist-Assets sind direkt betroffen?
3. Was sollte ich als Trader heute beachten?

Halte die Antwort prägnant und praxisorientiert. Sprich mich direkt an (du-Form).`

  const system = 'Du bist ein Trading-Coach und Makro-Analyst. Gib präzise, praxisnahe Einschätzungen.'

  const encoder = new TextEncoder()

  // ── Anthropic streaming ────────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Kein Anthropic API-Key hinterlegt. Bitte in Einstellungen → KI-Provider eintragen.' },
        { status: 422 }
      )
    }

    const client = new Anthropic({ apiKey })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.stream({
            model,
            max_tokens: 600,
            system,
            messages: [{ role: 'user', content: prompt }],
          })

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'KI-Fehler'
          controller.enqueue(encoder.encode(`\n[Fehler: ${msg}]`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  }

  // ── OpenAI streaming ──────────────────────────────────────────────────────
  const apiKey = userApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Kein OpenAI API-Key hinterlegt. Bitte in Einstellungen → KI-Provider eintragen.' },
      { status: 422 }
    )
  }

  const client = new OpenAI({ apiKey })

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.chat.completions.create({
          model,
          max_tokens: 600,
          stream: true,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        })

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'KI-Fehler'
        controller.enqueue(encoder.encode(`\n[Fehler: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
