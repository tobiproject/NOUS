'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { DailyPlanForm } from '@/components/tagesplan/DailyPlanForm'
import { useDailyPlan, type DailyPlan } from '@/hooks/useDailyPlan'
import { useAccountContext } from '@/contexts/AccountContext'

const FIXED_ITEMS = [
  'Ich bin mental fokussiert und ausgeschlafen',
  'Ich halte mein Tageslimit strikt ein',
  'Kein FOMO — ich trade nur mein Setup',
]

function buildChecklist(plan: DailyPlan): string[] {
  const items: string[] = []

  if (plan.market_bias) {
    const label = plan.market_bias === 'bullish' ? 'Bullish' : plan.market_bias === 'bearish' ? 'Bearish' : 'Neutral'
    items.push(`Mein Bias heute ist ${label} — ich weiche nicht ohne Grund ab`)
  }

  if (plan.focus_assets.length > 0) {
    items.push(`Ich trade heute nur: ${plan.focus_assets.join(', ')}`)
  }

  plan.errors_to_avoid.forEach(e => {
    items.push(`Ich vermeide: ${e}`)
  })

  return [...items, ...FIXED_ITEMS]
}

export function MorningBriefing() {
  const { activeAccount } = useAccountContext()
  const { fetchTodayPlan } = useDailyPlan()

  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [checklist, setChecklist] = useState<string[]>([])
  const [checked, setChecked] = useState<boolean[]>([])
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAccount) return

    const today = new Date().toISOString().split('T')[0]
    if (localStorage.getItem(`nous-morning-${today}`)) return

    setVisible(true)
    fetch('/api/profile').then(r => r.json()).then(d => setDisplayName(d.display_name ?? null))

    fetchTodayPlan().then(existing => {
      if (existing) {
        advanceToStep2(existing)
      }
      // else stay on step 1
    })
  }, [activeAccount?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const advanceToStep2 = (plan: DailyPlan) => {
    const items = buildChecklist(plan)
    setChecklist(items)
    setChecked(items.map(() => false))
    setStep(2)
  }

  const handlePlanSaved = () => {
    fetchTodayPlan().then(saved => {
      if (saved) advanceToStep2(saved)
    })
  }

  const dismiss = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem(`nous-morning-${today}`, '1')
    setVisible(false)
  }

  if (!visible) return null

  const allChecked = checked.length > 0 && checked.every(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-[500px] mx-4 rounded-lg flex flex-col"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border-raw)',
          maxHeight: '88vh',
        }}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="eyebrow">
              {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{ width: 24, background: 'var(--brand-blue)' }}
              />
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{ width: 24, background: step === 2 ? 'var(--brand-blue)' : 'var(--bg-4)' }}
              />
            </div>
          </div>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}
          >
            {step === 1
              ? 'Tagesplan erstellen'
              : displayName ? `Bereit, ${displayName}?` : 'Bereit für den Tag?'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>
            {step === 1
              ? 'Definiere deinen Plan für heute — dann zur Checkliste.'
              : 'Hak jeden Punkt ab, bevor du anfängst zu traden.'}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-7">
          {step === 1 ? (
            <div className="pb-4">
              <DailyPlanForm onSaved={handlePlanSaved} />
            </div>
          ) : (
            <ul className="flex flex-col gap-3 pb-4">
              {checklist.map((item, i) => {
                const isPlanItem = i < checklist.length - FIXED_ITEMS.length
                return (
                  <li
                    key={i}
                    onClick={() => setChecked(prev => prev.map((v, j) => j === i ? !v : v))}
                    className="flex items-start gap-3 cursor-pointer select-none"
                  >
                    <span
                      className="shrink-0 mt-0.5"
                      style={{ color: checked[i] ? 'var(--long)' : 'var(--fg-4)' }}
                    >
                      {checked[i] ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect width="16" height="16" rx="3" fill="currentColor"/>
                          <path d="M4 8l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="0.5" y="0.5" width="15" height="15" rx="2.5" stroke="currentColor"/>
                        </svg>
                      )}
                    </span>
                    <div className="flex-1">
                      {isPlanItem && (
                        <div
                          className="text-[9px] font-semibold uppercase tracking-widest mb-0.5"
                          style={{ color: 'var(--fg-4)' }}
                        >
                          Tagesplan
                        </div>
                      )}
                      <span
                        className="text-sm leading-snug"
                        style={{
                          color: checked[i] ? 'var(--fg-3)' : 'var(--fg-1)',
                          textDecoration: checked[i] ? 'line-through' : 'none',
                        }}
                      >
                        {item}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-7 py-5 flex items-center justify-between shrink-0"
          style={{ borderTop: '1px solid var(--border-raw)' }}
        >
          <button
            onClick={dismiss}
            className="text-xs transition-colors"
            style={{ color: 'var(--fg-4)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-4)')}
          >
            Überspringen
          </button>

          {step === 2 && (
            <Button
              onClick={dismiss}
              disabled={!allChecked}
              className="h-8 px-4 text-[13px] font-semibold rounded"
              style={{
                background: allChecked ? 'var(--brand-blue)' : 'var(--bg-3)',
                color: allChecked ? '#fff' : 'var(--fg-4)',
                border: 'none',
                opacity: 1,
              }}
            >
              Bereit zum Traden →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
