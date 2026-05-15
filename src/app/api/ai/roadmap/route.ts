import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { callAI } from '@/lib/ai-client'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load last 90 days of trades
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: trades } = await supabase
    .from('trades')
    .select('asset, direction, outcome, rr_ratio, risk_percent, result_percent, emotion_before, emotion_after, setup_type, lesson_learned, what_went_well, what_to_improve, traded_at')
    .eq('user_id', user.id)
    .gte('traded_at', since)
    .order('traded_at', { ascending: true })
    .limit(200)

  // Load strategy
  const { data: strategyRow } = await supabase
    .from('user_strategy')
    .select('name, description, rules')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!trades || trades.length < 5) {
    return NextResponse.json({ error: 'Zu wenige Trades für eine Analyse (mind. 5 nötig).' }, { status: 422 })
  }

  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const winRate = Math.round((wins / trades.length) * 100)
  const avgRR = trades.filter(t => t.rr_ratio).reduce((s, t) => s + (t.rr_ratio ?? 0), 0) / trades.filter(t => t.rr_ratio).length

  const hasStrategy = !!strategyRow?.name

  const prompt = `Du bist ein erfahrener, ungeschminkter Trading-Coach. Deine Aufgabe ist es, dem Trader die WAHRHEIT zu sagen — nicht das, was er hören will. Kein Schönreden, kein Motivationsgequatsche. Analysiere die Daten und gib eine harte, ehrliche Einschätzung.

STRATEGIE: ${strategyRow?.name ?? 'KEINE STRATEGIE ANGELEGT'} — ${strategyRow?.description ?? '—'}
REGELN: ${(strategyRow?.rules ?? []).join('; ') || 'Keine Regeln definiert'}
TRADES-ANZAHL GESAMT: ${trades.length}

PERFORMANCE (letzte 90 Tage):
- Win-Rate: ${winRate}%
- Wins: ${wins}, Losses: ${losses}
- Durchschnittliches RR: ${isNaN(avgRR) ? '?' : avgRR.toFixed(2)}
- Assets: ${[...new Set(trades.map(t => t.asset))].join(', ')}
- Emotions vor Trades (häufigste): ${[...new Set(trades.map(t => t.emotion_before).filter(Boolean))].join(', ') || 'nicht erfasst'}
- Emotions nach Trades: ${[...new Set(trades.map(t => t.emotion_after).filter(Boolean))].join(', ') || 'nicht erfasst'}
- Lektionen aus Nachbereitungen: ${trades.filter(t => t.lesson_learned).map(t => t.lesson_learned).slice(-10).join(' | ') || 'Keine'}

TRADER-JOURNEY PHASEN (wähle eine aus 1-6):
1 = "Erste Erfolge" — Euphorie, denkt er hat es verstanden, Anfängerglück
2 = "Erster Einbruch" — erste echte Verluste, Selbstzweifel beginnen
3 = "Der Tiefpunkt" — größte Verluste, Frustration, viele geben hier auf
4 = "Langsames Lernen" — beginnt zu verstehen was Trading wirklich bedeutet
5 = "Konsistenz aufbauen" — erste Beständigkeit, aber noch nicht profitabel
6 = "Profitabler Trader" — reproduzierbar profitabel

Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text darum):
{
  "level": "Beginner" | "Developing" | "Consistent" | "Profitabel",
  "score": <Zahl 0-100 wie weit in der aktuellen Stufe>,
  "level_description": "<1 harter Satz was diese Stufe bedeutet — keine Weichspülerei>",
  "next_level": "<Name der nächsten Stufe oder null>",
  "journey_phase": <1-6>,
  "journey_phase_label": "<Name der Phase>",
  "journey_phase_description": "<2 Sätze was diese Phase bedeutet — ehrlich und direkt>",
  "honest_assessment": "<3-4 Sätze harte Wahrheit über den aktuellen Stand. Nenne konkrete Probleme beim Namen. Kein Schönreden.>",
  "strengths": ["<Stärke 1>", "<Stärke 2>", "<Stärke 3>"],
  "weaknesses": ["<Schwäche 1>", "<Schwäche 2>", "<Schwäche 3>"],
  "danger_zones": ["<Fallstrick 1 der in den nächsten Wochen lauert>", "<Fallstrick 2>", "<Fallstrick 3>"],
  "next_milestone": "<Konkreter nächster Schritt — was muss sich ändern>",
  "trades_to_next_milestone": <geschätzte Anzahl Trades bis zum nächsten Meilenstein — realistisch>,
  "time_estimate": "<Ehrliche Zeitschätzung bis zur Profitabilität — wenn aktueller Trend anhält>",
  "narrative": "<3-4 Sätze — ehrlich, direkt, ohne Schönfärberei aber konstruktiv>",
  "milestones": [
    { "label": "<Meilenstein>", "achieved": <true|false>, "description": "<kurze Erklärung>", "trades_needed": <Zahl oder null> }
  ]
}`

  const aiResponse = await callAI({
    userId: user.id,
    system: '',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1024,
  })

  const raw = (aiResponse.text ?? '').trim()
  let roadmapData: Record<string, unknown>
  try {
    roadmapData = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'KI-Antwort konnte nicht verarbeitet werden.' }, { status: 500 })
  }

  // Upsert into user_roadmap
  await supabase.from('user_roadmap').upsert(
    { user_id: user.id, data: roadmapData, generated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({ roadmap: roadmapData, has_strategy: hasStrategy, trade_count: trades.length })
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data }, { data: strategy }, { count }, { data: latestTrade }, { data: latestStrategy }] = await Promise.all([
    supabase.from('user_roadmap').select('data, generated_at').eq('user_id', user.id).single(),
    supabase.from('user_strategy').select('name').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('trades').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('trades').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_strategy').select('updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  // Staleness: roadmap is outdated if trades or strategy were changed after last analysis
  const generatedAt = data?.generated_at ?? null
  let isStale = false
  if (generatedAt && data?.data) {
    const gen = new Date(generatedAt).getTime()
    if (latestTrade?.created_at && new Date(latestTrade.created_at).getTime() > gen) isStale = true
    if (latestStrategy?.updated_at && new Date(latestStrategy.updated_at).getTime() > gen) isStale = true
  }

  return NextResponse.json({
    roadmap: data?.data ?? null,
    generated_at: generatedAt,
    has_strategy: !!strategy?.name,
    trade_count: count ?? 0,
    is_stale: isStale,
  })
}
