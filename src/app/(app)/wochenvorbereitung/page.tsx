'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, X, Loader2, Save, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AssetMultiPicker } from '@/components/watchlist/AssetMultiPicker'
import { WeeklyPrepCard } from '@/components/dashboard/WeeklyPrepCard'
import { WorkflowVisitTracker } from '@/components/workflow/WorkflowVisitTracker'
import { format, startOfWeek, addWeeks, addDays, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'

interface WeeklyPlan {
  focus_assets: string[]
  weekly_goals: string[]
  max_trades: number | null
  max_drawdown: number | null
  notes: string
}

const EMPTY: WeeklyPlan = { focus_assets: [], weekly_goals: [], max_trades: null, max_drawdown: null, notes: '' }

function getTargetWeekMonday(): Date {
  const today = new Date()
  const dow = today.getDay() // 0=Sun, 6=Sat
  const thisMonday = startOfWeek(today, { weekStartsOn: 1 })
  // On Saturday or Sunday, plan for next week
  return (dow === 6 || dow === 0) ? addWeeks(thisMonday, 1) : thisMonday
}

function getWeekStart() {
  return format(getTargetWeekMonday(), 'yyyy-MM-dd')
}

function buildWeekLabel(monday: Date): string {
  const friday = addDays(monday, 4)
  const kw = getISOWeek(monday)
  const moStr = format(monday, 'dd.MM.', { locale: de })
  const frStr = format(friday, 'dd.MM.yyyy', { locale: de })
  return `KW ${kw} · Mo ${moStr} – Fr ${frStr}`
}

export default function WochenvorbereitungPage() {
  const [plan, setPlan] = useState<WeeklyPlan>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newGoal, setNewGoal] = useState('')

  // useMemo keeps these stable across re-renders — without it, new Date()
  // objects on every render would cause an infinite useEffect/fetch loop.
  const targetMonday = useMemo(() => getTargetWeekMonday(), [])
  const weekStart = useMemo(() => format(targetMonday, 'yyyy-MM-dd'), [targetMonday])
  const weekLabel = useMemo(() => buildWeekLabel(targetMonday), [targetMonday])
  const isNextWeek = useMemo(() => { const d = new Date().getDay(); return d === 6 || d === 0 }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weekly-plan?week=${format(targetMonday, 'yyyy-MM-dd')}`)
      const data = await res.json()
      if (data.plan) {
        setPlan({
          focus_assets:  data.plan.focus_assets ?? [],
          weekly_goals:  data.plan.weekly_goals ?? [],
          max_trades:    data.plan.max_trades ?? null,
          max_drawdown:  data.plan.max_drawdown ?? null,
          notes:         data.plan.notes ?? '',
        })
      }
    } catch {
      // show empty form on network error
    } finally {
      setLoading(false)
    }
  }, [targetMonday])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/weekly-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, ...plan }),
    })
    setSaving(false)
    if (res.ok) {
      localStorage.setItem(`nous-weekly-prep-done-${weekStart}`, '1')
      window.dispatchEvent(new CustomEvent('weekly-prep-changed'))
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const addGoal = () => {
    const g = newGoal.trim()
    if (!g) return
    setPlan(p => ({ ...p, weekly_goals: [...p.weekly_goals, g] }))
    setNewGoal('')
  }

  const removeGoal = (i: number) =>
    setPlan(p => ({ ...p, weekly_goals: p.weekly_goals.filter((_, j) => j !== i) }))

  return (
    <div className="space-y-6 max-w-2xl">
      <WorkflowVisitTracker step="briefing" />
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow mb-1">Planung</div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}>
              Wochenvorbereitung
            </h1>
            {isNextWeek && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--brand-blue)', color: '#fff' }}>
                Nächste Woche
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>{weekLabel}</p>
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="h-8 px-4 text-[13px] font-semibold rounded gap-2 shrink-0"
          style={{ background: 'var(--brand-blue)', color: '#fff', border: 'none' }}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : saved ? <CheckCircle className="h-3.5 w-3.5" />
            : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Gespeichert' : 'Speichern'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8" style={{ color: 'var(--fg-4)' }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Lade Wochenplan…</span>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Focus Assets */}
          <Section title="Fokus-Assets diese Woche" subtitle="Welche Märkte stehen diese Woche im Fokus?">
            <AssetMultiPicker
              value={plan.focus_assets}
              onChange={v => setPlan(p => ({ ...p, focus_assets: v }))}
              placeholder="Asset aus Watchlist…"
            />
          </Section>

          {/* Weekly Goals */}
          <Section title="Wochenziele" subtitle="Was willst du diese Woche erreichen oder üben?">
            <div className="space-y-2">
              {plan.weekly_goals.map((g, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded px-3 py-2"
                  style={{ background: 'var(--bg-3)' }}
                >
                  <span className="num text-xs shrink-0 mt-0.5" style={{ color: 'var(--fg-4)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm flex-1" style={{ color: 'var(--fg-1)' }}>{g}</span>
                  <button onClick={() => removeGoal(i)}>
                    <X className="h-3.5 w-3.5" style={{ color: 'var(--fg-4)' }} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  placeholder="Neues Wochenziel…"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                />
                <Button
                  type="button"
                  onClick={addGoal}
                  className="h-9 px-3 shrink-0 rounded"
                  style={{ background: 'var(--bg-3)', color: 'var(--fg-1)', border: '1px solid var(--border-raw)' }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Section>

          {/* Risk Limits */}
          <Section title="Risikolimits" subtitle="Setze dir klare Grenzen für diese Woche">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>Max. Trades</label>
                <Input
                  type="number"
                  min={1}
                  value={plan.max_trades ?? ''}
                  onChange={e => setPlan(p => ({ ...p, max_trades: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="z.B. 10"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>Max. Drawdown (%)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={plan.max_drawdown ?? ''}
                  onChange={e => setPlan(p => ({ ...p, max_drawdown: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="z.B. 3.0"
                  className="h-9"
                />
              </div>
            </div>
          </Section>

          {/* Notes */}
          <Section title="Notizen" subtitle="Marktkontext, Events, besondere Beobachtungen">
            <Textarea
              rows={4}
              value={plan.notes}
              onChange={e => setPlan(p => ({ ...p, notes: e.target.value }))}
              placeholder="z.B. Fed-Entscheidung am Mittwoch, Earnings-Season läuft, Dollar schwächelt…"
              className="resize-none text-sm"
            />
          </Section>

          {/* KI Weekly Prep */}
          <WeeklyPrepCard />

        </div>
      )}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-5 space-y-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
