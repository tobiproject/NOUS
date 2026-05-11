import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export interface TradeHistoryEntry {
  event_date: string
  trade_id: string
  asset: string
  direction: string
  rr_ratio: number | null
  result_currency: number | null
  entry_time: string
}

export interface TradeStats {
  total: number
  wins: number
  losses: number
  win_rate: number | null  // null = not enough data with rr_ratio
  avg_rr: number | null
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const title = req.nextUrl.searchParams.get('title')
  const currency = req.nextUrl.searchParams.get('currency')

  if (!title || !currency) {
    return NextResponse.json({ error: 'title and currency required' }, { status: 400 })
  }

  // All past events of this exact event type
  const { data: pastEvents, error: eventsError } = await supabase
    .from('economic_events')
    .select('id, date, time_utc')
    .eq('title', title)
    .eq('currency', currency)
    .not('time_utc', 'is', null)
    .lt('date', new Date().toISOString().slice(0, 10))
    .order('date', { ascending: false })
    .limit(24) // up to 2 years of monthly events

  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 })
  if (!pastEvents || pastEvents.length === 0) {
    return NextResponse.json({ trades: [], stats: null })
  }

  // Single query for all user trades in the full date range (±60min window included)
  const windowMs = 60 * 60 * 1000
  const oldest = pastEvents[pastEvents.length - 1]
  const newest = pastEvents[0]
  const rangeFrom = new Date(new Date(oldest.date).getTime() - windowMs - 86400000).toISOString()
  const rangeTo = new Date(new Date(newest.date).getTime() + windowMs + 86400000).toISOString()

  const { data: userTrades, error: tradesError } = await supabase
    .from('trades')
    .select('id, asset, direction, rr_ratio, result_currency, traded_at')
    .eq('user_id', user.id)
    .gte('traded_at', rangeFrom)
    .lte('traded_at', rangeTo)

  if (tradesError) return NextResponse.json({ error: tradesError.message }, { status: 500 })

  // Match each trade to the nearest event within ±60min
  const matched: TradeHistoryEntry[] = []
  for (const event of pastEvents) {
    if (!event.time_utc) continue
    const eventTime = new Date(event.time_utc).getTime()
    const hits = (userTrades ?? []).filter(t => {
      const tradeTime = new Date(t.traded_at).getTime()
      return Math.abs(tradeTime - eventTime) <= windowMs
    })
    for (const t of hits) {
      matched.push({
        event_date: event.date,
        trade_id: t.id,
        asset: t.asset,
        direction: t.direction,
        rr_ratio: t.rr_ratio,
        result_currency: t.result_currency,
        entry_time: t.traded_at,
      })
    }
  }

  if (matched.length === 0) {
    return NextResponse.json({ trades: [], stats: null })
  }

  // Stats — only meaningful with ≥ 3 trades
  const withRR = matched.filter(t => t.rr_ratio !== null)
  const wins = withRR.filter(t => (t.rr_ratio ?? 0) > 0)
  const avgRR = withRR.length > 0
    ? Math.round((withRR.reduce((s, t) => s + (t.rr_ratio ?? 0), 0) / withRR.length) * 10) / 10
    : null

  const stats: TradeStats | null = matched.length >= 3 ? {
    total: matched.length,
    wins: wins.length,
    losses: withRR.length - wins.length,
    win_rate: withRR.length > 0 ? Math.round((wins.length / withRR.length) * 100) : null,
    avg_rr: avgRR,
  } : null

  return NextResponse.json({
    trades: matched.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()),
    stats,
  })
}
