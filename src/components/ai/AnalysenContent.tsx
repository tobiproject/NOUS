'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { PeriodAnalysisCard } from './PeriodAnalysisCard'
import { TradingRulesEditor } from './TradingRulesEditor'
import { useAiPeriodAnalysis, type PeriodAnalysis } from '@/hooks/useAiPeriodAnalysis'
import { getWeekRange, getMonthRange } from '@/lib/date-utils'

export function AnalysenContent() {
  const { fetchRecentAnalyses, triggerPeriodAnalysis, isTriggering, stopPolling } = useAiPeriodAnalysis()

  const [weeklyAnalyses, setWeeklyAnalyses] = useState<PeriodAnalysis[]>([])
  const [monthlyAnalyses, setMonthlyAnalyses] = useState<PeriodAnalysis[]>([])
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true)
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(true)

  const loadWeekly = useCallback(async () => {
    setIsLoadingWeekly(true)
    const data = await fetchRecentAnalyses('weekly', 8)
    setWeeklyAnalyses(data)
    setIsLoadingWeekly(false)
  }, [fetchRecentAnalyses])

  const loadMonthly = useCallback(async () => {
    setIsLoadingMonthly(true)
    const data = await fetchRecentAnalyses('monthly', 6)
    setMonthlyAnalyses(data)
    setIsLoadingMonthly(false)
  }, [fetchRecentAnalyses])

  useEffect(() => {
    loadWeekly()
    loadMonthly()
    return () => stopPolling()
  }, [loadWeekly, loadMonthly, stopPolling])

  const handleTriggerWeekly = async () => {
    const { start, end } = getWeekRange(0)
    await triggerPeriodAnalysis('weekly', start, end, (updated) => {
      setWeeklyAnalyses(prev => {
        const idx = prev.findIndex(a => a.id === updated.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next }
        return [updated, ...prev]
      })
    })
    // Optimistic placeholder
    await loadWeekly()
  }

  const handleTriggerMonthly = async () => {
    const { start, end } = getMonthRange(0)
    await triggerPeriodAnalysis('monthly', start, end, (updated) => {
      setMonthlyAnalyses(prev => {
        const idx = prev.findIndex(a => a.id === updated.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next }
        return [updated, ...prev]
      })
    })
    await loadMonthly()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analysen</h1>
        <p className="text-muted-foreground text-sm">KI-Wochen- und Monatsanalysen deiner Trading-Performance</p>
      </div>

      {/* Period Analyses */}
      <Tabs defaultValue="weekly">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="weekly">Woche</TabsTrigger>
            <TabsTrigger value="monthly">Monat</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <TabsContent value="weekly" className="m-0 p-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerWeekly}
                disabled={isTriggering}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
                Woche analysieren
              </Button>
            </TabsContent>
            <TabsContent value="monthly" className="m-0 p-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerMonthly}
                disabled={isTriggering}
                className="gap-1.5"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Monat analysieren
              </Button>
            </TabsContent>
          </div>
        </div>

        <TabsContent value="weekly" className="mt-0">
          {isLoadingWeekly ? (
            <div className="space-y-3">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          ) : weeklyAnalyses.length === 0 ? (
            <EmptyState
              type="weekly"
              onTrigger={handleTriggerWeekly}
              isTriggering={isTriggering}
            />
          ) : (
            <div className="space-y-4">
              {weeklyAnalyses.map(a => <PeriodAnalysisCard key={a.id} analysis={a} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="mt-0">
          {isLoadingMonthly ? (
            <div className="space-y-3">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          ) : monthlyAnalyses.length === 0 ? (
            <EmptyState
              type="monthly"
              onTrigger={handleTriggerMonthly}
              isTriggering={isTriggering}
            />
          ) : (
            <div className="space-y-4">
              {monthlyAnalyses.map(a => <PeriodAnalysisCard key={a.id} analysis={a} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Trading Rules Editor */}
      <TradingRulesEditor />
    </div>
  )
}

function EmptyState({
  type,
  onTrigger,
  isTriggering,
}: {
  type: 'weekly' | 'monthly'
  onTrigger: () => void
  isTriggering: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center border border-dashed border-border/60 rounded-lg">
      <CalendarDays className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="font-medium">Keine {type === 'weekly' ? 'Wochenanalysen' : 'Monatsanalysen'} vorhanden</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Starte die erste {type === 'weekly' ? 'Wochenanalyse' : 'Monatsanalyse'} für den aktuellen Zeitraum
        </p>
      </div>
      <Button onClick={onTrigger} disabled={isTriggering} className="gap-2">
        <RefreshCw className={`h-4 w-4 ${isTriggering ? 'animate-spin' : ''}`} />
        {type === 'weekly' ? 'Wochenanalyse erstellen' : 'Monatsanalyse erstellen'}
      </Button>
    </div>
  )
}
