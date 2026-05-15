import { createServerSupabaseClient } from '@/lib/supabase-server'

export type CoachInsight = {
  id: string
  user_id: string
  account_id: string | null
  insight: string
  source: 'conversation' | 'trade_checkin' | 'pattern_detection'
  confirmed: boolean | null
  weight: number
  created_at: string
  updated_at: string
}

export async function getMemoryInsights(
  userId: string,
  accountId?: string | null
): Promise<CoachInsight[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase
      .from('coach_memory_insights')
      .select('*')
      .eq('user_id', userId)
      .neq('confirmed', false)
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)

    return (data ?? []) as CoachInsight[]
  } catch {
    return []
  }
}

export function formatInsightsForPrompt(insights: CoachInsight[]): string {
  if (!insights.length) return ''

  const lines: string[] = [
    '─── GESPEICHERTE PSYCHOLOGISCHE ERKENNTNISSE ÜBER DIESEN TRADER ─────────────',
    '(Aus früheren Gesprächen und Trade-Analysen extrahiert. Nutze diese aktiv.)',
  ]

  const confirmed = insights.filter((i) => i.confirmed === true)
  const pending = insights.filter((i) => i.confirmed === null)

  if (confirmed.length) {
    lines.push('\nBESTÄTIGTE MUSTER (vom Trader selbst verifiziert — höchste Relevanz):')
    confirmed.forEach((i) => {
      const weight = i.weight > 1 ? ` [${i.weight}x bestätigt]` : ''
      lines.push(`  • ${i.insight}${weight}`)
    })
  }

  if (pending.length) {
    lines.push('\nBEOBACHTETE MUSTER (noch nicht verifiziert — als Hypothese behandeln):')
    pending.forEach((i) => {
      lines.push(`  ◦ ${i.insight}`)
    })
  }

  lines.push(
    '\nWenn der Trader ein bekanntes Muster zeigt, sprich es direkt an — zitiere es konkret.'
  )

  return lines.join('\n')
}

export async function getPreviousConversationContext(
  userId: string,
  currentConversationId?: string | null,
  limit = 5
): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('coach_conversations')
      .select('summary, messages, created_at, is_summarized')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (currentConversationId) {
      query = query.neq('id', currentConversationId)
    }

    const { data } = await query

    if (!data?.length) return ''

    const lines: string[] = ['─── KONTEXT AUS FRÜHEREN GESPRÄCHEN ─────────────────────────────────────────']

    for (const conv of data) {
      const date = new Date(conv.created_at).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

      if (conv.is_summarized && conv.summary) {
        lines.push(`\n${date}: ${conv.summary}`)
      } else if (conv.messages?.length) {
        const msgs = conv.messages as Array<{ role: string; content: string }>
        const preview = msgs
          .slice(0, 4)
          .map((m: { role: string; content: string }) =>
            `${m.role === 'user' ? 'Trader' : 'Coach'}: ${m.content.slice(0, 150)}${m.content.length > 150 ? '...' : ''}`
          )
          .join(' | ')
        lines.push(`\n${date}: ${preview}`)
      }
    }

    return lines.join('\n')
  } catch {
    return ''
  }
}

export async function extractAndSaveInsights(
  userId: string,
  accountId: string | null,
  conversationMessages: Array<{ role: string; content: string }>,
  source: 'conversation' | 'trade_checkin',
  anthropic: import('@anthropic-ai/sdk').Anthropic
): Promise<void> {
  try {
    const conversationText = conversationMessages
      .map((m) => `${m.role === 'user' ? 'Trader' : 'Coach'}: ${m.content}`)
      .join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `Du bist ein Psychologie-Analyst. Analysiere das folgende Trading-Coaching-Gespräch und extrahiere neue psychologische Erkenntnisse über den Trader — Muster, Verhaltensweisen, emotionale Trigger.

Antworte NUR mit einem JSON-Array. Jedes Element hat: { "insight": "string", "source": "${source}" }
Maximal 3 Erkenntnisse. Nur wenn wirklich neue, spezifische Muster erkennbar sind.
Wenn keine neuen Erkenntnisse: leeres Array [].
Keine allgemeinen Aussagen ("Der Trader handelt emotional") — nur spezifische, beobachtbare Muster.`,
      messages: [
        {
          role: 'user',
          content: `Gespräch:\n${conversationText}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return

    const insights: Array<{ insight: string; source: string }> = JSON.parse(jsonMatch[0])
    if (!insights.length) return

    const supabase = await createServerSupabaseClient()
    await supabase.from('coach_memory_insights').insert(
      insights.map((i) => ({
        user_id: userId,
        account_id: accountId,
        insight: i.insight,
        source: i.source as 'conversation' | 'trade_checkin',
        confirmed: null,
        weight: 1,
      }))
    )
  } catch {
    // Fire-and-forget — silent failure
  }
}

export async function summarizeOldConversations(
  userId: string,
  anthropic: import('@anthropic-ai/sdk').Anthropic
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: unsummarized } = await supabase
      .from('coach_conversations')
      .select('id, messages, created_at')
      .eq('user_id', userId)
      .eq('is_summarized', false)
      .not('messages', 'eq', '[]')
      .order('created_at', { ascending: true })
      .limit(5)

    if (!unsummarized?.length) return

    const { count } = await supabase
      .from('coach_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if ((count ?? 0) <= 20) return

    for (const conv of unsummarized) {
      const msgs = conv.messages as Array<{ role: string; content: string }>
      if (msgs.length < 4) continue

      const text = msgs
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Trader' : 'Coach'}: ${m.content}`)
        .join('\n')

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system:
          'Fasse dieses Coaching-Gespräch in 2-3 Sätzen zusammen. Fokus: Hauptthema, wichtigste Erkenntnis, emotionaler Zustand des Traders. Keine Einleitung, direkt zur Zusammenfassung.',
        messages: [{ role: 'user', content: text }],
      })

      const summary =
        response.content[0].type === 'text' ? response.content[0].text.trim() : ''
      if (!summary) continue

      await supabase
        .from('coach_conversations')
        .update({ summary, is_summarized: true })
        .eq('id', conv.id)
    }
  } catch {
    // Fire-and-forget
  }
}
