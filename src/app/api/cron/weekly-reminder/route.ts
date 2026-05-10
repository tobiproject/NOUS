import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export async function GET(req: NextRequest) {
  // Protect from unauthorized calls — Vercel sends Authorization header with CRON_SECRET
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Set VAPID details lazily so missing env vars don't crash module evaluation
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

  // Get all users with notifications enabled
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('user_id, push_enabled, push_subscription, email_enabled, email_address, weekly_prep_time, notification_timezone')
    .or('push_enabled.eq.true,email_enabled.eq.true')

  if (!settings?.length) return NextResponse.json({ sent: 0 })

  // Only send to users whose preferred local time matches the current UTC time
  const now = new Date()
  const dueSettings = settings.filter(s => {
    const tz = s.notification_timezone ?? 'UTC'
    const preferredHour = parseInt((s.weekly_prep_time ?? '09:00').split(':')[0], 10)
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(now)
      const localHour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
      return localHour === preferredHour
    } catch {
      return now.getUTCHours() === preferredHour
    }
  })
  if (!dueSettings.length) return NextResponse.json({ sent: 0, skipped: settings.length })

  const kw = getISOWeek(new Date())
  const nextKw = kw + 1
  const dayName = new Date().getDay() === 6 ? 'Samstag' : 'Sonntag'

  const payload = JSON.stringify({
    title: `📊 NOUS — Wochenvorbereitung KW ${nextKw}`,
    body: `${dayName}: Bereite dich jetzt auf die Handelswoche vor. Setze deine Ziele, analysiere die letzte Woche und plane deine Fokus-Assets.`,
    url: '/wochenvorbereitung',
    tag: `weekly-prep-kw${nextKw}`,
  })

  let pushSent = 0
  let emailSent = 0

  for (const s of dueSettings) {
    // Push notification
    if (s.push_enabled && s.push_subscription) {
      try {
        await webpush.sendNotification(s.push_subscription as webpush.PushSubscription, payload)
        pushSent++
      } catch (err: unknown) {
        // Subscription expired — clean it up
        if ((err as { statusCode?: number }).statusCode === 410) {
          await supabase
            .from('notification_settings')
            .update({ push_enabled: false, push_subscription: null })
            .eq('user_id', s.user_id)
        }
      }
    }

    // Email notification
    if (s.email_enabled && s.email_address && process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.NOUS_FROM_EMAIL ?? 'NOUS <notifications@nous.trading>',
            to: s.email_address,
            subject: `📊 Wochenvorbereitung KW ${nextKw} — bereit für die neue Woche?`,
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; background: #0f1117; color: #e2e8f0; padding: 32px; border-radius: 12px;">
                <h1 style="font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 8px;">NOUS — KW ${nextKw}</h1>
                <p style="color: #94a3b8; margin: 0 0 24px; font-size: 14px;">Es ist ${dayName} — Zeit für die Wochenvorbereitung.</p>
                <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                  Nimm dir 10–15 Minuten, um die letzte Woche zu reflektieren, deine Fokus-Assets für KW ${nextKw} festzulegen und deine Wochenziele zu definieren.
                </p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://nous.trading'}/wochenvorbereitung"
                   style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #2962ff; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Wochenvorbereitung starten →
                </a>
                <p style="margin-top: 32px; font-size: 12px; color: #475569;">
                  Du erhältst diese E-Mail, weil du Benachrichtigungen in NOUS aktiviert hast.
                </p>
              </div>
            `,
          }),
        })
        emailSent++
      } catch {
        // Email send failed — continue
      }
    }
  }

  return NextResponse.json({ sent: pushSent + emailSent, push: pushSent, email: emailSent })
}
