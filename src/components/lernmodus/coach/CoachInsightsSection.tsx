'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Pencil, Trash2, Brain, Clock, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Insight {
  id: string
  insight: string
  source: 'conversation' | 'trade_checkin' | 'pattern_detection'
  confirmed: boolean | null
  weight: number
  created_at: string
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'rejected'

const SOURCE_LABELS: Record<Insight['source'], string> = {
  conversation: 'Gespräch',
  trade_checkin: 'Check-in',
  pattern_detection: 'Mustererkennung',
}

export function CoachInsightsSection() {
  const { activeAccount } = useAccountContext()
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [counts, setCounts] = useState({ total: 0, confirmed: 0, pending: 0, rejected: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadInsights = useCallback(async () => {
    if (!activeAccount) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ account_id: activeAccount.id })
      if (filter !== 'all') params.set('status', filter)
      const res = await fetch(`/api/ai/coach-insights?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInsights(data.insights ?? [])
        setCounts(data.counts ?? { total: 0, confirmed: 0, pending: 0, rejected: 0 })
      }
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount, filter])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const confirm = async (id: string, value: boolean | null) => {
    setSavingId(id)
    try {
      const res = await fetch(`/api/ai/coach-insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: value }),
      })
      if (res.ok) {
        const updated = await res.json()
        setInsights(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
        // Re-fetch counts
        await loadInsights()
        toast.success(value === true ? 'Erkenntnis bestätigt' : value === false ? 'Erkenntnis abgelehnt' : 'Status zurückgesetzt')
      } else {
        toast.error('Fehler beim Speichern')
      }
    } finally {
      setSavingId(null)
    }
  }

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/ai/coach-insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insight: editText.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setInsights(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
        setEditingId(null)
        toast.success('Erkenntnis gespeichert')
      } else {
        toast.error('Fehler beim Speichern')
      }
    } finally {
      setSavingId(null)
    }
  }

  const deleteInsight = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/ai/coach-insights/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInsights(prev => prev.filter(i => i.id !== id))
        setCounts(prev => ({ ...prev, total: prev.total - 1 }))
        toast.success('Erkenntnis gelöscht')
      } else {
        toast.error('Fehler beim Löschen')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const startEdit = (insight: Insight) => {
    setEditingId(insight.id)
    setEditText(insight.insight)
  }

  const filteredInsights = filter === 'all'
    ? insights
    : insights.filter(i => {
        if (filter === 'confirmed') return i.confirmed === true
        if (filter === 'pending') return i.confirmed === null
        if (filter === 'rejected') return i.confirmed === false
        return true
      })

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Der Coach lernt dich über Zeit kennen. Hier siehst du alle gespeicherten Erkenntnisse — bestätige was stimmt, lehne ab was falsch ist.
        </p>
      </div>

      {/* Filter + counts */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'confirmed', 'rejected'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              filter === f
                ? 'bg-foreground text-background border-foreground'
                : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {f === 'all' && `Alle (${counts.total})`}
            {f === 'pending' && `Offen (${counts.pending})`}
            {f === 'confirmed' && `Bestätigt (${counts.confirmed})`}
            {f === 'rejected' && `Abgelehnt (${counts.rejected})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center rounded-lg border border-dashed border-border/60">
          <Brain className="h-8 w-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {filter === 'all'
                ? 'Noch keine Erkenntnisse gespeichert.'
                : 'Keine Erkenntnisse in dieser Kategorie.'}
            </p>
            {filter === 'all' && (
              <p className="text-xs text-muted-foreground/60">
                Starte ein Gespräch mit dem Coach oder fülle den psychologischen Check-in beim Trade-Erfassen aus.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              isEditing={editingId === insight.id}
              editText={editText}
              isSaving={savingId === insight.id}
              isDeleting={deletingId === insight.id}
              onEditTextChange={setEditText}
              onStartEdit={() => startEdit(insight)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={() => saveEdit(insight.id)}
              onConfirm={() => confirm(insight.id, true)}
              onReject={() => confirm(insight.id, false)}
              onReset={() => confirm(insight.id, null)}
              onDelete={() => deleteInsight(insight.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InsightCard({
  insight,
  isEditing,
  editText,
  isSaving,
  isDeleting,
  onEditTextChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onConfirm,
  onReject,
  onReset,
  onDelete,
}: {
  insight: Insight
  isEditing: boolean
  editText: string
  isSaving: boolean
  isDeleting: boolean
  onEditTextChange: (v: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onConfirm: () => void
  onReject: () => void
  onReset: () => void
  onDelete: () => void
}) {
  const statusColor =
    insight.confirmed === true
      ? 'border-l-emerald-500'
      : insight.confirmed === false
      ? 'border-l-red-500/40'
      : 'border-l-amber-500'

  return (
    <div className={cn(
      'rounded-lg border border-border/60 border-l-2 p-3 space-y-2 bg-muted/20',
      statusColor,
      insight.confirmed === false && 'opacity-60'
    )}>
      {/* Top row: status badge + source + date */}
      <div className="flex items-center gap-2 flex-wrap">
        {insight.confirmed === true && (
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 py-0">
            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
            Bestätigt
          </Badge>
        )}
        {insight.confirmed === false && (
          <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400 py-0">
            <XCircle className="h-2.5 w-2.5 mr-1" />
            Abgelehnt
          </Badge>
        )}
        {insight.confirmed === null && (
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 py-0">
            <Clock className="h-2.5 w-2.5 mr-1" />
            Offen
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground">{SOURCE_LABELS[insight.source]}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {format(new Date(insight.created_at), 'dd. MMM yy', { locale: de })}
        </span>
        {insight.weight > 1 && (
          <span className="text-[10px] text-purple-400">·{insight.weight}x bestätigt</span>
        )}
      </div>

      {/* Insight text or editor */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={e => onEditTextChange(e.target.value)}
            rows={2}
            maxLength={500}
            className="resize-none text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={onSaveEdit} disabled={isSaving || !editText.trim()}>
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              Speichern
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancelEdit}>
              <X className="h-3 w-3 mr-1" />
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed">{insight.insight}</p>
      )}

      {/* Action row */}
      {!isEditing && (
        <div className="flex items-center gap-1 pt-0.5">
          {insight.confirmed !== true && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              onClick={onConfirm}
              disabled={isSaving}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Bestätigen
            </Button>
          )}
          {insight.confirmed !== false && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={onReject}
              disabled={isSaving}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Ablehnen
            </Button>
          )}
          {insight.confirmed !== null && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground"
              onClick={onReset}
              disabled={isSaving}
            >
              Zurücksetzen
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={onStartEdit}
            title="Bearbeiten"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
            title="Löschen"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  )
}
