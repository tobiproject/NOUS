import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vapidEmail = process.env.VAPID_EMAIL
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (vapidEmail && vapidPublic && vapidPrivate) {
    const subject = vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`
    webpush.setVapidDetails(subject, vapidPublic, vapidPrivate)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get due reminders joined with push subscriptions
  const { data: reminders } = await supabase
    .from('trade_analysis_reminders')
    .select('id, user_id, trade_id, asset, direction, notification_settings(push_enabled, push_subscription)')
    .lte('due_at', new Date().toISOString())
    .is('sent_at', null)
    .limit(100)

  if (!reminders?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const reminder of reminders) {
    const ns = Array.isArray(reminder.notification_settings)
      ? reminder.notification_settings[0]
      : reminder.notification_settings

    if (!ns?.push_enabled || !ns?.push_subscription || !vapidPublic) continue

    const dirIcon = reminder.direction === 'long' ? '↗' : '↘'
    const payload = JSON.stringify({
      title: `📊 Trade analysieren — ${reminder.asset}`,
      body: `${dirIcon} ${reminder.asset} — Zeit für deine Nachanalyse. Was lief gut, was würdest du anders machen?`,
      url: `/journal?highlight=${reminder.trade_id}`,
      tag: `analysis-reminder-${reminder.trade_id}`,
    })

    try {
      await webpush.sendNotification(ns.push_subscription as webpush.PushSubscription, payload)
      await supabase
        .from('trade_analysis_reminders')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', reminder.id)
      sent++
    } catch (err: unknown) {
      if ((err as { statusCode?: number }).statusCode === 410) {
        await supabase
          .from('notification_settings')
          .update({ push_enabled: false, push_subscription: null })
          .eq('user_id', reminder.user_id)
      }
    }
  }

  // Clean up old sent reminders (older than 7 days)
  await supabase
    .from('trade_analysis_reminders')
    .delete()
    .not('sent_at', 'is', null)
    .lt('sent_at', new Date(Date.now() - 7 * 24 * 3600_000).toISOString())

  return NextResponse.json({ sent })
}
