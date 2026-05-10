import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = req.nextUrl.searchParams.get('week_start') // 'YYYY-MM-DD'
  const weekEnd = req.nextUrl.searchParams.get('week_end')     // 'YYYY-MM-DD'

  if (!weekStart || !weekEnd) {
    return NextResponse.json({ error: 'week_start and week_end required' }, { status: 400 })
  }

  // Load events for the requested week
  const { data: events, error } = await supabase
    .from('economic_events')
    .select('*')
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date', { ascending: true })
    .order('time_utc', { ascending: true, nullsFirst: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Determine last fetch time
  const fetched_at = events?.length
    ? events.reduce((latest, e) =>
        e.last_fetched_at > latest ? e.last_fetched_at : latest,
        events[0].last_fetched_at
      )
    : null

  // Trade indicators: find trades within ±30min of each past event.
  // Single query fetching all user trades in the week window, then match client-side.
  const pastEventsWithTime = (events ?? []).filter(e => e.time_utc && new Date(e.time_utc) < new Date())

  let tradesByEventId: Record<string, {
    trade_id: string
    asset: string
    direction: string
    rr_ratio: number | null
    result_currency: number | null
    entry_time: string
  }> = {}

  if (pastEventsWithTime.length > 0) {
    const windowMs = 30 * 60 * 1000
    // Fetch all user trades for the entire week in one query
    const rangeFrom = new Date(new Date(weekStart).getTime() - windowMs).toISOString()
    const rangeTo = new Date(new Date(weekEnd).getTime() + windowMs + 86400000).toISOString()

    const { data: weekTrades } = await supabase
      .from('trades')
      .select('id, asset, direction, rr_ratio, result_currency, traded_at')
      .eq('user_id', user.id)
      .gte('traded_at', rangeFrom)
      .lte('traded_at', rangeTo)

    if (weekTrades && weekTrades.length > 0) {
      for (const event of pastEventsWithTime) {
        const eventTime = new Date(event.time_utc!).getTime()
        const match = weekTrades.find(t => {
          const tradeTime = new Date(t.traded_at).getTime()
          return Math.abs(tradeTime - eventTime) <= windowMs
        })
        if (match) {
          tradesByEventId[event.id] = {
            trade_id: match.id,
            asset: match.asset,
            direction: match.direction,
            rr_ratio: match.rr_ratio,
            result_currency: match.result_currency,
            entry_time: match.traded_at,
          }
        }
      }
    }
  }

  const enrichedEvents = (events ?? []).map(e => ({
    ...e,
    trade_indicator: tradesByEventId[e.id] ?? null,
  }))

  return NextResponse.json({
    events: enrichedEvents,
    week_start: weekStart,
    week_end: weekEnd,
    fetched_at,
  })
}
