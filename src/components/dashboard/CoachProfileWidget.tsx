'use client'

import { useEffect, useState, useCallback } from 'react'
import { Brain, RefreshCw, TrendingUp, TrendingDown, Lightbulb, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccountContext } from '@/contexts/AccountContext'

interface CoachProfile {
  trading_style?: string
  strengths?: string[]
  weaknesses?: string[]
  key_patterns?: string[]
  coaching_focus?: string
  raw_profile?: string
  trades_analyzed?: number
  last_updated_at?: string
}

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
} as const

export function CoachProfileWidget() {
  const { activeAccount } = useAccountContext()
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!activeAccount) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/coach-profile?account_id=${activeAccount.id}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [activeAccount])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleUpdate = async () => {
    if (!activeAccount) return
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/update-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: activeAccount.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Fehler beim Aktualisieren.')
        return
      }
      setProfile({ ...data.profile, trades_analyzed: data.trades_analyzed })
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setUpdating(false)
    }
  }

  const updatedAt = profile?.last_updated_at
    ? new Date(profile.last_updated_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  if (loading) {
    return <div className="rounded-xl animate-pulse h-24" style={glassCard} />
  }

  return (
    <div className="rounded-xl" style={glassCard}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--ai-purple)' }}
          >
            <Brain className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
              Dein Coach-Profil
            </div>
            {updatedAt && (
              <div className="eyebrow" style={{ color: 'var(--fg-4)', fontSize: '10px' }}>
                {profile?.trades_analyzed} Trades · {updatedAt}
              </div>
            )}
          </div>
        </div>
        <Button size="sm" variant="ai" className="h-7 px-2 text-xs gap-1" onClick={handleUpdate} disabled={updating}>
          <RefreshCw className={`h-3 w-3 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Analysiert…' : 'Aktualisieren'}
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#F23645', background: 'rgba(242,54,69,0.1)' }}>
            {error}
          </p>
        )}

        {!profile ? (
          <div className="text-center py-6">
            <Brain className="h-8 w-8 mx-auto mb-3 opacity-20" style={{ color: 'var(--ai-purple)' }} />
            <p className="text-sm mb-3" style={{ color: 'var(--fg-4)' }}>
              Noch kein Profil vorhanden. Mit mindestens 5 Trades kann der Coach dein Muster analysieren.
            </p>
            <Button size="sm" variant="ai" onClick={handleUpdate} disabled={updating}>
              {updating ? 'Analysiert…' : 'Jetzt analysieren'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {profile.trading_style && (
              <div
                className="rounded-lg p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="eyebrow mb-1" style={{ fontSize: '10px' }}>Trader-Typ</p>
                <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>{profile.trading_style}</p>
              </div>
            )}

            {profile.coaching_focus && (
              <div
                className="rounded-lg p-3"
                style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.06)' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="h-3.5 w-3.5" style={{ color: 'var(--ai-purple)' }} />
                  <p className="eyebrow" style={{ color: 'var(--ai-purple)', fontSize: '10px' }}>Coaching-Fokus</p>
                </div>
                <p className="text-sm" style={{ color: 'var(--fg-1)' }}>{profile.coaching_focus}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.strengths?.length ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--long)' }} />
                    <p className="eyebrow" style={{ color: 'var(--long)', fontSize: '10px' }}>Stärken</p>
                  </div>
                  <ul className="space-y-1">
                    {profile.strengths.map((s, i) => (
                      <li key={i} className="text-xs flex gap-1.5" style={{ color: 'var(--fg-2)' }}>
                        <span style={{ color: 'var(--long)' }} className="shrink-0">+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {profile.weaknesses?.length ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingDown className="h-3.5 w-3.5" style={{ color: 'var(--short)' }} />
                    <p className="eyebrow" style={{ color: 'var(--short)', fontSize: '10px' }}>Schwächen</p>
                  </div>
                  <ul className="space-y-1">
                    {profile.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs flex gap-1.5" style={{ color: 'var(--fg-2)' }}>
                        <span style={{ color: 'var(--short)' }} className="shrink-0">−</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {profile.key_patterns?.length ? (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="h-3.5 w-3.5" style={{ color: '#F59E0B' }} />
                  <p className="eyebrow" style={{ color: '#F59E0B', fontSize: '10px' }}>Beobachtete Muster</p>
                </div>
                <ul className="space-y-1">
                  {profile.key_patterns.map((p, i) => (
                    <li key={i} className="text-xs flex gap-1.5" style={{ color: 'var(--fg-2)' }}>
                      <span style={{ color: '#F59E0B' }} className="shrink-0">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
