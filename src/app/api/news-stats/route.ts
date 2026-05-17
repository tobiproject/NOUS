import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface TradeStat {
  outcome: string | null
  result_currency: number | null
  news_event_present: boolean | null
  news_impact_level: string | null
  news_timing_minutes: number | null
}

function winrate(trades: TradeStat[]): number {
  const decided = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  if (!decided.length) return 0
  return (decided.filter(t => t.outcome === 'win').length / decided.length) * 100
}

function avgPnl(trades: TradeStat[]): number {
  if (!trades.length) return 0
  const sum = trades.reduce((acc, t) => acc + (t.result_currency ?? 0), 0)
  return sum / trades.length
}

const TIMING_BUCKETS = [-60, -30, -15, 0, 15, 30] as const

function timingBucket(minutes: number): number {
  // Map minutes to nearest defined bucket
  const sorted = [...TIMING_BUCKETS].sort((a, b) => Math.abs(a - minutes) - Math.abs(b - minutes))
  return sorted[0]
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  // Fetch all completed trades for this account
  const { data: trades, error } = await supabase
    .from('trades')
    .select('outcome, result_currency, news_event_present, news_impact_level, news_timing_minutes')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .not('outcome', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!trades) return NextResponse.json({ stats: null, newsCount: 0 })

  const newsTrades = trades.filter(t => t.news_event_present === true)
  const noNewsTrades = trades.filter(t => t.news_event_present === false || t.news_event_present === null)

  const newsCount = newsTrades.length

  if (newsCount < 5) {
    return NextResponse.json({ stats: null, newsCount })
  }

  // By impact level
  const impactMap: Record<string, TradeStat[]> = {}
  for (const t of newsTrades) {
    if (!t.news_impact_level) continue
    if (!impactMap[t.news_impact_level]) impactMap[t.news_impact_level] = []
    impactMap[t.news_impact_level].push(t)
  }
  const byImpact = Object.entries(impactMap).map(([level, ts]) => ({
    level,
    count: ts.length,
    winrate: winrate(ts),
    avgPnl: avgPnl(ts),
  }))

  // By timing bucket
  const timingMap: Record<number, TradeStat[]> = {}
  for (const t of newsTrades) {
    if (t.news_timing_minutes === null || t.news_timing_minutes === undefined) continue
    const bucket = timingBucket(t.news_timing_minutes)
    if (!timingMap[bucket]) timingMap[bucket] = []
    timingMap[bucket].push(t)
  }
  const byTiming = Object.entries(timingMap)
    .map(([min, ts]) => ({
      minutes: Number(min),
      label: String(min),
      count: ts.length,
      avgPnl: avgPnl(ts),
    }))
    .sort((a, b) => a.minutes - b.minutes)

  return NextResponse.json({
    newsCount,
    stats: {
      withNews: {
        count: newsTrades.length,
        winrate: winrate(newsTrades),
        avgPnl: avgPnl(newsTrades),
      },
      withoutNews: {
        count: noNewsTrades.length,
        winrate: winrate(noNewsTrades),
        avgPnl: avgPnl(noNewsTrades),
      },
      byImpact,
      byTiming,
    },
  })
}
