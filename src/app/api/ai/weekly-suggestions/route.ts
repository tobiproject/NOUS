import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { subWeeks, startOfWeek, endOfWeek, format } from 'date-fns'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { account_id, week_start } = await req.json()

  // Vorwoche berechnen
  const thisMonday = new Date(week_start)
  const lastMonday = subWeeks(startOfWeek(thisMonday, { weekStartsOn: 1 }), 1)
  const lastSunday = endOfWeek(lastMonday, { weekStartsOn: 1 })
  const prevWeekStart = format(lastMonday, 'yyyy-MM-dd')
  const prevWeekEnd = format(lastSunday, 'yyyy-MM-dd')

  // Trades der Vorwoche
  const { data: trades } = await supabase
    .from('trades')
    .select('asset, direction, outcome, rr_ratio, result_currency, setup_type, emotion, notes, traded_at')
    .eq('user_id', user.id)
    .eq('account_id', account_id)
    .gte('traded_at', prevWeekStart)
    .lte('traded_at', prevWeekEnd + 'T23:59:59')
    .order('traded_at', { ascending: false })
    .limit(50)

  // Vorwochenziele laden
  const { data: prevPlan } = await supabase
    .from('weekly_plans')
    .select('weekly_goals, focus_assets, max_trades, max_drawdown, notes')
    .eq('user_id', user.id)
    .eq('account_id', account_id)
    .eq('week_start', prevWeekStart)
    .maybeSingle()

  // Strategie
  const { data: strategy } = await supabase
    .from('user_strategy')
    .select('name, description, rules, preferred_timeframes, instruments')
    .eq('user_id', user.id)
    .maybeSingle()

  const tradeCount = trades?.length ?? 0
  const winCount = trades?.filter(t => t.outcome === 'win').length ?? 0
  const winRate = tradeCount > 0 ? Math.round((winCount / tradeCount) * 100) : null
  const totalPnL = trades?.reduce((sum, t) => sum + (t.result_currency ?? 0), 0) ?? 0
  const avgRR = trades && trades.length > 0
    ? (trades.reduce((s, t) => s + (t.rr_ratio ?? 0), 0) / trades.length).toFixed(2)
    : null

  const tradeLines = !trades?.length
    ? 'Keine Trades in der Vorwoche.'
    : trades.map(t =>
        `${t.traded_at.split('T')[0]} | ${t.asset} ${t.direction?.toUpperCase() ?? '?'} | ${t.outcome ?? '?'} | RR: ${t.rr_ratio ?? '?'} | P&L: ${t.result_currency ?? '?'}€ | Emotion: ${t.emotion ?? '-'}`
      ).join('\n')

  const prevGoals = prevPlan?.weekly_goals?.length
    ? prevPlan.weekly_goals.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n')
    : 'Keine Ziele definiert'

  const strategyContext = strategy
    ? `Strategie: ${strategy.name} — ${strategy.description ?? ''}\nRegeln: ${strategy.rules?.join(', ') ?? '-'}`
    : 'Keine Strategie hinterlegt'

  const response = await callAI({
    userId: user.id,
    system: 'Du bist ein präziser Trading-Coach. Antworte ausschließlich im angegebenen JSON-Format, kein Markdown drumherum.',
    messages: [{
      role: 'user',
      content: `Analysiere die Vorwoche und erstelle Vorschläge für die kommende Woche.

${strategyContext}

Vorwoche (${prevWeekStart} bis ${prevWeekEnd}):
- Trades: ${tradeCount}, Winrate: ${winRate !== null ? winRate + '%' : '?'}, P&L: ${totalPnL.toFixed(0)}€, Ø RR: ${avgRR ?? '?'}
- Ziele der Vorwoche:
${prevGoals}

Trades:
${tradeLines}

Antworte NUR mit folgendem JSON (kein Text davor/danach):
{
  "goals": ["Ziel 1", "Ziel 2", "Ziel 3"],
  "notes": "Marktkontext und Fokusthemen als 2-3 Sätze"
}

Regeln:
- goals: 2-4 konkrete, messbare Ziele die direkt auf Schwächen der Vorwoche eingehen
- notes: kurze Einschätzung was diese Woche wichtig wird (Markt, Psychologie, Setup-Fokus)
- Sprich den Trader in du-Form an
- Sei direkt und konkret, kein Floskeln`,
    }],
    maxTokens: 600,
  })

  try {
    const text = response.text?.trim() ?? ''
    // JSON aus Antwort extrahieren (falls KI trotzdem etwas darum packt)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? text)
    return NextResponse.json({
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    })
  } catch {
    return NextResponse.json({ error: 'KI-Antwort konnte nicht verarbeitet werden' }, { status: 500 })
  }
}
