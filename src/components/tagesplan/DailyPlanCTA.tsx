'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDailyPlan, type DailyPlan } from '@/hooks/useDailyPlan'
import { useAccountContext } from '@/contexts/AccountContext'
import { cn } from '@/lib/utils'

const BIAS_CONFIG = {
  bullish: { label: 'Bullish', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  bearish: { label: 'Bearish', icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  neutral: { label: 'Neutral', icon: Minus, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
}

export function DailyPlanCTA() {
  const { activeAccount } = useAccountContext()
  const { fetchTodayPlan } = useDailyPlan()
  const [plan, setPlan] = useState<DailyPlan | null | undefined>(undefined)

  useEffect(() => {
    if (!activeAccount) return
    fetchTodayPlan().then(setPlan)
  }, [activeAccount?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (plan === undefined) {
    return <Skeleton className="h-16 rounded-lg" />
  }

  if (!plan) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Kein Tagesplan für heute</p>
            <p className="text-xs text-muted-foreground">Starte strukturiert in deinen Trading-Tag</p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href="/tagesplan">
            Tagesplan erstellen <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>
    )
  }

  const biasConfig = plan.market_bias ? BIAS_CONFIG[plan.market_bias] : null

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <CalendarDays className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">Heutiger Tagesplan</p>
            {biasConfig && (
              <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border', biasConfig.bg, biasConfig.color)}>
                <biasConfig.icon className="h-3 w-3" />
                {biasConfig.label}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {plan.focus_assets.slice(0, 4).map(a => (
              <Badge key={a} variant="outline" className="text-xs px-1.5 py-0">
                {a}
              </Badge>
            ))}
            {plan.focus_assets.length > 4 && (
              <span className="text-xs text-muted-foreground">+{plan.focus_assets.length - 4}</span>
            )}
            {plan.errors_to_avoid.length > 0 && (
              <span className="text-xs text-muted-foreground">
                · {plan.errors_to_avoid.length} Fehler im Blick
              </span>
            )}
          </div>
        </div>
      </div>
      <Button size="sm" variant="outline" asChild className="shrink-0">
        <Link href="/tagesplan">
          Bearbeiten
        </Link>
      </Button>
    </div>
  )
}
