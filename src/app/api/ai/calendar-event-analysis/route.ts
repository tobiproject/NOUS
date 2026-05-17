import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/ai-client'

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

  const roadmapRes = await supabase.from('user_roadmap').select('data').eq('user_id', user.id).maybeSingle()

  const traderLevel = (roadmapRes.data?.data?.level as string | undefined) ?? 'Beginner'
  const isBeginnerLevel = ['Beginner', 'Anfänger', 'beginner'].includes(traderLevel)

  const { client, model } = await getAnthropicClient(user.id)

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

  const levelNote = isBeginnerLevel
    ? `Trader-Level: ${traderLevel} — erkläre alles klar und verständlich, nutze kurze Alltagsbeispiele wenn hilfreich, vermeide Fachjargon ohne Erklärung.`
    : `Trader-Level: ${traderLevel} — du kannst Fachbegriffe verwenden, knapp und präzise bleiben.`

  const prompt = `Du bist Trading-Coach und Makro-Analyst. Erstelle ein ${isPreEvent ? 'Pre-Event-Briefing' : 'Post-Event-Briefing'} mit klar strukturierten Abschnitten und Emojis.

═══ KONTEXT ═══
Event: ${event_title} (${event_currency}, Impact: ${event_impact})
Datum: ${event_date}
${actualInfo}
${levelNote}

═══ DEINE WATCHLIST ═══
${watchlistSection}

═══ DEINE STATISTIK ═══
${statsSection}

═══ AUSGABE-FORMAT (PFLICHT) ═══
Nutze EXAKT diese Struktur mit Emoji-Überschriften:

${isPreEvent ? `📊 **Was passiert heute?**
Erkläre kurz was dieser Event misst und was der Markt erwartet.${isBeginnerLevel ? ' Nutze ein einfaches Beispiel.' : ''}

🎯 **Für deine Watchlist**
Wie kann dieser Event deine relevanten Assets bewegen? Was sind die Szenarien?

⚠️ **Beachten heute**
1–2 konkrete Punkte, die du vor/während diesem Event im Blick haben solltest.${isBeginnerLevel ? `

💡 **Beispiel**
Ein kurzes Szenario: "Wenn der Wert besser als erwartet → dann typischerweise..."` : ''}` : `📊 **Was ist passiert?**
Actual vs. Forecast — was bedeutet diese Abweichung?${isBeginnerLevel ? ' Kurze Erklärung warum das wichtig ist.' : ''}

🎯 **Auswirkung auf deine Watchlist**
Was bedeutet dieses Ergebnis konkret für deine relevanten Assets?

📈 **Deine Statistik zu diesem Event**
Was sagen deine eigenen Daten dazu?${isBeginnerLevel ? `

💡 **Was du mitnehmen kannst**
Ein konkreter Lernpunkt aus diesem Event.` : ''}`}

═══ PFLICHTREGELN (KEINE AUSNAHMEN) ═══
- Zahlen NUR aus den Daten oben — KEINE erfundenen Statistiken oder Preisbewegungen
- Wenn Statistik "zu wenig Daten": explizit darauf hinweisen, KEINE Prozentzahlen erfinden
- Wenn keine Watchlist-Assets betroffen: das klar sagen
- Du-Form, maximal 5 Sätze pro Abschnitt
- Halte dich EXAKT an das Format mit den Emoji-Überschriften`

  const system = `Du bist Trading-Coach. Antworte strukturiert mit Emoji-Abschnitten, auf Basis der gelieferten Daten. Erfinde keine Statistiken oder Zahlen. Formatiere Abschnitts-Überschriften fett (**text**).`

  const encoder = new TextEncoder()

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
