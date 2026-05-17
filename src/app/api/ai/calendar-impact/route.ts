import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/ai-client'

const BodySchema = z.object({
  eventName: z.string(),
  country: z.string(),
  impactLevel: z.enum(['High', 'Medium', 'Low']),
  actual: z.string().nullable(),
  forecast: z.string().nullable(),
  previous: z.string().nullable(),
  watchlistSymbols: z.array(z.string()),
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

  const { eventName, country, impactLevel, actual, forecast, previous, watchlistSymbols } = parsed.data

  const { client, model } = await getAnthropicClient(user.id)

  const watchlistText = watchlistSymbols.length > 0
    ? watchlistSymbols.join(', ')
    : 'Keine Assets auf der Watchlist hinterlegt.'

  const dataContext = actual
    ? `Actual: ${actual}${forecast ? ` (Forecast: ${forecast})` : ''}${previous ? `, Previous: ${previous}` : ''}`
    : `Noch nicht veröffentlicht.${forecast ? ` Forecast: ${forecast}.` : ''}${previous ? ` Previous: ${previous}.` : ''}`

  const prompt = `Du bist Trading-Coach und Makro-Analyst. Analysiere dieses Wirtschaftsereignis im Kontext der persönlichen Watchlist des Traders.

EVENT: ${eventName} (${country}, Impact: ${impactLevel})
DATEN: ${dataContext}
WATCHLIST: ${watchlistText}

Beantworte genau diese 3 Punkte — kurz, konkret, handlungsorientiert:

**1. Bedeutung des Events**
Was bedeutet ${eventName} typischerweise für die Märkte? Beziehe dich auf die aktuellen Werte (Actual vs. Forecast).

**2. Watchlist-Relevanz**
Welche Assets aus der Watchlist sind am stärksten betroffen und warum? Falls keine Watchlist vorhanden oder keine Assets betroffen, sage das klar.

**3. Was du beachten solltest**
1–2 konkrete Hinweise für die Session: Was beobachten? Welche Reaktionsmuster sind typisch?

Maximal 120 Wörter gesamt. Keine Einleitung, kein Outro. Halte dich exakt an die 3-Punkte-Struktur.`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model,
          max_tokens: 400,
          system: 'Du bist Trading-Coach. Antworte strukturiert auf Deutsch, klar und präzise. Formatiere Überschriften fett (**text**). Keine unnötigen Füllsätze.',
          messages: [{ role: 'user', content: prompt }],
        })
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n[Fehler: ${err instanceof Error ? err.message : 'KI-Fehler'}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
