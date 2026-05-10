'use client'

import { useEffect, useState, useRef } from 'react'
import { Clock } from 'lucide-react'
import type { EconomicEvent } from '@/types/calendar'
import { isToday } from 'date-fns'
import { parseISO } from 'date-fns'

interface Props {
  events: EconomicEvent[]
  onScrollToEvent: (eventId: string) => void
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`
  }
  if (minutes > 0) {
    return `${minutes}min ${seconds.toString().padStart(2, '0')}s`
  }
  return `${seconds}s`
}

export function CountdownBanner({ events, onScrollToEvent }: Props) {
  const [countdown, setCountdown] = useState<string | null>(null)
  const [nextEvent, setNextEvent] = useState<EconomicEvent | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const findNextHighImpact = () => {
      const now = new Date()
      const upcoming = events.filter(e => {
        if (e.impact !== 'High') return false
        if (!e.time_utc) return false
        if (!isToday(parseISO(e.date))) return false
        return new Date(e.time_utc) > now
      })
      upcoming.sort((a, b) =>
        new Date(a.time_utc!).getTime() - new Date(b.time_utc!).getTime()
      )
      return upcoming[0] ?? null
    }

    const tick = () => {
      const next = findNextHighImpact()
      setNextEvent(next)
      if (!next?.time_utc) {
        setCountdown(null)
        return
      }
      const ms = new Date(next.time_utc).getTime() - Date.now()
      if (ms <= 0) {
        setCountdown(null)
        return
      }
      setCountdown(formatCountdown(ms))
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [events])

  if (!nextEvent || !countdown) return null

  return (
    <button
      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-opacity hover:opacity-90"
      style={{
        background: 'rgba(242,54,69,0.08)',
        border: '1px solid rgba(242,54,69,0.25)',
      }}
      onClick={() => onScrollToEvent(nextEvent.id)}
    >
      <Clock size={13} style={{ color: 'var(--short)', flexShrink: 0 }} />
      <span className="text-xs" style={{ color: 'var(--fg-2)' }}>
        Nächstes High-Impact Event:&nbsp;
        <strong style={{ color: 'var(--fg-1)' }}>
          {nextEvent.currency} {nextEvent.title}
        </strong>
        &nbsp;in&nbsp;
        <strong style={{ color: 'var(--short)' }}>{countdown}</strong>
      </span>
    </button>
  )
}
