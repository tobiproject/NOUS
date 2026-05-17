import { createServerSupabaseClient } from '@/lib/supabase-server'

const MAX_CHARS_PER_DOC = 3000
const MAX_TOTAL_CHARS = 8000

/**
 * Returns a condensed string of the user's knowledge base texts,
 * ready to be injected into an AI system prompt.
 * Returns null if no documents are available.
 */
export async function getKnowledgeContext(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('knowledge_documents')
    .select('name, extracted_text')
    .eq('user_id', userId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!data || data.length === 0) return null

  let total = 0
  const parts: string[] = []

  for (const doc of data) {
    if (!doc.extracted_text) continue
    const excerpt = doc.extracted_text.slice(0, MAX_CHARS_PER_DOC)
    const remaining = MAX_TOTAL_CHARS - total
    if (remaining <= 0) break
    parts.push(`### ${doc.name}\n${excerpt.slice(0, remaining)}`)
    total += excerpt.length
    if (total >= MAX_TOTAL_CHARS) break
  }

  if (parts.length === 0) return null

  return `## Trading Knowledge Base des Nutzers\nDer Trader hat folgende Unterlagen hochgeladen. Beziehe dich bei deiner Analyse explizit darauf wenn relevant:\n\n${parts.join('\n\n---\n\n')}`
}
