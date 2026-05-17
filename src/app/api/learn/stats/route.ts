import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Quizzes this week (Mon–Sun)
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1 // 0=Mon
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - dayOfWeek)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const [sessionsWeek, sessionsAll, answers30d, coachCount, activityRows] = await Promise.all([
    supabase
      .from('quiz_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .gte('started_at', weekStartStr),

    supabase
      .from('quiz_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('user_id', user.id),

    supabase
      .from('quiz_answers')
      .select('good_entry, trade_id')
      .eq('account_id', accountId)
      .gte('answered_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

    supabase
      .from('coach_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('user_id', user.id),

    supabase
      .from('learn_activity')
      .select('activity_date')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .order('activity_date', { ascending: false })
      .limit(60),
  ])

  // Calculate match rate from last 30 days answers
  let matchRateLast30: number | null = null
  if (answers30d.data && answers30d.data.length > 0) {
    // We need trade outcomes to compute match rate — join inline
    const tradeIds = [...new Set(answers30d.data.map(a => a.trade_id))]
    const { data: trades } = await supabase
      .from('trades')
      .select('id, outcome')
      .in('id', tradeIds)

    const outcomeMap = new Map(trades?.map(t => [t.id, t.outcome]) ?? [])
    let correct = 0
    for (const ans of answers30d.data) {
      const outcome = outcomeMap.get(ans.trade_id)
      if (
        (ans.good_entry === 'yes' && outcome === 'win') ||
        (ans.good_entry === 'no' && outcome === 'loss') ||
        ans.good_entry === 'unsure'
      ) {
        correct++
      }
    }
    matchRateLast30 = correct / answers30d.data.length
  }

  // Calculate streak: consecutive days with any learning activity
  const activityDates = new Set(
    (activityRows.data ?? []).map(r => r.activity_date)
  )

  let streak = 0
  const check = new Date(today)
  // Streak allows up to 1 day gap (weekend-tolerant: 2-day gap resets)
  let consecutiveMisses = 0
  for (let i = 0; i < 60; i++) {
    const dateStr = check.toISOString().split('T')[0]
    if (activityDates.has(dateStr)) {
      streak++
      consecutiveMisses = 0
    } else {
      consecutiveMisses++
      if (consecutiveMisses >= 2) break
    }
    check.setDate(check.getDate() - 1)
  }

  return NextResponse.json({
    streak,
    quizzesThisWeek: sessionsWeek.count ?? 0,
    matchRateLast30,
    coachConversations: coachCount.count ?? 0,
    totalQuizzes: sessionsAll.count ?? 0,
  })
}
