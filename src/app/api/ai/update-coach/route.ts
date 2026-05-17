/**
 * Coach-Agent — Lernschleife
 *
 * Analysiert alle Trades des Nutzers und generiert ein persönliches
 * Coach-Profil das in alle zukünftigen KI-Aufrufe einfließt.
 *
 * Wird aufgerufen:
 *   - Automatisch nach jedem 10. neuen Trade (via /api/trades POST)
 *   - Manuell vom Nutzer über das Coach-Widget
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/ai-client'
import { COACH_SYSTEM_PROMPT } from '@/lib/coach-system-prompt'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { account_id } = await req.json().catch(() => ({}))

  // ── 1. Alle Trades laden ───────────────────────────────────────────────────
  let tradeQuery = supabase
    .from('trades')
    .select('asset, direction, outcome, rr_ratio, result_currency, setup_type, emotion, notes, traded_at, strategy')
    .eq('user_id', user.id)
    .order('traded_at', { ascending: false })
    .limit(200)

  if (account_id) tradeQuery = tradeQuery.eq('account_id', account_id)

  const { data: trades } = await tradeQuery
  if (!trades?.length) {
    return NextResponse.json({ error: 'Noch keine Trades vorhanden.' }, { status: 422 })
  }

  // ── 2. Statistiken berechnen ───────────────────────────────────────────────
  const total    = trades.length
  const wins     = trades.filter(t => t.outcome === 'win').length
  const losses   = trades.filter(t => t.outcome === 'loss').length
  const winRate  = Math.round((wins / total) * 100)
  const totalPnL = trades.reduce((s, t) => s + (t.result_currency ?? 0), 0)
  const avgRR    = trades.filter(t => t.rr_ratio).reduce((s, t) => s + (t.rr_ratio ?? 0), 0) / (trades.filter(t => t.rr_ratio).length || 1)

  // Winrate nach Tageszeit
  const byHour: Record<number, { w: number; l: number }> = {}
  trades.forEach(t => {
    const h = new Date(t.traded_at).getHours()
    if (!byHour[h]) byHour[h] = { w: 0, l: 0 }
    if (t.outcome === 'win')  byHour[h].w++
    if (t.outcome === 'loss') byHour[h].l++
  })
  const hourStats = Object.entries(byHour)
    .map(([h, s]) => {
      const n = s.w + s.l
      return { hour: Number(h), wr: Math.round(s.w / n * 100), n }
    })
    .filter(x => x.n >= 3)
    .sort((a, b) => b.n - a.n)

  // Winrate nach Wochentag
  const byDay: Record<number, { w: number; l: number }> = {}
  trades.forEach(t => {
    const d = new Date(t.traded_at).getDay()
    if (!byDay[d]) byDay[d] = { w: 0, l: 0 }
    if (t.outcome === 'win')  byDay[d].w++
    if (t.outcome === 'loss') byDay[d].l++
  })
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const dayStats = Object.entries(byDay)
    .map(([d, s]) => {
      const n = s.w + s.l
      return { day: dayNames[Number(d)], wr: Math.round(s.w / n * 100), n }
    })
    .filter(x => x.n >= 3)

  // Winrate nach Emotion
  const byEmotion: Record<string, { w: number; l: number }> = {}
  trades.forEach(t => {
    if (!t.emotion) return
    const e = t.emotion
    if (!byEmotion[e]) byEmotion[e] = { w: 0, l: 0 }
    if (t.outcome === 'win')  byEmotion[e].w++
    if (t.outcome === 'loss') byEmotion[e].l++
  })
  const emotionStats = Object.entries(byEmotion)
    .map(([e, s]) => {
      const n = s.w + s.l
      return { emotion: e, wr: Math.round(s.w / n * 100), n }
    })
    .filter(x => x.n >= 2)

  // Winrate nach Setup
  const bySetup: Record<string, { w: number; l: number }> = {}
  trades.forEach(t => {
    if (!t.setup_type) return
    const s = t.setup_type
    if (!bySetup[s]) bySetup[s] = { w: 0, l: 0 }
    if (t.outcome === 'win')  bySetup[s].w++
    if (t.outcome === 'loss') bySetup[s].l++
  })
  const setupStats = Object.entries(bySetup)
    .map(([s, v]) => {
      const n = v.w + v.l
      return { setup: s, wr: Math.round(v.w / n * 100), n }
    })
    .filter(x => x.n >= 2)

  // Letzte 10 Trades für Kontext
  const recentLines = trades.slice(0, 10).map(t =>
    `${t.traded_at.split('T')[0]} | ${t.asset} ${(t.direction ?? '?').toUpperCase()} | ${t.outcome ?? '?'} | RR: ${t.rr_ratio ?? '?'} | P&L: ${t.result_currency ?? '?'}€ | Emotion: ${t.emotion ?? '-'} | Setup: ${t.setup_type ?? '-'}`
  ).join('\n')

  // ── 3. KI-Analyse ──────────────────────────────────────────────────────────
  const dataBlock = `
GESAMTSTATISTIK (${total} Trades):
- Winrate: ${winRate}%  |  Wins: ${wins}  |  Losses: ${losses}
- Gesamt P&L: ${totalPnL.toFixed(0)}€  |  Ø RR: ${avgRR.toFixed(2)}

WINRATE NACH TAGESZEIT:
${hourStats.map(h => `  ${String(h.hour).padStart(2, '0')}:00 Uhr → ${h.wr}% (${h.n} Trades)`).join('\n') || '  Zu wenig Daten'}

WINRATE NACH WOCHENTAG:
${dayStats.map(d => `  ${d.day} → ${d.wr}% (${d.n} Trades)`).join('\n') || '  Zu wenig Daten'}

WINRATE NACH EMOTION:
${emotionStats.map(e => `  ${e.emotion} → ${e.wr}% (${e.n} Trades)`).join('\n') || '  Emotionen nicht erfasst'}

WINRATE NACH SETUP-TYP:
${setupStats.map(s => `  ${s.setup} → ${s.wr}% (${s.n} Trades)`).join('\n') || '  Setup-Typen nicht erfasst'}

LETZTE 10 TRADES:
${recentLines}
`

  const { client, model } = await getAnthropicClient(user.id)

  const response = await client.messages.create({
    model,
    max_tokens: 1200,
    system: `${COACH_SYSTEM_PROMPT}

Du analysierst jetzt die vollständigen Trading-Daten eines Nutzers und baust sein persönliches Trader-Profil.
Antworte NUR mit dem JSON-Objekt, kein Text davor oder danach.`,
    messages: [{
      role: 'user',
      content: `Analysiere diese Trading-Daten und erstelle das persönliche Profil des Traders.

${dataBlock}

Antworte NUR mit diesem JSON (keine Markdown-Blöcke, kein Text):
{
  "trading_style": "Einzeiler der den Trader-Typ beschreibt",
  "strengths": ["Stärke 1 mit konkreten Zahlen", "Stärke 2"],
  "weaknesses": ["Schwäche 1 mit konkreten Zahlen", "Schwäche 2"],
  "key_patterns": ["Muster 1", "Muster 2", "Muster 3"],
  "coaching_focus": "Das wichtigste was dieser Trader JETZT angehen muss — konkret, direkt, mit Zahl",
  "raw_profile": "Zusammenfassung in 3-4 Sätzen für den Trader — direkt, ohne Floskeln"
}

Regeln:
- Jede Aussage muss durch die Daten belegbar sein
- Keine Erfindungen, keine Allgemeinplätze
- Bei zu wenig Daten: das explizit sagen statt raten
- coaching_focus: EIN klarer Satz, keine Liste`,
    }],
  })

  const raw = response.content.find(b => b.type === 'text')?.text?.trim() ?? ''

  let profile: {
    trading_style?: string
    strengths?: string[]
    weaknesses?: string[]
    key_patterns?: string[]
    coaching_focus?: string
    raw_profile?: string
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    profile = JSON.parse(jsonMatch?.[0] ?? raw)
  } catch {
    return NextResponse.json({ error: 'Profil konnte nicht verarbeitet werden.' }, { status: 500 })
  }

  // ── 4. Profil speichern ────────────────────────────────────────────────────
  const { error } = await supabase
    .from('coach_profiles')
    .upsert(
      {
        user_id:         user.id,
        account_id:      account_id ?? null,
        trading_style:   profile.trading_style ?? null,
        strengths:       profile.strengths ?? [],
        weaknesses:      profile.weaknesses ?? [],
        key_patterns:    profile.key_patterns ?? [],
        coaching_focus:  profile.coaching_focus ?? null,
        raw_profile:     profile.raw_profile ?? null,
        trades_analyzed: total,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,account_id' }
    )

  if (error) {
    // Fallback: insert without onConflict if index name mismatch
    await supabase.from('coach_profiles').upsert(
      {
        user_id:         user.id,
        account_id:      account_id ?? null,
        trading_style:   profile.trading_style ?? null,
        strengths:       profile.strengths ?? [],
        weaknesses:      profile.weaknesses ?? [],
        key_patterns:    profile.key_patterns ?? [],
        coaching_focus:  profile.coaching_focus ?? null,
        raw_profile:     profile.raw_profile ?? null,
        trades_analyzed: total,
        last_updated_at: new Date().toISOString(),
      }
    )
  }

  return NextResponse.json({ profile, trades_analyzed: total })
}
