/**
 * Coach-Kontext für KI-Prompts
 *
 * Liest das vom Agenten generierte Trader-Profil aus der DB und
 * formatiert es als Prompt-Block der in alle KI-Aufrufe eingefügt wird.
 *
 * Kein Profil → leerer String → KI arbeitet ohne persönlichen Kontext.
 * Mit Profil → jeder KI-Aufruf kennt die spezifischen Muster des Traders.
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function getCoachContext(
  userId: string,
  accountId?: string | null
): Promise<string> {
  try {
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('coach_profiles')
      .select('trading_style, strengths, weaknesses, key_patterns, coaching_focus, trades_analyzed, last_updated_at')
      .eq('user_id', userId)

    if (accountId) {
      query = query.eq('account_id', accountId)
    } else {
      query = query.is('account_id', null)
    }

    const { data } = await query.maybeSingle()
    if (!data) return ''

    const lines: string[] = []

    if (data.trading_style) {
      lines.push(`Trader-Typ: ${data.trading_style}`)
    }

    if (data.strengths?.length) {
      lines.push(`\nStärken (datenbasiert):`)
      data.strengths.forEach((s: string) => lines.push(`  + ${s}`))
    }

    if (data.weaknesses?.length) {
      lines.push(`\nSchwächen (datenbasiert):`)
      data.weaknesses.forEach((w: string) => lines.push(`  − ${w}`))
    }

    if (data.key_patterns?.length) {
      lines.push(`\nBeobachtete Muster:`)
      data.key_patterns.forEach((p: string) => lines.push(`  • ${p}`))
    }

    if (data.coaching_focus) {
      lines.push(`\nAktueller Coaching-Fokus: ${data.coaching_focus}`)
    }

    lines.push(`\n(Basierend auf ${data.trades_analyzed} analysierten Trades)`)

    return `─── TRADER-PROFIL (vom Coach-Agenten generiert) ──────────────────────────────\n${lines.join('\n')}`
  } catch {
    return ''
  }
}
