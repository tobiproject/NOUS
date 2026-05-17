'use client'

import { useState } from 'react'
import { Loader2, Save, CheckCircle, Lightbulb, TrendingUp, TrendingDown, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { Trade } from '@/hooks/useTrades'

interface ReviewValues {
  what_went_well: string
  what_to_improve: string
  lesson_learned: string
  review_notes: string
}

interface Props {
  trade: Trade
  onSaved?: (updated: ReviewValues) => void
}

interface ReviewField {
  key: keyof ReviewValues
  label: string
  placeholder: string
  icon: React.ElementType
  color: string
}

const FIELDS: ReviewField[] = [
  {
    key: 'what_went_well',
    label: 'Was lief gut?',
    placeholder: 'Entry-Timing, Geduld beim Warten auf das Setup, SL-Platzierung…',
    icon: TrendingUp,
    color: 'var(--long)',
  },
  {
    key: 'what_to_improve',
    label: 'Was würde ich anders machen?',
    placeholder: 'Zu früh eingestiegen, TP zu eng, emotionale Entscheidung…',
    icon: TrendingDown,
    color: 'var(--short)',
  },
  {
    key: 'lesson_learned',
    label: 'Lektion für das nächste Mal',
    placeholder: 'Die eine Erkenntnis, die ich aus diesem Trade mitnehme…',
    icon: Lightbulb,
    color: 'var(--brand-blue)',
  },
  {
    key: 'review_notes',
    label: 'Freie Notizen zur Nachbereitung',
    placeholder: 'Kontext, Marktbedingungen, Chart-Beobachtungen…',
    icon: BookOpen,
    color: 'var(--fg-3)',
  },
]

export function TradeReviewTab({ trade, onSaved }: Props) {
  const [values, setValues] = useState<ReviewValues>({
    what_went_well:  trade.what_went_well ?? '',
    what_to_improve: trade.what_to_improve ?? '',
    lesson_learned:  trade.lesson_learned ?? '',
    review_notes:    trade.review_notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty = (
    values.what_went_well  !== (trade.what_went_well  ?? '') ||
    values.what_to_improve !== (trade.what_to_improve ?? '') ||
    values.lesson_learned  !== (trade.lesson_learned  ?? '') ||
    values.review_notes    !== (trade.review_notes    ?? '')
  )

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/trades/${trade.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error('Nachbereitung konnte nicht gespeichert werden')
      return
    }
    setSaved(true)
    onSaved?.(values)
    toast.success('Nachbereitung gespeichert')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--fg-4)' }}>
          Nachbereitung
        </p>
        <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
          Reflektiere diesen Trade — ehrlich und ohne Bewertung. Das ist deine wichtigste Lernquelle.
        </p>
      </div>

      {FIELDS.map(({ key, label, placeholder, icon: Icon, color }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
            <p className="text-sm font-medium" style={{ color: 'var(--fg-1)' }}>{label}</p>
          </div>
          <Textarea
            value={values[key as keyof typeof values]}
            onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={placeholder}
            rows={3}
            className="text-sm resize-none"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border-raw)' }}
          />
        </div>
      ))}

      <Button
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="w-full h-9 text-[13px] font-semibold rounded"
        style={{
          background: isDirty ? 'var(--brand-blue)' : 'var(--bg-3)',
          color: isDirty ? '#fff' : 'var(--fg-4)',
          border: 'none',
        }}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Speichern…</>
        ) : saved ? (
          <><CheckCircle className="h-4 w-4 mr-2" style={{ color: 'var(--long)' }} /> Gespeichert</>
        ) : (
          <><Save className="h-4 w-4 mr-2" /> Nachbereitung speichern</>
        )}
      </Button>
    </div>
  )
}
