import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { callAI } from '@/lib/ai-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getKnowledgeContext } from '@/lib/knowledge-context'

const SECTION_LABELS: Record<string, string> = {
  strategie_uebersicht: 'Strategie-Übersicht (Was ist deine Strategie, Markttyp, Timeframes, Assets)',
  setup_kriterien: 'Setup-Kriterien (Genaue Bedingungen die erfüllt sein müssen vor einem Trade)',
  entry_exit_regeln: 'Entry & Exit Regeln (Entry-Bedingungen, SL-Platzierung, TP-Ziele, Trailing)',
  risiko_regeln: 'Risiko-Regeln (Max Risk per Trade, Max Daily Loss, Drawdown-Grenze, Positionsgrößen)',
  psychologie_mindset: 'Psychologie & Mindset (Regeln für emotionales Trading, Selbst-Check vor dem Trade)',
  verbotene_verhaltensweisen: 'Verbotene Verhaltensweisen (Explizite No-Gos, was du unter keinen Umständen tust)',
  review_prozess: 'Review-Prozess (Wie und wie oft du Trades reviewst, worauf du achtest)',
  prop_firm_regeln: 'Prop-Firm Regeln (Spezifische Regeln für Prop-Firm Konten)',
}

const VALID_SECTION_KEYS = Object.keys(SECTION_LABELS)

const RequestSchema = z.object({
  section_key: z.string().refine(k => VALID_SECTION_KEYS.includes(k), 'Invalid section_key'),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { section_key } = parsed.data

  // Check for KB documents
  const { data: kbDocs } = await supabase
    .from('knowledge_documents')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .limit(1)

  if (!kbDocs || kbDocs.length === 0) {
    return NextResponse.json(
      { error: 'Keine passenden Inhalte in deiner Knowledge Base gefunden' },
      { status: 422 }
    )
  }

  const knowledgeContext = await getKnowledgeContext(user.id)
  if (!knowledgeContext) {
    return NextResponse.json(
      { error: 'Keine passenden Inhalte in deiner Knowledge Base gefunden' },
      { status: 422 }
    )
  }

  const sectionLabel = SECTION_LABELS[section_key]

  const aiResponse = await callAI({
    userId: user.id,
    system: knowledgeContext,
    messages: [{
      role: 'user',
      content: `Du bist ein Trading-Coach. Erstelle einen Vorschlag für die Sektion "${sectionLabel}" des persönlichen Tradingplans des Nutzers, basierend AUSSCHLIESSLICH auf den Inhalten seiner Knowledge Base.

WICHTIG — Antwortformat (halte dich exakt daran):

REGELN:
- [Regel 1]
- [Regel 2]
- [weitere Regeln...]

NOTIZEN:
[Freitext-Erläuterungen und Kontext zur Sektion]

QUELLE:
[Dokumentname], ca. [kurze Beschreibung der Stelle/des Abschnitts im Dokument]

Falls die Knowledge Base keine relevanten Inhalte für diese Sektion enthält, antworte NUR mit:
KEINE_INHALTE`,
    }],
    maxTokens: 1200,
  })

  const text = aiResponse.text ?? ''

  if (text.trim() === 'KEINE_INHALTE' || text.includes('KEINE_INHALTE')) {
    return NextResponse.json(
      { error: 'Keine passenden Inhalte in deiner Knowledge Base gefunden' },
      { status: 422 }
    )
  }

  // Parse the structured response
  const rulesMatch = text.match(/REGELN:\n([\s\S]*?)(?=\nNOTIZEN:|$)/)
  const notesMatch = text.match(/NOTIZEN:\n([\s\S]*?)(?=\nQUELLE:|$)/)
  const sourceMatch = text.match(/QUELLE:\n([\s\S]*)$/)

  const rules = rulesMatch
    ? rulesMatch[1]
        .split('\n')
        .map(l => l.replace(/^-\s*/, '').trim())
        .filter(Boolean)
    : []

  const notes = notesMatch ? notesMatch[1].trim() : ''
  const source = sourceMatch ? sourceMatch[1].trim() : ''

  return NextResponse.json({ rules, notes, source })
}
