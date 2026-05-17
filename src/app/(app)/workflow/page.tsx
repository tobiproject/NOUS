'use client'

import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, ChevronRight, AlertTriangle,
  RotateCcw, CalendarCheck, BookOpen, TrendingUp,
  FileText, ListChecks, Activity, Target, BarChart2,
  Flame,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useWorkflowProgress, type WorkflowStep } from '@/hooks/useWorkflowProgress'
import { useAccountContext } from '@/contexts/AccountContext'
import { WorkflowVisitTracker } from '@/components/workflow/WorkflowVisitTracker'

const STEP_ICONS: Record<string, React.ElementType> = {
  wochenvorbereitung: CalendarCheck,
  kalender: CalendarCheck,
  briefing: BookOpen,
  tagesplan: FileText,
  trade_prepared: ListChecks,
  trade_logged: Activity,
  trade_analyzed: TrendingUp,
  wochen_review: BarChart2,
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  weekly:     { label: 'Wöchentlich',     color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
  daily:      { label: 'Täglich',         color: '#ff8210', bg: 'rgba(255,130,16,0.08)'  },
  per_trade:  { label: 'Pro Trade',       color: '#38bdf8', bg: 'rgba(56,189,248,0.08)'  },
  weekly_end: { label: 'Wochenabschluss', color: '#4ade80', bg: 'rgba(74,222,128,0.08)'  },
}

function StepRow({ step, isActive, onManualComplete }: {
  step: WorkflowStep
  isActive: boolean
  onManualComplete?: () => void
}) {
  const router = useRouter()
  const Icon = STEP_ICONS[step.id] ?? Target
  const cat = CATEGORY_META[step.category]

  const handleAction = () => {
    if (step.id === 'trade_prepared') onManualComplete?.()
    else if (step.href) router.push(step.href)
  }

  return (
    <div
      className="flex items-start gap-4 px-5 py-4 rounded-xl transition-all"
      style={{
        background: isActive && !step.done
          ? 'rgba(255,130,16,0.07)'
          : step.done
          ? 'rgba(74,222,128,0.03)'
          : 'var(--bg-2)',
        border: isActive && !step.done
          ? '1px solid rgba(255,130,16,0.25)'
          : '1px solid var(--border-raw)',
        borderLeft: isActive && !step.done
          ? '3px solid #ff8210'
          : step.done
          ? '3px solid #4ade80'
          : '3px solid transparent',
        opacity: step.missed ? 0.45 : 1,
      }}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {step.done
          ? <CheckCircle2 className="h-5 w-5" style={{ color: '#4ade80' }} />
          : step.missed
          ? <Clock className="h-5 w-5" style={{ color: 'var(--fg-4)' }} />
          : <Icon className="h-5 w-5" style={{ color: isActive ? '#ff8210' : 'var(--fg-3)' }} />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className="text-[14px] font-medium"
            style={{
              color: step.done ? 'var(--fg-3)' : step.missed ? 'var(--fg-4)' : 'var(--fg-1)',
              textDecoration: step.done ? 'line-through' : undefined,
            }}
          >
            {step.label}
          </span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: cat.bg, color: cat.color }}
          >
            {cat.label}
          </span>
          {step.done && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
              Erledigt
            </span>
          )}
          {step.missed && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-3)', color: 'var(--fg-4)' }}>
              Verpasst
            </span>
          )}
        </div>

        {step.id === 'kalender' && step.calendarWarning && !step.done && (
          <div className="flex items-center gap-1.5 mt-1">
            {step.calendarWarning === 'empty_watchlist' ? (
              <span className="text-[12px]" style={{ color: 'var(--fg-4)' }}>Keine Assets in der Watchlist</span>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: '#f59e0b' }} />
                <span className="text-[12px]" style={{ color: '#f59e0b' }}>High-Impact heute: {step.calendarWarning}</span>
              </>
            )}
          </div>
        )}

        {isActive && !step.done && !step.missed && (
          <button
            onClick={handleAction}
            className="mt-2 flex items-center gap-1 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: '#ff8210' }}
          >
            {step.id === 'trade_prepared' ? 'Als erledigt markieren' : 'Jetzt starten'}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function WorkflowPage() {
  const { activeAccount } = useAccountContext()
  const { data, loading, markManualStep, reset } = useWorkflowProgress(activeAccount?.id)

  if (!activeAccount) return null

  const steps = data?.steps ?? []
  const total = data?.total ?? 0
  const done = data?.done_count ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const activeIndex = steps.findIndex(s => !s.done && !s.missed)

  // Group steps by category
  const groups: Record<string, WorkflowStep[]> = {}
  for (const step of steps) {
    if (!groups[step.category]) groups[step.category] = []
    groups[step.category].push(step)
  }
  const categoryOrder = ['weekly', 'daily', 'per_trade', 'weekly_end']

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <WorkflowVisitTracker step="tagesplan" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">Tages-Workflow</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg-1)' }}>
            Deine Trading-Woche
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>
            Arbeite die Schritte der Reihe nach ab — von Vorbereitung bis Analyse.
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity hover:opacity-70 shrink-0 mt-1"
          style={{ background: 'var(--bg-3)', color: 'var(--fg-3)', border: '1px solid var(--border-raw)' }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Neue Woche
        </button>
      </div>

      {/* Progress card */}
      <div
        className="rounded-xl px-5 py-4"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4" style={{ color: '#ff8210' }} />
            <span className="text-[14px] font-semibold" style={{ color: 'var(--fg-1)' }}>
              Fortschritt
            </span>
          </div>
          <span className="text-[14px] font-bold tabular-nums" style={{ color: done === total && total > 0 ? '#4ade80' : '#ff8210' }}>
            {done}/{total} Schritte
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-[11px] mt-2" style={{ color: 'var(--fg-4)' }}>
          {pct === 100 ? '🎉 Alles erledigt — starke Trading-Woche!' : `${100 - pct}% verbleibend`}
        </p>
      </div>

      {/* Steps grouped by category */}
      {loading && !data ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-2)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map(cat => {
            const catSteps = groups[cat]
            if (!catSteps?.length) return null
            const meta = CATEGORY_META[cat]
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <div className="flex-1 h-px" style={{ background: meta.bg }} />
                </div>
                <div className="space-y-2">
                  {catSteps.map(step => {
                    const origIdx = steps.findIndex(s => s.id === step.id)
                    return (
                      <StepRow
                        key={step.id}
                        step={step}
                        isActive={origIdx === activeIndex}
                        onManualComplete={() => markManualStep('trade_prepared')}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
