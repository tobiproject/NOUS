'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Newspaper } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useAccountContext } from '@/contexts/AccountContext'

interface NewsStats {
  withNews: { count: number; winrate: number; avgPnl: number }
  withoutNews: { count: number; winrate: number; avgPnl: number }
  byImpact: { level: string; count: number; winrate: number; avgPnl: number }[]
  byTiming: { label: string; minutes: number; count: number; avgPnl: number }[]
}

const TIMING_LABELS: Record<number, string> = {
  [-60]: '-60 min',
  [-30]: '-30 min',
  [-15]: '-15 min',
  [0]: 'Während',
  [15]: '+15 min',
  [30]: '+30 min',
}

const IMPACT_COLORS: Record<string, string> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#34d399',
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function NewsAnalyseTab() {
  const { activeAccount } = useAccountContext()
  const [stats, setStats] = useState<NewsStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newsCount, setNewsCount] = useState(0)

  const load = useCallback(async () => {
    if (!activeAccount) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/news-stats?account_id=${activeAccount.id}`)
      if (!res.ok) return
      const data = await res.json()
      setStats(data.stats)
      setNewsCount(data.newsCount)
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount])

  useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    )
  }

  if (newsCount < 5) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center border border-dashed border-border/60 rounded-lg">
        <Newspaper className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Zu wenig News-Daten</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tagge mindestens 5 Trades mit News-Events für die Analyse.<br />
            Aktuell: {newsCount} News-Trade{newsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const timingData = stats.byTiming.map(t => ({
    ...t,
    label: TIMING_LABELS[t.minutes] ?? `${t.minutes} min`,
  }))

  return (
    <div className="space-y-4">
      {/* News vs. kein News */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">News vs. kein News-Event</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-400 flex items-center gap-1">
                <Newspaper className="h-3 w-3" /> Mit News ({stats.withNews.count} Trades)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Winrate" value={`${stats.withNews.winrate.toFixed(0)}%`} />
                <StatCard
                  label="Ø P&L"
                  value={`${stats.withNews.avgPnl >= 0 ? '+' : ''}${stats.withNews.avgPnl.toFixed(0)}€`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Ohne News ({stats.withoutNews.count} Trades)</p>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Winrate" value={`${stats.withoutNews.winrate.toFixed(0)}%`} />
                <StatCard
                  label="Ø P&L"
                  value={`${stats.withoutNews.avgPnl >= 0 ? '+' : ''}${stats.withoutNews.avgPnl.toFixed(0)}€`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nach Impact-Level */}
      {stats.byImpact.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Performance nach Impact-Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {stats.byImpact.map(item => (
                <div key={item.level} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-2">
                  <Badge
                    variant="outline"
                    style={{ borderColor: IMPACT_COLORS[item.level], color: IMPACT_COLORS[item.level] }}
                    className="text-xs capitalize"
                  >
                    {item.level}
                  </Badge>
                  <span className="text-sm tabular-nums">{item.winrate.toFixed(0)}% WR</span>
                  <span className="text-xs text-muted-foreground">({item.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timing Balkendiagramm */}
      {timingData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ø P&L nach Timing</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={timingData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => { const n = Number(v); return [`${n >= 0 ? '+' : ''}${n.toFixed(0)}€`, 'Ø P&L'] }}
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
                />
                <Bar dataKey="avgPnl" radius={[4, 4, 0, 0]}>
                  {timingData.map((entry, i) => (
                    <Cell key={i} fill={entry.avgPnl >= 0 ? '#34d399' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
