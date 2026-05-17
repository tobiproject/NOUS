'use client'

import { useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Trade } from '@/hooks/useTrades'
import { QuizAnswer } from './QuizSession'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, MinusCircle, ExternalLink, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountContext } from '@/contexts/AccountContext'

interface Props {
  trade: Trade
  sessionId: string | null
  onAnswer: (answer: QuizAnswer) => void
}

type GoodEntry = 'yes' | 'no' | 'unsure'

export function QuizCard({ trade, sessionId, onAnswer }: Props) {
  const { activeAccount } = useAccountContext()
  const [goodEntry, setGoodEntry] = useState<GoodEntry | null>(null)
  const [setupGuess, setSetupGuess] = useState('')
  const [improvementNotes, setImprovementNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revealed, setRevealed] = useState<QuizAnswer | null>(null)

  const handleSubmit = async () => {
    if (!goodEntry || !activeAccount) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: activeAccount.id,
          session_id: sessionId,
          trade_id: trade.id,
          good_entry: goodEntry,
          setup_guess: setupGuess,
          improvement_notes: improvementNotes,
        }),
      })
      const data = await res.json()
      const answer: QuizAnswer = {
        tradeId: trade.id,
        goodEntry,
        setupGuess,
        improvementNotes,
        aiComment: data.ai_comment || '',
        actualOutcome: trade.outcome,
        actualPnL: trade.result_currency,
        isCorrect: data.is_correct ?? false,
      }
      setRevealed(answer)
    } finally {
      setIsSubmitting(false)
    }
  }

  const tradeDate = format(new Date(trade.traded_at), 'dd. MMM yyyy', { locale: de })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {trade.asset} · {trade.direction === 'long' ? 'Long' : 'Short'}
          </CardTitle>
          <span className="text-sm text-muted-foreground">{tradeDate}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {trade.setup_type && <Badge variant="secondary">{trade.setup_type}</Badge>}
          {trade.strategy && <Badge variant="outline">{trade.strategy}</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trade Info — no outcome shown */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Entry" value={String(trade.entry_price)} />
          <InfoRow label="SL" value={trade.sl_price ? String(trade.sl_price) : '—'} />
          <InfoRow label="TP" value={trade.tp_price ? String(trade.tp_price) : '—'} />
          <InfoRow label="Lots" value={trade.lot_size ? String(trade.lot_size) : '—'} />
        </div>

        {/* Screenshot */}
        {trade.screenshot_urls.length > 0 && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
            <Image
              src={trade.screenshot_urls[0]}
              alt="Trade Chart"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        {/* TradingView chart link — opens as popup window */}
        {trade.chart_url && trade.screenshot_urls.length === 0 && (
          <button
            type="button"
            onClick={() => window.open(trade.chart_url!, 'nous-chart', 'width=1400,height=900,left=100,top=80,resizable=yes,scrollbars=yes')}
            className="w-full flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors hover:opacity-80"
            style={{ background: 'rgba(41,98,255,0.08)', border: '1px solid rgba(41,98,255,0.25)' }}
          >
            <LineChart className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-blue)' }} />
            <span className="flex-1 text-left font-medium" style={{ color: 'var(--brand-blue)' }}>
              Chart ansehen (TradingView)
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-blue)' }} />
          </button>
        )}

        {!revealed ? (
          <>
            {/* Good Entry Toggle */}
            <div className="space-y-2">
              <Label>War das ein guter Einstieg?</Label>
              <div className="flex gap-2">
                {([
                  { value: 'yes', label: 'Ja', icon: CheckCircle, color: 'text-green-400' },
                  { value: 'no', label: 'Nein', icon: XCircle, color: 'text-red-400' },
                  { value: 'unsure', label: 'Unsicher', icon: MinusCircle, color: 'text-yellow-400' },
                ] as const).map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGoodEntry(value)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border text-sm transition-colors',
                      goodEntry === value
                        ? 'border-foreground bg-accent text-foreground'
                        : 'border-border text-muted-foreground hover:border-foreground/50'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', color)} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Setup Guess */}
            <div className="space-y-2">
              <Label htmlFor="setup-guess">Was war das Setup? (optional)</Label>
              <Input
                id="setup-guess"
                placeholder="z.B. Breakout, VWAP Retest, ORB..."
                value={setupGuess}
                onChange={e => setSetupGuess(e.target.value)}
              />
            </div>

            {/* Improvement */}
            <div className="space-y-2">
              <Label htmlFor="improvement">Was hättest du anders gemacht? (optional)</Label>
              <Textarea
                id="improvement"
                placeholder="z.B. Engeren SL gesetzt, auf bessere Kerze gewartet..."
                rows={2}
                value={improvementNotes}
                onChange={e => setImprovementNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!goodEntry || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Auswerten...</>
              ) : (
                'Ergebnis aufdecken'
              )}
            </Button>
          </>
        ) : (
          <RevealedResult answer={revealed} trade={trade} onNext={() => onAnswer(revealed)} />
        )}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

function RevealedResult({
  answer,
  trade,
  onNext,
}: {
  answer: QuizAnswer
  trade: Trade
  onNext: () => void
}) {
  const outcomeColor =
    trade.outcome === 'win'
      ? 'text-green-400'
      : trade.outcome === 'loss'
      ? 'text-red-400'
      : 'text-yellow-400'

  const outcomeLabel =
    trade.outcome === 'win' ? 'Win' : trade.outcome === 'loss' ? 'Loss' : 'Breakeven'

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Ergebnis</span>
          <span className={cn('font-bold', outcomeColor)}>{outcomeLabel}</span>
        </div>
        {trade.result_currency != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">P&L</span>
            <span className={outcomeColor}>
              {trade.result_currency >= 0 ? '+' : ''}{trade.result_currency.toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Deine Bewertung</span>
          <span className={answer.isCorrect ? 'text-green-400' : 'text-red-400'}>
            {answer.isCorrect ? '✓ Richtig' : '✗ Falsch'}
          </span>
        </div>
      </div>

      {answer.aiComment && (
        <div className="rounded-lg bg-muted/50 border p-4 text-sm text-muted-foreground leading-relaxed">
          <p className="text-xs font-medium text-foreground mb-1">KI-Kommentar</p>
          {answer.aiComment}
        </div>
      )}

      <Button onClick={onNext} className="w-full">
        Nächster Trade →
      </Button>
    </div>
  )
}
