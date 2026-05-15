import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/anthropic'
import { buildSystemPrompt } from '@/lib/coach-system-prompt'
import { getCoachContext } from '@/lib/coach-context'
import {
  getMemoryInsights,
  formatInsightsForPrompt,
  getPreviousConversationContext,
  extractAndSaveInsights,
  summarizeOldConversations,
} from '@/lib/coach-memory'

const postSchema = z.object({
  account_id: z.string().uuid(),
  conversation_id: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(2000),
})

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const conversationId = searchParams.get('conversation_id')

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  if (conversationId) {
    const { data } = await supabase
      .from('coach_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()
    return NextResponse.json(data ?? { id: null, messages: [] })
  }

  // Return most recent free conversation
  const { data } = await supabase
    .from('coach_conversations')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', accountId)
    .is('trade_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(data ?? { id: null, messages: [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { account_id, conversation_id, message } = parsed.data

  // Load existing conversation
  let conversationRow: {
    id: string
    messages: Array<{ role: string; content: string; created_at: string }>
  } | null = null

  if (conversation_id) {
    const { data } = await supabase
      .from('coach_conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single()
    conversationRow = data
  }

  const existingMessages: Array<{ role: string; content: string; created_at: string }> =
    conversationRow?.messages ?? []

  // Load memory + context in parallel
  const [insights, coachProfile, previousContext] = await Promise.all([
    getMemoryInsights(user.id, account_id),
    getCoachContext(user.id, account_id),
    getPreviousConversationContext(user.id, conversationRow?.id ?? null),
  ])

  const insightBlock = formatInsightsForPrompt(insights)

  const routeContext = [
    insightBlock,
    coachProfile,
    previousContext,
    `─── FREIER COACHING-CHAT ─────────────────────────────────────────────────────
Der Trader hat kein spezifisches Trade-Thema gewählt. Er kommt mit was ihm auf der Seele liegt.

REGELN:
- Stelle IMMER mindestens eine konkrete Rückfrage
- Wenn der Trader ein bekanntes Muster aus den gespeicherten Erkenntnissen zeigt, sprich es DIREKT an
- Psychologische Referenzen (Douglas, Kahneman, Tharp, Steenbarger, Taleb, Stoiker) NUR wenn passend — max. 1 Satz
- Antworte auf Deutsch, prägnant`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...existingMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const { data: aiSettings } = await supabase
    .from('user_ai_settings')
    .select('api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  const anthropic = getAnthropicClient(aiSettings?.api_key)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = ''
      let convId = conversationRow?.id ?? null

      try {
        const response = await anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          system: buildSystemPrompt(routeContext),
          messages: claudeMessages,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            assistantContent += event.delta.text
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'delta', content: event.delta.text })}\n\n`
              )
            )
          }
        }

        // Persist conversation
        const now = new Date().toISOString()
        const updatedMessages = [
          ...existingMessages,
          { role: 'user', content: message, created_at: now },
          { role: 'assistant', content: assistantContent, created_at: now },
        ]

        if (convId) {
          await supabase
            .from('coach_conversations')
            .update({ messages: updatedMessages, updated_at: now })
            .eq('id', convId)
        } else {
          const { data: newConv } = await supabase
            .from('coach_conversations')
            .insert({
              user_id: user.id,
              account_id,
              trade_id: null,
              messages: updatedMessages,
            })
            .select('id')
            .single()
          convId = newConv?.id ?? null
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', id: convId })}\n\n`)
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))

        // Fire-and-forget: extract insights + maybe summarize old convs
        const allMessages = updatedMessages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        }))
        extractAndSaveInsights(user.id, account_id, allMessages, 'conversation', anthropic)
        summarizeOldConversations(user.id, anthropic)
      } catch {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'KI nicht verfügbar' })}\n\n`
          )
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
