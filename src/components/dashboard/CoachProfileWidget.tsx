'use client'

import { useEffect, useState, useCallback } from 'react'
import { Brain, RefreshCw, TrendingUp, TrendingDown, Lightbulb, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    return (
      <Card className="border-border/60 animate-pulse">
        <CardContent className="p-5 h-24" />
      </Card>
    )
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-indigo-400" />
            Dein Coach-Profil
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={handleUpdate}
            disabled={updating}
          >
            <RefreshCw className={`h-3 w-3 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Analysiert…' : 'Aktualisieren'}
          </Button>
        </div>
        {updatedAt && (
          <p className="text-xs text-muted-foreground -mt-1">
            Basierend auf {profile?.trades_analyzed} Trades · {updatedAt}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 rounded px-3 py-2">{error}</p>
        )}

        {!profile ? (
          <div className="text-center py-6">
            <Brain className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground mb-3">
              Noch kein Profil vorhanden. Mit mindestens 5 Trades kann der Coach dein Muster analysieren.
            </p>
            <Button size="sm" variant="outline" onClick={handleUpdate} disabled={updating}>
              {updating ? 'Analysiert…' : 'Jetzt analysieren'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {profile.trading_style && (
              <div className="rounded-md p-3" style={{ background: 'var(--surface-2)' }}>
                <p className="text-xs text-muted-foreground mb-0.5">Trader-Typ</p>
                <p className="text-sm font-medium">{profile.trading_style}</p>
              </div>
            )}

            {profile.coaching_focus && (
              <div className="rounded-md p-3 border" style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="h-3.5 w-3.5 text-indigo-400" />
                  <p className="text-xs font-medium text-indigo-400">Coaching-Fokus</p>
                </div>
                <p className="text-sm">{profile.coaching_focus}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.strengths?.length ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-xs font-medium text-emerald-400">Stärken</p>
                  </div>
                  <ul className="space-y-1">
                    {profile.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-emerald-400 shrink-0">+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {profile.weaknesses?.length ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    <p className="text-xs font-medium text-red-400">Schwächen</p>
                  </div>
                  <ul className="space-y-1">
                    {profile.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-red-400 shrink-0">−</span>
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
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                  <p className="text-xs font-medium text-amber-400">Beobachtete Muster</p>
                </div>
                <ul className="space-y-1">
                  {profile.key_patterns.map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-amber-400 shrink-0">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
