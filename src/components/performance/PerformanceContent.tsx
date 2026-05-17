'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAccountContext } from '@/contexts/AccountContext'
import { usePerformanceStats, type PerformanceStats, type StatsFilter } from '@/hooks/usePerformanceStats'
import { StatsFilterBar } from './StatsFilterBar'
import { KpiBlock } from './KpiBlock'
import { MonthlyPnlChart } from './MonthlyPnlChart'
import { WeeklyPnlChart } from './WeeklyPnlChart'
import { DayOfWeekChart } from './DayOfWeekChart'
import { WinrateCharts } from './WinrateCharts'
import { TradeHeatmap } from './TradeHeatmap'
import { DrawdownChart } from './DrawdownChart'
import { DrawdownPhaseTable } from './DrawdownPhaseTable'
import { NewsAnalyseTab } from './NewsAnalyseTab'
import { StandaloneRRSimulator } from './StandaloneRRSimulator'
import { RrrAnalyseTab } from './RrrAnalyseTab'
import { WorkflowVisitTracker } from '@/components/workflow/WorkflowVisitTracker'

// ─── URL serialisation ────────────────────────────────────────────────────────

function filterToParams(f: StatsFilter): URLSearchParams {
  const p = new URLSearchParams()
  if (f.dateFrom) p.set('from', f.dateFrom)
  if (f.dateTo) p.set('to', f.dateTo)
  if (f.assets?.length) p.set('assets', f.assets.join(','))
  if (f.strategies?.length) p.set('strategies', f.strategies.join(','))
  if (f.setupTypes?.length) p.set('setups', f.setupTypes.join(','))
  return p
}

function paramsToFilter(params: URLSearchParams): StatsFilter {
  const f: StatsFilter = {}
  const from = params.get('from'); if (from) f.dateFrom = from
  const to = params.get('to'); if (to) f.dateTo = to
  const assets = params.get('assets'); if (assets) f.assets = assets.split(',')
  const strategies = params.get('strategies'); if (strategies) f.strategies = strategies.split(',')
  const setups = params.get('setups'); if (setups) f.setupTypes = setups.split(',')
  return f
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PerformanceContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { activeAccount } = useAccountContext()
  const { fetchStats } = usePerformanceStats()

  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const filter = paramsToFilter(searchParams)

  const load = useCallback(async (f: StatsFilter) => {
    if (!activeAccount) return
    setIsLoading(true)
    try {
      const result = await fetchStats(f)
      setStats(result)
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount, fetchStats])

  useEffect(() => {
    load(filter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount, searchParams.toString()])

  function handleFilterChange(newFilter: StatsFilter) {
    const params = filterToParams(newFilter)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  if (!activeAccount) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance & Statistik</h1>
          <p className="text-muted-foreground text-sm">Kein aktives Konto</p>
        </div>
        <p className="text-muted-foreground text-sm border border-dashed border-border/60 rounded-lg p-8 text-center">
          Bitte wähle ein aktives Konto aus.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <WorkflowVisitTracker step="performance" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance & Statistik</h1>
        <p className="text-muted-foreground text-sm">Konto: {activeAccount.name}</p>
      </div>

      {/* Filter bar */}
      <StatsFilterBar
        filter={filter}
        availableAssets={stats?.availableAssets ?? []}
        availableStrategies={stats?.availableStrategies ?? []}
        availableSetupTypes={stats?.availableSetupTypes ?? []}
        onFilterChange={handleFilterChange}
      />

      {/* KPI block */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1,2,3,4,5,6,7,8,9,10].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : stats ? (
        <>
          <KpiBlock kpi={stats.kpi} />

          {/* Low data warning */}
          {stats.kpi.totalTrades < 20 && stats.kpi.totalTrades > 0 && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-400 text-sm">
                Für statistisch valide Aussagen werden mehr Trades empfohlen
                (aktuell {stats.kpi.totalTrades} {stats.kpi.totalTrades === 1 ? 'Trade' : 'Trades'} im Filter).
              </AlertDescription>
            </Alert>
          )}

          {stats.kpi.totalTrades === 0 && (
            <div className="border border-dashed border-border/60 rounded-lg p-10 text-center text-muted-foreground text-sm">
              Keine Trades für den gewählten Filter. Passe die Filter oben an.
            </div>
          )}
        </>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue={!isLoading && stats && stats.kpi.totalTrades > 0 ? "overview" : "simulator"}>
        <div className="overflow-x-auto -mx-1 px-1 mb-4">
        <TabsList className="w-max min-w-full">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="winrate">Winrate</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
          <TabsTrigger value="rrr">RRR-Analyse</TabsTrigger>
          <TabsTrigger value="news">News-Analyse</TabsTrigger>
          <TabsTrigger value="simulator">RR-Simulator</TabsTrigger>
        </TabsList>
        </div>

        {!isLoading && stats && stats.kpi.totalTrades > 0 ? (
          <>
            <TabsContent value="overview" className="space-y-4 mt-0">
              <MonthlyPnlChart data={stats.monthly} />
              <WeeklyPnlChart data={stats.weekly} />
              <DayOfWeekChart data={stats.dayOfWeek} />
            </TabsContent>

            <TabsContent value="winrate" className="mt-0">
              <WinrateCharts
                byAsset={stats.winrateByAsset}
                bySetup={stats.winrateBySetup}
                byStrategy={stats.winrateByStrategy}
              />
            </TabsContent>

            <TabsContent value="heatmap" className="mt-0">
              <TradeHeatmap cells={stats.heatmap} />
            </TabsContent>

            <TabsContent value="drawdown" className="space-y-4 mt-0">
              <DrawdownChart
                data={stats.drawdownCurve}
                currentDrawdown={stats.currentDrawdownPct}
              />
              <DrawdownPhaseTable phases={stats.drawdownPhases} />
            </TabsContent>

            <TabsContent value="rrr" className="mt-0">
              <RrrAnalyseTab trades={stats.trades} />
            </TabsContent>

            <TabsContent value="news" className="mt-0">
              <NewsAnalyseTab />
            </TabsContent>
          </>
        ) : null}

        <TabsContent value="simulator" className="mt-0">
          <StandaloneRRSimulator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
