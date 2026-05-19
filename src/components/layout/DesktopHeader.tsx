'use client'

import { useState, useEffect } from 'react'
import { Clock, Search, PlusCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export function DesktopHeader() {
  const { user } = useAuth()
  const [time, setTime] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
      setDateStr(now.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }))
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setDisplayName(d.display_name ?? null)
        setAvatarUrl(d.avatar_url ?? null)
      })
      .catch(() => {})
  }, [])

  const initial = (displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  return (
    <header
      className="hidden lg:flex items-center justify-between px-5 shrink-0"
      style={{
        height: 52,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.01)',
      }}
    >
      {/* Left: Quick actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/journal"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'rgba(255,130,16,0.07)',
            border: '1px solid rgba(255,130,16,0.25)',
            color: '#ff8210',
          }}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Neuer Trade
        </Link>
        <Link
          href="/kalender"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Kalender
        </Link>
        <Link
          href="/wochenvorbereitung"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Wochenvorbereitung
        </Link>
      </div>

      {/* Center: Time + Search */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <span className="num text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{time}</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{dateStr}</span>
        </div>

        <div
          className="relative flex items-center"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
          }}
        >
          <Search className="absolute left-2.5 h-3.5 w-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.25)' }} />
          <input
            type="text"
            placeholder="Suchen…"
            className="h-8 pl-8 pr-4 bg-transparent text-xs outline-none w-48"
            style={{ color: 'rgba(255,255,255,0.7)', caretColor: '#ff8210' }}
          />
        </div>
      </div>

      {/* Right: Settings + Avatar */}
      <div className="flex items-center gap-2">
        <Link
          href="/einstellungen"
          className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>
        <div
          className="flex items-center justify-center overflow-hidden shrink-0"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: avatarUrl ? 'transparent' : 'rgba(255,130,16,0.15)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatarUrl} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
            : initial}
        </div>
      </div>
    </header>
  )
}
