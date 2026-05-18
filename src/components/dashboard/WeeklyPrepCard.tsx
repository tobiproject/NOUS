'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccountContext } from '@/contexts/AccountContext'

export function WeeklyPrepCard() {
  const { activeAccount } = useAccountContext()
  const [prep, setPrep] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const generate = async () => {
    setLoading(true)
    setPrep(null)
    try {
      const res = await fetch('/api/ai/weekly-prep', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setPrep(data.prep)
        setExpanded(true)
        if (activeAccount?.id) {
          fetch('/api/workflow/visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: activeAccount.id, step: 'briefing' }),
          }).catch(() => {})
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-lg"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border-raw)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: prep ? '1px solid var(--border-raw)' : undefined }}
      >
        <div>
          <div className="eyebrow mb-0.5">KI · Wochenvorbereitung</div>
          <div className="text-sm font-semibold" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--fg-1)' }}>
            {prep ? 'Deine Wochenanalyse' : 'Personalisiertes Briefing generieren'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prep && (
            <button onClick={() => setExpanded(v => !v)} style={{ color: 'var(--fg-4)' }}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <Button
            variant="ai"
            onClick={generate}
            disabled={loading}
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              : <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            }
            {loading ? 'Analysiere…' : prep ? 'Neu generieren' : 'Generieren'}
          </Button>
        </div>
      </div>

      {prep && expanded && (
        <div
          className="px-5 py-4 text-sm leading-relaxed prose-sm max-w-none"
          style={{ color: 'var(--fg-2)', whiteSpace: 'pre-wrap' }}
        >
          {prep}
        </div>
      )}
    </div>
  )
}
