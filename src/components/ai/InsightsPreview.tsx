'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowRight, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiPeriodAnalysis, type PeriodAnalysis } from '@/hooks/useAiPeriodAnalysis'

function PnlBadge({ pnl }: { pnl: number }) {
  const color = pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-amber-400'
  const Icon = pnl > 0 ? TrendingUp : pnl < 0 ? TrendingDown : Minus
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}€
    </span>
  )
}

function AnalysisPreviewItem({ analysis }: { analysis: PeriodAnalysis }) {
  const r = analysis.full_response
  if (!r) return null
  const typeLabel = analysis.type === 'weekly' ? 'Woche' : 'Monat'
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">{typeLabel} {analysis.period_start}</Badge>
        <PnlBadge pnl={r.pnl} />
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.summary}</p>
      {r.focus_next_period && (
        <p className="text-xs text-blue-400 line-clamp-1">→ {r.focus_next_period}</p>
      )}
    </div>
  )
}

export function InsightsPreview() {
  const { fetchRecentAnalyses } = useAiPeriodAnalysis()
  const [analyses, setAnalyses] = useState<PeriodAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    const [weekly, monthly] = await Promise.all([
      fetchRecentAnalyses('weekly', 1),
      fetchRecentAnalyses('monthly', 1),
    ])
    // Show completed ones only, most recent first
    const combined = [...weekly, ...monthly]
      .filter(a => a.status === 'completed' && a.full_response)
      .sort((a, b) => b.period_start.localeCompare(a.period_start))
      .slice(0, 2)
    setAnalyses(combined)
    setIsLoading(false)
  }, [fetchRecentAnalyses])

  useEffect(() => { load() }, [load])

  if (!isLoading && analyses.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            KI-Insights
          </CardTitle>
          <Link
            href="/analysen"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            Alle Analysen
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </>
        ) : (
          analyses.map(a => <AnalysisPreviewItem key={a.id} analysis={a} />)
        )}
      </CardContent>
    </Card>
  )
}
