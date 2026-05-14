'use client'

import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, ChevronRight, AlertTriangle,
  RotateCcw, CalendarCheck, BookOpen, TrendingUp,
  FileText, ListChecks, Activity, Target, BarChart2,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useWorkflowProgress, type WorkflowStep } from '@/hooks/useWorkflowProgress'
import { useAccountContext } from '@/contexts/AccountContext'

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

const CATEGORY_LABELS: Record<string, string> = {
  weekly: 'Wöchentlich',
  daily: 'Täglich',
  per_trade: 'Pro Trade',
  weekly_end: 'Wochenabschluss',
}

function StepIcon({ step }: { step: WorkflowStep }) {
  const Icon = STEP_ICONS[step.id] ?? Target
  if (step.done) {
    return <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#4ade80' }} />
  }
  if (step.missed) {
    return <Clock className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--fg-4)' }} />
  }
  return <Icon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--fg-4)' }} />
}

function StepBadge({ step }: { step: WorkflowStep }) {
  if (step.done) {
    return (
      <span
        className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}
      >
        Erledigt
      </span>
    )
  }
  if (step.missed) {
    return (
      <span
        className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
        style={{ background: 'var(--bg-3)', color: 'var(--fg-4)' }}
      >
        Verpasst
      </span>
    )
  }
  return null
}

interface StepRowProps {
  step: WorkflowStep
  isActive: boolean
  onManualComplete?: () => void
  isMobile?: boolean
}

function StepRow({ step, isActive, onManualComplete, isMobile }: StepRowProps) {
  const router = useRouter()

  const handleAction = () => {
    if (step.id === 'trade_prepared') {
      onManualComplete?.()
    } else if (step.href) {
      router.push(step.href)
    }
  }

  const labelStyle: React.CSSProperties = {
    color: step.done
      ? 'var(--fg-3)'
      : step.missed
        ? 'var(--fg-4)'
        : isActive
          ? 'var(--fg-1)'
          : 'var(--fg-2)',
    textDecoration: step.done ? 'line-through' : undefined,
    fontWeight: isActive && !step.done ? 600 : undefined,
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg transition-colors"
      style={{
        background: isActive && !step.done ? 'var(--bg-3)' : undefined,
        border: isActive && !step.done ? '1px solid var(--border-raw)' : '1px solid transparent',
      }}
    >
      <div className="mt-0.5">
        <StepIcon step={step} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm" style={labelStyle}>
            {step.label}
          </span>
          <StepBadge step={step} />
          {!isMobile && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-3)', color: 'var(--fg-4)' }}
            >
              {CATEGORY_LABELS[step.category]}
            </span>
          )}
        </div>

        {/* Calendar warning inline */}
        {step.id === 'kalender' && step.calendarWarning && !step.done && (
          <div className="flex items-center gap-1.5 mt-1">
            {step.calendarWarning === 'empty_watchlist' ? (
              <span className="text-[12px]" style={{ color: 'var(--fg-4)' }}>
                Keine Assets in der Watchlist
              </span>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <span className="text-[12px]" style={{ color: '#f59e0b' }}>
                  High-Impact heute: {step.calendarWarning}
                </span>
              </>
            )}
          </div>
        )}
        {step.id === 'kalender' && !step.calendarWarning && !step.done && (
          <span className="text-[12px]" style={{ color: 'var(--fg-4)' }}>
            Keine kritischen Events heute ✓
          </span>
        )}

        {/* Action button for active step */}
        {isActive && !step.done && !step.missed && (
          <button
            onClick={handleAction}
            className="mt-2 flex items-center gap-1 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: 'var(--brand-blue)' }}
          >
            {step.id === 'trade_prepared' ? 'Als erledigt markieren' : 'Jetzt starten'}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export function GuidedWorkflowWidget() {
  const { activeAccount } = useAccountContext()
  const { data, loading, error, markManualStep, reset } = useWorkflowProgress(activeAccount?.id)

  if (!activeAccount) return null

  if (loading && !data) {
    return (
      <div
        className="rounded-lg p-5"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--bg-3)' }} />
        </div>
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--bg-3)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) return null

  const { steps, total, done_count } = data
  const progressPct = Math.round((done_count / total) * 100)

  // First non-done, non-missed step = active
  const activeIndex = steps.findIndex(s => !s.done && !s.missed)

  // Mobile: collapse done steps into summary
  const completedSteps = steps.filter(s => s.done)
  const remainingSteps = steps.filter(s => !s.done)

  return (
    <div
      className="rounded-lg"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border-raw)' }}
      >
        <div>
          <div className="eyebrow mb-0.5">Workflow · Diese Woche</div>
          <div className="text-sm font-semibold" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}>
            Deine Trading-Woche
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--fg-1)' }}>
              {done_count}
            </span>
            <span className="text-sm" style={{ color: 'var(--fg-4)' }}>
              / {total}
            </span>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1 text-[12px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--fg-4)' }}
            title="Neue Woche starten"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-2.5" style={{ borderBottom: '1px solid var(--border-raw)' }}>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Steps — Desktop: all steps */}
      <div className="hidden sm:block p-2 space-y-0.5">
        {steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            isActive={i === activeIndex}
            onManualComplete={() => markManualStep('trade_prepared')}
          />
        ))}
      </div>

      {/* Steps — Mobile: compact */}
      <div className="sm:hidden p-2 space-y-0.5">
        {/* Completed steps collapsed */}
        {completedSteps.length > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg"
            style={{ background: 'rgba(74,222,128,0.06)' }}
          >
            <CheckCircle2 className="h-4 w-4" style={{ color: '#4ade80' }} />
            <span className="text-sm" style={{ color: '#4ade80' }}>
              {completedSteps.length} Schritt{completedSteps.length !== 1 ? 'e' : ''} erledigt
            </span>
          </div>
        )}
        {/* Remaining steps */}
        {remainingSteps.map((step) => {
          const origIdx = steps.findIndex(s => s.id === step.id)
          return (
            <StepRow
              key={step.id}
              step={step}
              isActive={origIdx === activeIndex}
              onManualComplete={() => markManualStep('trade_prepared')}
              isMobile
            />
          )
        })}
      </div>
    </div>
  )
}
