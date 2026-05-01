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
