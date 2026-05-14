import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getISOWeekString, getLocalDateInfo } from '@/lib/workflow-utils'

function getMondayStr(todayStr: string, dayOfWeek: number): string {
  const [y, m, d] = todayStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  date.setDate(date.getDate() + diffToMonday)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = req.nextUrl.searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const now = new Date()
  const tz = req.nextUrl.searchParams.get('tz') ?? 'UTC'
  const { todayStr, hour: localHour, dayOfWeek: localDayOfWeek } = getLocalDateInfo(now, tz)
  const weekIso = getISOWeekString(now)
  const mondayStr = getMondayStr(todayStr, localDayOfWeek)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1)
  weekStart.setHours(0, 0, 0, 0)

  // Fetch all data in parallel
  const [weeklyPlanResult, dailyPlanResult, tradesTodayResult, analysisResult, workflowStateResult, watchlistResult] =
    await Promise.all([
      // 1. Wochenvorbereitung: weekly_plan for this week
      supabase
        .from('weekly_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start', mondayStr)
        .maybeSingle(),

      // 2. Tagesplan: daily_plan for today
      supabase
        .from('daily_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('plan_date', todayStr)
        .maybeSingle(),

      // 3. Trades today (limit 50 — well above any realistic daily trade count)
      supabase
        .from('trades')
        .select('id')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .gte('traded_at', `${todayStr}T00:00:00.000Z`)
        .lt('traded_at', `${todayStr}T23:59:59.999Z`)
        .limit(50),

      // 4. AI analysis for today's trades
      supabase
        .from('ai_analyses')
        .select('trade_id, status')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('status', 'completed')
        .gte('created_at', `${todayStr}T00:00:00.000Z`)
        .limit(50),

      // 5. Workflow state for this week
      supabase
        .from('workflow_state')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('week_iso', weekIso)
        .maybeSingle(),

      // 6. Watchlist for calendar warning
      supabase
        .from('watchlist_items')
        .select('symbol')
        .eq('user_id', user.id)
        .eq('account_id', accountId),
    ])

  const weeklyPlan = weeklyPlanResult.data
  const dailyPlan = dailyPlanResult.data
  const tradesToday = tradesTodayResult.data ?? []
  const analysesToday = analysisResult.data ?? []
  const state = workflowStateResult.data
  const watchlistSymbols = (watchlistResult.data ?? []).map((w: { symbol: string }) => w.symbol)

  // Calendar warning: check today's high-impact events for watchlist assets
  let calendarWarning: string | null = null
  if (watchlistSymbols.length > 0) {
    const { data: events } = await supabase
      .from('economic_events')
      .select('title, currency, impact')
      .eq('date', todayStr)
      .eq('impact', 'High')

    if (events && events.length > 0) {
      const relevantEvents = events.filter((e: { currency: string }) => {
        const curr = (e.currency ?? '').toLowerCase()
        if (!curr) return false
        return watchlistSymbols.some(sym => {
          const symLow = sym.toLowerCase()
          // Currency appears in symbol name (e.g. EUR in EURUSD)
          if (symLow.includes(curr)) return true
          // Symbol's base (first 3 chars) matches currency
          const base = symLow.slice(0, 3)
          if (base && curr.includes(base)) return true
          // Symbol's quote (chars 3–6) matches currency — guard against empty slice
          const quote = symLow.slice(3, 6)
          if (quote && curr.includes(quote)) return true
          return false
        })
      })
      if (relevantEvents.length > 0) {
        const names = relevantEvents.slice(0, 2).map((e: { title: string; currency: string }) => `${e.currency}: ${e.title}`)
        calendarWarning = names.join(', ')
      }
    }
  } else {
    calendarWarning = 'empty_watchlist'
  }

  // Determine step statuses
  const tradeIds = tradesToday.map((t: { id: string }) => t.id)
  const analyzedTradeIds = new Set(analysesToday.map((a: { trade_id: string }) => a.trade_id))
  const tradeAnalyzed = tradeIds.length > 0 && tradeIds.some((id: string) => analyzedTradeIds.has(id))

  // Kalender visited today
  const kalenderVisited = state?.visited_kalender_at
    ? state.visited_kalender_at.startsWith(todayStr)
    : false

  // Performance visited this week
  const perfVisited = state?.visited_performance_at
    ? new Date(state.visited_performance_at) >= weekStart
    : false

  // Briefing visited today
  const briefingVisited = state?.visited_briefing_at
    ? state.visited_briefing_at.startsWith(todayStr)
    : false

  // Trade prepared today
  const tradePrepared = state?.trade_prepared_at
    ? state.trade_prepared_at.startsWith(todayStr)
    : false

  // Missed logic for daily steps:
  // - After 19:00 local time: end of current trading day
  // - Wednesday or later (dayOfWeek >= 3) after 12:00: late in the week,
  //   step from earlier in the day is effectively missed
  const isLateDay = localHour >= 19
  const isLaterInWeek = localDayOfWeek >= 3 && localHour >= 12
  const isMissedDaily = isLateDay || isLaterInWeek

  const steps = [
    {
      id: 'wochenvorbereitung',
      label: 'Wochenvorbereitung',
      description: 'Märkte analysieren, Woche planen',
      category: 'weekly' as const,
      href: '/wochenvorbereitung',
      done: !!weeklyPlan,
      missed: false,
    },
    {
      id: 'kalender',
      label: 'Wirtschaftskalender prüfen',
      description: 'High-Impact Events für deine Assets prüfen',
      category: 'daily' as const,
      href: '/kalender',
      done: kalenderVisited,
      missed: !kalenderVisited && isMissedDaily,
      calendarWarning,
    },
    {
      id: 'briefing',
      label: 'Morning Briefing',
      description: 'Tagesbriefing lesen oder generieren',
      category: 'daily' as const,
      href: '/wochenvorbereitung',
      done: briefingVisited,
      missed: !briefingVisited && isMissedDaily,
    },
    {
      id: 'tagesplan',
      label: 'Tagesplan erstellen',
      description: 'Konkreten Plan für den Tag anlegen',
      category: 'daily' as const,
      href: '/tagesplan',
      done: !!dailyPlan,
      missed: !dailyPlan && isMissedDaily,
    },
    {
      id: 'trade_prepared',
      label: 'Trade vorbereiten',
      description: 'Setup prüfen, Tradingplan-Checkliste abhaken',
      category: 'per_trade' as const,
      href: null,
      done: tradePrepared,
      missed: false,
    },
    {
      id: 'trade_logged',
      label: 'Trade loggen',
      description: 'Eintrag im Journal anlegen',
      category: 'per_trade' as const,
      href: '/journal',
      done: tradesToday.length > 0,
      missed: false,
    },
    {
      id: 'trade_analyzed',
      label: 'Trade analysieren',
      description: 'KI-Analyse für den Trade starten',
      category: 'per_trade' as const,
      href: '/journal',
      done: tradeAnalyzed,
      missed: false,
    },
    {
      id: 'wochen_review',
      label: 'Wochen-Review',
      description: 'Performance der Woche auswerten',
      category: 'weekly_end' as const,
      href: '/performance',
      done: perfVisited,
      missed: false,
    },
  ]

  const doneCount = steps.filter(s => s.done).length

  return NextResponse.json({
    steps,
    total: steps.length,
    done_count: doneCount,
    week_iso: weekIso,
  })
}
