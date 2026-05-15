import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/anthropic'

const postSchema = z.object({
  trade_id: z.string().uuid(),
  account_id: z.string().uuid(),
  checkin_text: z.string().min(1).max(500),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { trade_id, account_id, checkin_text } = parsed.data

  // Fetch trade for context
  const { data: trade } = await supabase
    .from('trades')
    .select('asset, direction, outcome, result_currency, result_percent, setup_type, emotion_before, emotion_after')
    .eq('id', trade_id)
    .eq('user_id', user.id)
    .single()

  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  // Return immediately — process in background
  const response = NextResponse.json({ status: 'processing' })

  // Fire-and-forget: analyze check-in for psychological insights
  ;(async () => {
    try {
      const { data: aiSettings } = await supabase
        .from('user_ai_settings')
        .select('api_key')
        .eq('user_id', user.id)
        .maybeSingle()

      const anthropic = getAnthropicClient(aiSettings?.api_key)

      const tradeContext = [
        `Asset: ${trade.asset}, Richtung: ${trade.direction}`,
        trade.outcome ? `Ergebnis: ${trade.outcome}` : null,
        trade.result_currency != null ? `P&L: ${trade.result_currency}` : null,
        trade.setup_type ? `Setup: ${trade.setup_type}` : null,
        trade.emotion_before ? `Emotion vorher: ${trade.emotion_before}` : null,
        trade.emotion_after ? `Emotion nachher: ${trade.emotion_after}` : null,
      ]
        .filter(Boolean)
        .join(', ')

      const aiResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `Du analysierst einen emotionalen Check-in eines Traders nach einem Trade. Extrahiere psychologische Muster wenn vorhanden.

Antworte NUR mit einem JSON-Objekt:
{
  "has_insight": boolean,
  "insight": "string oder null",
  "pattern_type": "impulse|fear|overconfidence|discipline|revenge|none"
}

Regeln:
- has_insight = true NUR wenn ein konkretes, spezifisches Muster erkennbar ist
- Keine generischen Aussagen ("Trader war nervös")
- Insight muss konkret und beobachtbar formuliert sein
- Maximal 120 Zeichen für insight`,
        messages: [
          {
            role: 'user',
            content: `Trade: ${tradeContext}\n\nCheck-in des Traders: "${checkin_text}"`,
          },
        ],
      })

      const text =
        aiResponse.content[0].type === 'text' ? aiResponse.content[0].text.trim() : null
      if (!text) return

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return

      const result = JSON.parse(jsonMatch[0])
      if (!result.has_insight || !result.insight) return

      // Check for near-duplicate insights
      const { data: existing } = await supabase
        .from('coach_memory_insights')
        .select('insight')
        .eq('user_id', user.id)
        .eq('source', 'trade_checkin')
        .order('created_at', { ascending: false })
        .limit(10)

      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const newNorm = normalize(result.insight)
      const isDuplicate = existing?.some((e: { insight: string }) => {
        const existNorm = normalize(e.insight)
        // Consider duplicate if 80%+ of the shorter string overlaps with the other
        const shorter = Math.min(newNorm.length, existNorm.length)
        const overlap = newNorm.slice(0, shorter) === existNorm.slice(0, shorter)
        return overlap && shorter >= 20
      })
      if (isDuplicate) return

      await supabase.from('coach_memory_insights').insert({
        user_id: user.id,
        account_id,
        insight: result.insight,
        source: 'trade_checkin',
        confirmed: null,
        weight: 1,
      })
    } catch {
      // Silently fail — check-in processing is best-effort
    }
  })()

  return response
}
