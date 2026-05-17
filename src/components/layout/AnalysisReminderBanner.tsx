'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import Link from 'next/link'

export interface AnalysisReminder {
  tradeId: string
  asset: string
  direction: string
  dueAt: string // ISO string
}

const STORAGE_KEY = 'nous-analysis-reminders'

export function loadReminders(): AnalysisReminder[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addReminder(reminder: AnalysisReminder) {
  const all = loadReminders()
  const filtered = all.filter(r => r.tradeId !== reminder.tradeId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...filtered, reminder]))
}

export function dismissReminder(tradeId: string) {
  const all = loadReminders().filter(r => r.tradeId !== tradeId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  // Also remove from DB so no duplicate push is sent
  fetch('/api/notifications/analysis-reminder', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tradeId }),
  }).catch(() => {})
}

export function AnalysisReminderBanner() {
  const [dueReminders, setDueReminders] = useState<AnalysisReminder[]>([])

  useEffect(() => {
    const check = () => {
      const now = new Date().toISOString()
      const due = loadReminders().filter(r => r.dueAt <= now)
      setDueReminders(due)
    }
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Client-side push via Service Worker setTimeout — fires when browser is open.
  // Covers the gap when cron hasn't run yet (cron runs 3×/day as fallback).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const pending = loadReminders()
    const now = Date.now()
    const timers: ReturnType<typeof setTimeout>[] = []

    pending.forEach(reminder => {
      const delayMs = new Date(reminder.dueAt).getTime() - now
      if (delayMs <= 0 || delayMs > 24 * 3600_000) return

      const t = setTimeout(async () => {
        try {
          const reg = await navigator.serviceWorker.ready
          const dirIcon = reminder.direction === 'long' ? '↗' : '↘'
          await reg.showNotification(`📊 Trade analysieren — ${reminder.asset}`, {
            body: `${dirIcon} ${reminder.asset} — Zeit für deine Nachanalyse. Was lief gut, was würdest du anders machen?`,
            icon: '/icons/icon-192x192.png',
            tag: `analysis-${reminder.tradeId}`,
            data: { url: `/journal?highlight=${reminder.tradeId}` },
          } as NotificationOptions)
        } catch {}
      }, delayMs)

      timers.push(t)
    })

    return () => timers.forEach(clearTimeout)
  }, [])

  if (dueReminders.length === 0) return null

  return (
    <div className="fixed bottom-4 left-60 z-40 flex flex-col gap-2" style={{ maxWidth: 360 }}>
      {dueReminders.map(r => (
        <div
          key={r.tradeId}
          className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
          style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--brand-blue)',
          }}
        >
          <Bell className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-blue)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: 'var(--fg-1)' }}>
              Trade analysieren
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>
              {r.direction === 'long' ? '↗' : '↘'} {r.asset} — Nachanalyse fällig
            </p>
          </div>
          <Link
            href={`/journal?highlight=${r.tradeId}`}
            className="text-xs font-semibold shrink-0"
            style={{ color: 'var(--brand-blue)' }}
            onClick={() => {
              dismissReminder(r.tradeId)
              setDueReminders(prev => prev.filter(x => x.tradeId !== r.tradeId))
            }}
          >
            Öffnen
          </Link>
          <button
            onClick={() => {
              dismissReminder(r.tradeId)
              setDueReminders(prev => prev.filter(x => x.tradeId !== r.tradeId))
            }}
          >
            <X className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
          </button>
        </div>
      ))}
    </div>
  )
}
