'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, TrendingUp, Lightbulb, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiAnalysis, type TradeAnalysis } from '@/hooks/useAiAnalysis'

const CATEGORY_LABELS: Record<string, string> = {
  'Entry-Timing': 'Entry-Timing',
  'Setup-Qualität': 'Setup-Qualität',
  'Risk-Management': 'Risk-Management',
  'Emotionale Entscheidung': 'Emotionale Entscheidung',
  'News ignoriert': 'News ignoriert',
  'Regelverstoß': 'Regelverstoß',
}

function ScoreBar({ score }: { score: number }) {
  const color = score <= 4 ? 'bg-red-500' : score <= 7 ? 'bg-amber-500' : 'bg-emerald-500'
  const textColor = score <= 4 ? 'text-red-400' : score <= 7 ? 'text-amber-400' : 'text-emerald-400'
  return (
    <div className="flex items-center gap-3">
      <span className={`text-4xl font-bold tabular-nums ${textColor}`}>{score}</span>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Score</span>
          <span>/10</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score * 10}%` }} />
        </div>
      </div>
    </div>
  )
}

function StatusDisplay({ status, errorMessage }: { status: TradeAnalysis['status']; errorMessage?: string | null }) {
  if (status === 'pending' || status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Clock className="h-8 w-8 text-muted-foreground animate-pulse" />
        <div>
          <p className="font-medium">{status === 'pending' ? 'Analyse in Warteschlange…' : 'Analyse läuft…'}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Claude analysiert deinen Trade</p>
        </div>
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <XCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="font-medium">Analyse fehlgeschlagen</p>
          {errorMessage && <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>}
        </div>
      </div>
    )
  }
  return null
}

interface Props {
  tradeId: string
  accountId: string
  isActive: boolean
}

export function TradeAnalysisTab({ tradeId, accountId, isActive }: Props) {
  const { fetchAnalysis, triggerAnalysis, isTriggering, stopPolling } = useAiAnalysis()
  const [analysis, setAnalysis] = useState<TradeAnalysis | null | 'loading'>('loading')

  const load = useCallback(async () => {
    setAnalysis('loading')
    const data = await fetchAnalysis(tradeId)
    setAnalysis(data)

    // If pending/processing, start polling
    if (data && (data.status === 'pending' || data.status === 'processing')) {
      const intervalId = setInterval(async () => {
        const updated = await fetchAnalysis(tradeId)
        if (updated) {
          setAnalysis(updated)
          if (updated.status === 'completed' || updated.status === 'failed') {
            clearInterval(intervalId)
          }
        }
      }, 3000)
    }
  }, [fetchAnalysis, tradeId])

  const handleTrigger = useCallback(async () => {
    await triggerAnalysis(tradeId, (updated) => {
      setAnalysis(updated)
    })
    // Show pending state immediately
    setAnalysis(prev => prev && typeof prev !== 'string' ? { ...prev, status: 'pending' } : prev)
  }, [triggerAnalysis, tradeId])

  useEffect(() => {
    if (isActive) load()
    return () => stopPolling()
  }, [isActive, load, stopPolling])

  if (analysis === 'loading') {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    )
  }

  // No analysis yet — offer to start one
  if (!analysis) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Noch keine Analyse</p>
          <p className="text-sm text-muted-foreground mt-0.5">Starte die KI-Analyse für diesen Trade</p>
        </div>
        <Button onClick={handleTrigger} disabled={isTriggering} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isTriggering ? 'animate-spin' : ''}`} />
          Analyse starten
        </Button>
      </div>
    )
  }

  const isInProgress = analysis.status === 'pending' || analysis.status === 'processing'

  return (
    <div className="space-y-5">
      {/* Status + Re-analyze */}
      <div className="flex items-center justify-between">
        <StatusBadge status={analysis.status} />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTrigger}
          disabled={isTriggering || isInProgress}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
          Neu analysieren
        </Button>
      </div>

      {isInProgress && <StatusDisplay status={analysis.status} />}

      {analysis.status === 'failed' && (
        <StatusDisplay status="failed" errorMessage={analysis.error_message} />
      )}

      {analysis.status === 'completed' && analysis.score !== null && (
        <>
          {/* Score */}
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <ScoreBar score={analysis.score} />
          </div>

          {/* Summary */}
          {analysis.summary && (
            <div className="rounded-lg border border-border/60 bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Gesamturteil</p>
              <p className="text-sm leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Errors */}
          {analysis.errors && analysis.errors.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <p className="text-xs font-medium uppercase tracking-wide">Fehler ({analysis.errors.length})</p>
                </div>
                <div className="space-y-2">
                  {analysis.errors.map((err, i) => (
                    <div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
                      <Badge variant="outline" className="text-xs mb-1.5 border-amber-500/30 text-amber-400">
                        {CATEGORY_LABELS[err.category] ?? err.category}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{err.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Strengths */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs font-medium uppercase tracking-wide">Stärken ({analysis.strengths.length})</p>
                </div>
                <div className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <div key={i} className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Suggestions */}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Lightbulb className="h-4 w-4 text-blue-400" />
                  <p className="text-xs font-medium uppercase tracking-wide">Verbesserungen ({analysis.suggestions.length})</p>
                </div>
                <div className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-md border border-border/60 p-3">
                      <PriorityBadge priority={s.priority} />
                      <p className="text-sm text-muted-foreground flex-1">{s.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: TradeAnalysis['status'] }) {
  const map = {
    pending: { label: 'Ausstehend', className: 'bg-muted text-muted-foreground border-border' },
    processing: { label: 'Läuft…', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    completed: { label: 'Abgeschlossen', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    failed: { label: 'Fehlgeschlagen', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  }
  const { label, className } = map[status]
  return <Badge variant="outline" className={className}>{label}</Badge>
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const map = {
    high: { label: 'Hoch', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
    medium: { label: 'Mittel', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    low: { label: 'Niedrig', className: 'bg-muted text-muted-foreground border-border' },
  }
  const { label, className } = map[priority]
  return <Badge variant="outline" className={`text-xs shrink-0 ${className}`}>{label}</Badge>
}
