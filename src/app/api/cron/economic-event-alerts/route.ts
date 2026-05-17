import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Runs every 30 minutes Mo–Fr during trading hours (07:00–22:00 UTC)
// Sends push alerts 30 minutes before High-Impact economic events
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  // Alert window: events between 25 and 35 minutes from now
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000).toISOString()

  // Find High-Impact events in the alert window
  const { data: upcomingEvents } = await supabase
    .from('economic_events')
    .select('id, title, currency, time_utc')
    .eq('impact', 'High')
    .gte('time_utc', windowStart)
    .lte('time_utc', windowEnd)

  if (!upcomingEvents || upcomingEvents.length === 0) {
    return NextResponse.json({ ok: true, alerts_sent: 0 })
  }

  // Find users with High-Impact alerts enabled and an active push subscription
  const { data: subscribers } = await supabase
    .from('notification_settings')
    .select('user_id, push_subscription')
    .eq('high_impact_alerts_enabled', true)
    .eq('push_enabled', true)
    .not('push_subscription', 'is', null)

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ ok: true, alerts_sent: 0 })
  }

  // Reuse existing push helper from PROJ-26 if available, otherwise use web-push
  // Build notification payload for each upcoming event
  const eventSummary = upcomingEvents
    .map(e => `${e.currency} ${e.title}`)
    .join(', ')

  const eventTime = upcomingEvents[0]?.time_utc
    ? new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(upcomingEvents[0].time_utc)) + ' UTC'
    : ''

  let alertsSent = 0

  for (const subscriber of subscribers) {
    if (!subscriber.push_subscription) continue
    try {
      // Call the existing push-send endpoint (reusing PROJ-26 infrastructure)
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'supabase.co')}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          subscription: subscriber.push_subscription,
          title: `⚡ High-Impact Event in 30min`,
          body: `${eventSummary}${eventTime ? ` — ${eventTime}` : ''}`,
          url: '/kalender',
          tag: 'economic-alert',
        }),
      })
      if (res.ok) alertsSent++
    } catch {
      // Skip failed sends — continue to next subscriber
    }
  }

  return NextResponse.json({ ok: true, alerts_sent: alertsSent, events: upcomingEvents.length })
}
