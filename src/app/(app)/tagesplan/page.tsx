'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { DailyPlanForm } from '@/components/tagesplan/DailyPlanForm'
import { useDailyPlan, type DailyPlan } from '@/hooks/useDailyPlan'
import { useAccountContext } from '@/contexts/AccountContext'
import { DailyWatchlistPanel } from '@/components/watchlist/DailyWatchlistPanel'

const BIAS_CONFIG = {
  bullish: { label: 'Bullish', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  bearish: { label: 'Bearish', icon: TrendingDown, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  neutral: { label: 'Neutral', icon: Minus, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
}

function PlanHistoryItem({ plan }: { plan: DailyPlan }) {
  const [open, setOpen] = useState(false)
  const biasConfig = plan.market_bias ? BIAS_CONFIG[plan.market_bias] : null
  const dateLabel = format(new Date(plan.plan_date + 'T12:00:00'), 'EEEE, d. MMMM yyyy', { locale: de })

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{dateLabel}</span>
          {biasConfig && (
            <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border', biasConfig.color)}>
              <biasConfig.icon className="h-3 w-3" />
              {biasConfig.label}
            </div>
          )}
          {plan.focus_assets.slice(0, 3).map(a => (
            <Badge key={a} variant="outline" className="text-xs px-1.5 py-0 hidden sm:flex">
              {a}
            </Badge>
          ))}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40">
          {plan.focus_assets.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Fokus-Assets</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.focus_assets.map(a => (
                  <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
          )}
          {plan.errors_to_avoid.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Fehler vermeiden</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.errors_to_avoid.map(e => (
                  <span key={e} className="text-xs px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}
          {plan.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notizen</p>
              <p className="text-sm text-muted-foreground">{plan.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TagesplanPage() {
  const { activeAccount } = useAccountContext()
  const { fetchTodayPlan, fetchRecentPlans } = useDailyPlan()
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null | undefined>(undefined)
  const [history, setHistory] = useState<DailyPlan[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!activeAccount) return
    fetchTodayPlan().then(setTodayPlan)
  }, [activeAccount?.id, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeAccount) return
    setHistoryLoading(true)
    fetchRecentPlans(14)
      .then(plans => setHistory(plans.filter(p => p.plan_date !== today)))
      .finally(() => setHistoryLoading(false))
  }, [activeAccount?.id, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = () => setRefreshKey(k => k + 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tagesplan</h1>
        <p className="text-muted-foreground text-sm">Starte strukturiert in deinen Trading-Tag</p>
      </div>

      {/* Heutige Trading-Watchlist */}
      <div className="rounded-lg border border-border/60 bg-card p-6 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Heutige Trading-Watchlist</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Assets auf die du dich heute aktiv fokussierst
          </p>
        </div>
        <DailyWatchlistPanel accountId={activeAccount?.id} />
      </div>

      {/* Today's form */}
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <h2 className="text-base font-semibold mb-5">Heutiger Plan</h2>
        {todayPlan === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : (
          <DailyPlanForm initialPlan={todayPlan} onSaved={handleSaved} />
        )}
      </div>

      {/* History */}
      {(historyLoading || history.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Vergangene Pläne</h2>
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(p => <PlanHistoryItem key={p.id} plan={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
