'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccountContext } from '@/contexts/AccountContext'
import { useDashboardMetrics, type DashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useRiskAlerts, type RiskAlert } from '@/hooks/useRiskAlerts'
import { RiskAlertBanner } from '@/components/risk/RiskAlertBanner'
import { DashboardTabs } from './DashboardTabs'
import { InsightsPreview } from '@/components/ai/InsightsPreview'
import { DailyPlanCTA } from '@/components/tagesplan/DailyPlanCTA'
import { WeeklyPrepCard } from './WeeklyPrepCard'
import { GuidedWorkflowWidget } from './GuidedWorkflowWidget'
import { CoachProfileWidget } from './CoachProfileWidget'
import { TradeDetailSheet } from '@/components/journal/TradeDetailSheet'
import type { Trade } from '@/hooks/useTrades'

export function DashboardContent() {
  const { activeAccount, isLoading: accountLoading } = useAccountContext()
  const { fetchMetrics } = useDashboardMetrics()
  const { fetchTodayAlerts, dismissAlert } = useRiskAlerts()

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => setDisplayName(d.display_name ?? null))
  }, [])

  const load = useCallback(async () => {
    if (!activeAccount) return
    setIsLoading(true)
    try {
      const [m, a] = await Promise.all([
        fetchMetrics(null),
        fetchTodayAlerts(),
      ])
      setMetrics(m)
      setAlerts(a)
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount, fetchMetrics, fetchTodayAlerts])

  useEffect(() => {
    load()
  }, [load])

  const handleDismiss = async (id: string) => {
    await dismissAlert(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const handleTradeClick = (trade: Trade) => {
    setSelectedTrade(trade)
    setDetailOpen(true)
  }

  if (accountLoading) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    )
  }

  if (!activeAccount) {
    return (
      <div className="space-y-6">
        <div>
          <div className="eyebrow mb-1">Dashboard</div>
          <h1 className="text-2xl font-bold tracking-tight">Kein aktives Konto</h1>
        </div>
        <p className="text-sm p-8 text-center rounded-lg" style={{ color: 'var(--fg-3)', border: '1px dashed var(--border-raw)' }}>
          Bitte wähle ein aktives Konto aus, um dein Dashboard zu sehen.
        </p>
      </div>
    )
  }

  const now = new Date()
  const greetingBase = now.getHours() < 12 ? 'Guten Morgen' : now.getHours() < 18 ? 'Guten Tag' : 'Guten Abend'
  const greeting = displayName ? `${greetingBase}, ${displayName}` : greetingBase

  const h = now.getHours()
  const taglines =
    h >= 5  && h < 9  ? ['Kaffee zuerst.', 'Märkte öffnen bald.', 'Frischer Start.', 'Langsam anlaufen.', 'Früh wach, früh dabei.'] :
    h >= 9  && h < 12 ? ['London läuft.', 'Was zeigen die Charts?', 'Setups scannen.', 'Frischer Kopf, frische Setups.', 'NY öffnet gleich.'] :
    h >= 12 && h < 14 ? ['Mittagspause verdient?', 'NY öffnet gleich.', 'Kurze Pause, dann weiter.', 'Wie läuft\'s bisher?', 'Halbe Zeit vorbei.'] :
    h >= 14 && h < 18 ? ['NY Session läuft.', 'Charts im Blick.', 'Fokus bis Schluss.', 'Hauptzeit des Tages.', 'Noch ein paar Stunden.'] :
    h >= 18 && h < 22 ? ['Zeit für den Recap.', 'Wie war dein Tag?', 'Trades des Tages?', 'Analyse, dann Feierabend.', 'Heute viel gelernt?'] :
                        ['Asia Session läuft.', 'Spät unterwegs?', 'Nachtschicht.', 'Ruhige Zeit.', 'Morgen wieder frisch.']
  const tagline = taglines[(now.getDate() + now.getMonth()) % taglines.length]

  return (
    <>
      <div className="space-y-5">
        {/* Greeting */}
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow mb-1" style={{ color: 'var(--fg-3)', letterSpacing: '0.08em' }}>{now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h1 className="text-3xl font-bold tracking-tight">
              {greeting}.
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
              {tagline} · {activeAccount.name}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <RiskAlertBanner alerts={alerts} onDismiss={handleDismiss} />
        )}

        {/* Tab-driven KPIs, chart, strategy, trades */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <Skeleton className="h-72 rounded-lg lg:col-span-3" />
              <Skeleton className="h-72 rounded-lg lg:col-span-2" />
            </div>
            <Skeleton className="h-56 rounded-lg" />
          </div>
        ) : metrics ? (
          <DashboardTabs
            metrics={metrics}
            startBalance={activeAccount.start_balance}
            onTradeClick={handleTradeClick}
          />
        ) : null}

        {/* Tab-independent widgets */}
        <GuidedWorkflowWidget />
        <DailyPlanCTA />
        <WeeklyPrepCard />
        <CoachProfileWidget />
        <InsightsPreview />
      </div>

      <TradeDetailSheet
        trade={selectedTrade}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </>
  )
}
