import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const TradeStatsSchema = z.object({
  total: z.number(),
  wins: z.number(),
  losses: z.number(),
  win_rate: z.number().nullable(),
  avg_rr: z.number().nullable(),
}).nullable().optional()

const TradeEntrySchema = z.object({
  event_date: z.string(),
  asset: z.string(),
  direction: z.string(),
  rr_ratio: z.number().nullable(),
})

const BodySchema = z.object({
  event_title: z.string(),
  event_currency: z.string(),
  event_impact: z.string(),
  actual: z.string().nullable().optional(),
  forecast: z.string().nullable().optional(),
  previous: z.string().nullable().optional(),
  event_date: z.string(),
  watchlist_matches: z.array(z.string()).optional(),
  trade_stats: TradeStatsSchema,
  recent_trades: z.array(TradeEntrySchema).max(10).optional(),
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

  const {
    event_title, event_currency, event_impact,
    actual, forecast, previous, event_date,
    watchlist_matches, trade_stats, recent_trades,
  } = parsed.data

  const aiSettingsRes = await supabase
    .from('user_ai_settings')
    .select('provider, api_key, model')
    .eq('user_id', user.id)
    .maybeSingle()

  const provider = (aiSettingsRes.data?.provider as 'anthropic' | 'openai') ?? 'anthropic'
  const userApiKey = aiSettingsRes.data?.api_key ?? null
  const model = aiSettingsRes.data?.model ?? (provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-6')

  // Build grounded data sections
  const watchlistSection = watchlist_matches?.length
    ? `Betroffene Assets auf deiner Watchlist: ${watchlist_matches.join(', ')}`
    : 'Keine deiner Watchlist-Assets direkt betroffen.'

  const statsSection = trade_stats
    ? `DEINE VERIFIZIERTEN STATISTIKEN für "${event_title}":
- Trades analysiert: ${trade_stats.total}
- Wins: ${trade_stats.wins} | Losses: ${trade_stats.losses}
- Win-Rate: ${trade_stats.win_rate !== null ? `${trade_stats.win_rate}%` : 'nicht berechenbar'}
- Durchschnittliches R: ${trade_stats.avg_rr !== null ? trade_stats.avg_rr : 'nicht berechenbar'}
${recent_trades?.length ? `- Letzte Trades: ${recent_trades.slice(0, 5).map(t => `${t.event_date}: ${t.asset} ${t.direction === 'long' ? 'Long' : 'Short'} ${t.rr_ratio !== null ? (t.rr_ratio > 0 ? '+' : '') + t.rr_ratio + 'R' : ''}`).join(' | ')}` : ''}`
    : `DEINE STATISTIKEN für "${event_title}": ${trade_stats === null ? 'Noch zu wenig Daten (< 3 Trades) für statistische Auswertung.' : 'Keine Trade-Daten vorhanden.'}`

  const actualInfo = actual
    ? `Actual: ${actual}${forecast ? ` (Forecast war: ${forecast})` : ''}${previous ? `, Previous: ${previous}` : ''}`
    : `Actual noch nicht veröffentlicht.${forecast ? ` Forecast: ${forecast}.` : ''}${previous ? ` Previous: ${previous}.` : ''}`

  const isPreEvent = !actual

  const prompt = `Du bist Trading-Coach und Makro-Analyst. Erstelle ein ${isPreEvent ? 'Pre-Event-Briefing' : 'Post-Event-Briefing'}.

═══ EREIGNIS-DATEN ═══
Event: ${event_title} (${event_currency}, Impact: ${event_impact})
Datum: ${event_date}
${actualInfo}

═══ DEINE WATCHLIST ═══
${watchlistSection}

═══ DEINE STATISTIK ═══
${statsSection}

═══ AUFGABE ═══
${isPreEvent
  ? `Pre-Event-Briefing (3–5 Sätze):
1. Was erwartet der Markt, und was bedeuten Besser/Schlechter-Szenarien?
2. Wie reagieren deine Watchlist-Assets typischerweise auf diesen Event-Typ?
3. Was solltest du heute konkret beachten?`
  : `Post-Event-Briefing (3–5 Sätze):
1. Was ist passiert (Actual vs. Forecast)?
2. Was bedeutet das für deine Watchlist-Assets?
3. Was lernst du aus deiner eigenen Trade-Statistik zu diesem Event-Typ?`}

═══ PFLICHTREGELN (KEINE AUSNAHMEN) ═══
- Nutze Zahlen NUR aus den obigen Abschnitten — erfinde KEINE eigenen Statistiken oder Preisbewegungen
- Wenn Statistik "zu wenig Daten": weise explizit darauf hin, nenne KEINE Prozentzahlen
- Wenn keine Watchlist-Assets betroffen: sage das klar
- Sprich mich direkt an (du-Form), kurz und präzise`

  const system = 'Du bist Trading-Coach. Antworte präzise auf Basis der gelieferten Daten. Erfinde keine Statistiken oder Zahlen die nicht in den Daten stehen.'

  const encoder = new TextEncoder()

  // ── Anthropic ────────────────────────────────────────────────────────────────
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
            model, max_tokens: 600, system,
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
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } })
  }

  // ── OpenAI ───────────────────────────────────────────────────────────────────
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
          model, max_tokens: 600, stream: true,
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        })
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n[Fehler: ${err instanceof Error ? err.message : 'KI-Fehler'}]`))
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } })
}
