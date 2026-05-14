import { createServerSupabaseClient } from '@/lib/supabase-server'

const SECTION_LABELS: Record<string, string> = {
  strategie_uebersicht: 'Strategie-Übersicht',
  setup_kriterien: 'Setup-Kriterien',
  entry_exit_regeln: 'Entry & Exit Regeln',
  risiko_regeln: 'Risiko-Regeln',
  psychologie_mindset: 'Psychologie & Mindset',
  verbotene_verhaltensweisen: 'Verbotene Verhaltensweisen',
  review_prozess: 'Review-Prozess',
  prop_firm_regeln: 'Prop-Firm Regeln',
}

export async function getTradingPlanContext(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('trading_plan_sections')
    .select('section_key, rules, notes')
    .eq('user_id', userId)

  if (!data || data.length === 0) return null

  const parts: string[] = []

  for (const section of data) {
    const label = SECTION_LABELS[section.section_key] ?? section.section_key
    const hasRules = section.rules && section.rules.length > 0
    const hasNotes = section.notes && section.notes.trim().length > 0

    if (!hasRules && !hasNotes) continue

    const lines: string[] = [`### ${label}`]
    if (hasRules) {
      lines.push(section.rules.map((r: string) => `- ${r}`).join('\n'))
    }
    if (hasNotes) {
      lines.push(section.notes.trim())
    }
    parts.push(lines.join('\n'))
  }

  if (parts.length === 0) return null

  return `## Persönlicher Tradingplan des Nutzers\nDer Trader hat folgende verbindliche Regeln und Grundsätze festgelegt. Berücksichtige diese bei deiner Analyse:\n\n${parts.join('\n\n---\n\n')}`
}
