import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/anthropic'
import { getMemoryInsights, formatInsightsForPrompt, extractAndSaveInsights } from '@/lib/coach-memory'

const MAX_MESSAGES = 20

const postSchema = z.object({
  account_id: z.string().uuid(),
  trade_id: z.string().uuid(),
  conversation_id: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(2000),
})

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tradeId = searchParams.get('trade_id')
  const accountId = searchParams.get('account_id')
  if (!tradeId || !accountId) return NextResponse.json({ error: 'trade_id and account_id required' }, { status: 400 })

  const { data } = await supabase
    .from('coach_conversations')
    .select('*')
    .eq('trade_id', tradeId)
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(data ?? { id: null, messages: [], message_count: 0 })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { account_id, trade_id, conversation_id, message } = parsed.data

  // Fetch trade for context
  const { data: trade } = await supabase
    .from('trades')
    .select('*')
    .eq('id', trade_id)
    .eq('account_id', account_id)
    .eq('user_id', user.id)
    .single()

  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  // Load or create conversation
  let conversationRow: { id: string; messages: Array<{ role: string; content: string; created_at: string }> } | null = null

  if (conversation_id) {
    const { data } = await supabase
      .from('coach_conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single()
    conversationRow = data
  }

  const existingMessages: Array<{ role: string; content: string; created_at: string }> = conversationRow?.messages ?? []

  if (existingMessages.length >= MAX_MESSAGES) {
    return NextResponse.json({ error: 'Maximale Gesprächslänge erreicht' }, { status: 422 })
  }

  // Load memory insights for this user
  const insights = await getMemoryInsights(user.id, account_id)
  const insightBlock = formatInsightsForPrompt(insights)

  // Build conversation history for Claude
  const tradeContext = [
    insightBlock,
    `─── TRADE-COACHING (Sokrates-Methode) ───────────────────────────────────────
Du coachst diesen Trader zu folgendem spezifischen Trade:
Asset: ${trade.asset}, Richtung: ${trade.direction}, Entry: ${trade.entry_price}, SL: ${trade.sl_price}, TP: ${trade.tp_price}, Setup: ${trade.setup_type ?? 'unbekannt'}, Strategie: ${trade.strategy ?? 'unbekannt'}, Ergebnis: ${trade.outcome ?? 'noch unbekannt'}, P&L: ${trade.result_currency ?? 'noch unbekannt'}, Notizen: ${trade.notes ?? 'keine'}.

Regeln:
- Stelle offene Fragen, gib keine direkten Antworten
- Wenn du ein bekanntes Muster aus den gespeicherten Erkenntnissen erkennst, sprich es direkt an
- Erst bei der letzten Nachricht (Nachricht ${MAX_MESSAGES}) darfst du eine Zusammenfassung und Bewertung geben
- Antworte immer auf Deutsch
- Erste Nachricht: Starte mit einer offenen Frage über den Trade (keine Bewertung)`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const isFirstMessage = existingMessages.length === 0
  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  if (!isFirstMessage) {
    for (const msg of existingMessages) {
      claudeMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }
  }
  claudeMessages.push({ role: 'user', content: message })

  const { data: aiSettings } = await supabase.from('user_ai_settings').select('api_key').eq('user_id', user.id).maybeSingle()
  const anthropic = getAnthropicClient(aiSettings?.api_key)

  // Stream the response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = ''
      let convId = conversationRow?.id ?? null

      try {
        const response = await anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: tradeContext,
          messages: claudeMessages,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            assistantContent += event.delta.text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: event.delta.text })}\n\n`)
            )
          }
        }

        // Persist conversation
        const now = new Date().toISOString()
        const userMsg = { role: 'user', content: message, created_at: now }
        const assistantMsg = { role: 'assistant', content: assistantContent, created_at: now }
        const updatedMessages = [...existingMessages, userMsg, assistantMsg]

        if (convId) {
          await supabase
            .from('coach_conversations')
            .update({ messages: updatedMessages, message_count: updatedMessages.length, updated_at: now })
            .eq('id', convId)
        } else {
          const { data: newConv } = await supabase
            .from('coach_conversations')
            .insert({
              trade_id,
              account_id,
              user_id: user.id,
              messages: updatedMessages,
              message_count: updatedMessages.length,
            })
            .select('id')
            .single()
          convId = newConv?.id ?? null
        }

        // Track activity
        await supabase
          .from('learn_activity')
          .upsert(
            {
              account_id,
              user_id: user.id,
              activity_date: new Date().toISOString().split('T')[0],
              activity_type: 'coach',
            },
            { onConflict: 'account_id,user_id,activity_date,activity_type' }
          )

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', id: convId })}\n\n`)
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))

        // Fire-and-forget: extract insights from trade coaching conversation
        const allMessages = updatedMessages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        }))
        extractAndSaveInsights(user.id, account_id, allMessages, 'conversation', anthropic)
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'KI nicht verfügbar' })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
