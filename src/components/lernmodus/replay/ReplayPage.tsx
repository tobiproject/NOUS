'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAccountContext } from '@/contexts/AccountContext'
import { useTrades, Trade } from '@/hooks/useTrades'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Loader2, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface ReplayResult {
  original_result: number | null
  reeval_result: number | null
  improvement: number | null
  would_have_been_better: boolean | null
}

export function ReplayPage() {
  const { activeAccount } = useAccountContext()
  const { fetchTrades } = useTrades()
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesLoading, setTradesLoading] = useState(true)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  const [wouldTake, setWouldTake] = useState<boolean | null>(null)
  const [reevalSL, setReevalSL] = useState('')
  const [reevalTP, setReevalTP] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ReplayResult | null>(null)

  useEffect(() => {
    const load = async () => {
      setTradesLoading(true)
      const page = await fetchTrades({}, 1)
      setTrades(page.trades)
      setTradesLoading(false)
    }
    load()
  }, [fetchTrades])

  const handleTradeSelect = (tradeId: string) => {
    setSelectedTradeId(tradeId)
    setWouldTake(null)
    setReevalSL('')
    setReevalTP('')
    setResult(null)
  }

  const handleSubmit = async () => {
    if (!selectedTradeId || !activeAccount || wouldTake === null) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: activeAccount.id,
          trade_id: selectedTradeId,
          would_take: wouldTake,
          reeval_sl: reevalSL ? parseFloat(reevalSL) : null,
          reeval_tp: reevalTP ? parseFloat(reevalTP) : null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTrade = trades.find(t => t.id === selectedTradeId)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trade-Replay</h1>
        <p className="text-muted-foreground mt-1">
          Evaluiere vergangene Trades neu. Hätte ein anderer SL/TP ein besseres Ergebnis gebracht?
        </p>
      </div>

      {/* Trade selector */}
      <div>
        {tradesLoading ? (
          <Skeleton className="h-9 w-72" />
        ) : (
          <Select onValueChange={handleTradeSelect} value={selectedTradeId ?? ''}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Trade auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {trades.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  Keine Trades vorhanden
                </SelectItem>
              ) : (
                trades.map(trade => (
                  <SelectItem key={trade.id} value={trade.id}>
                    {trade.asset} · {trade.direction === 'long' ? 'Long' : 'Short'} ·{' '}
                    {format(new Date(trade.traded_at), 'dd.MM.yy', { locale: de })}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedTrade && !result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {selectedTrade.asset} · {selectedTrade.direction === 'long' ? 'Long' : 'Short'}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {format(new Date(selectedTrade.traded_at), 'dd. MMM yyyy', { locale: de })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedTrade.setup_type && (
                <Badge variant="secondary">{selectedTrade.setup_type}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Trade info — no outcome */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Entry" value={String(selectedTrade.entry_price)} />
              <InfoRow label="Original SL" value={selectedTrade.sl_price ? String(selectedTrade.sl_price) : '—'} />
              <InfoRow label="Original TP" value={selectedTrade.tp_price ? String(selectedTrade.tp_price) : '—'} />
              <InfoRow label="Lots" value={selectedTrade.lot_size ? String(selectedTrade.lot_size) : '—'} />
            </div>

            {/* Screenshot */}
            {selectedTrade.screenshot_urls.length > 0 && (
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={selectedTrade.screenshot_urls[0]}
                  alt="Trade Chart"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}

            {/* Would take */}
            <div className="space-y-2">
              <Label>Hätte ich diesen Trade genommen?</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWouldTake(true)}
                  className={cn(
                    'flex-1 py-2 rounded-md border text-sm transition-colors',
                    wouldTake === true
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-border text-muted-foreground hover:border-foreground/50'
                  )}
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => setWouldTake(false)}
                  className={cn(
                    'flex-1 py-2 rounded-md border text-sm transition-colors',
                    wouldTake === false
                      ? 'border-red-500 bg-red-500/10 text-red-400'
                      : 'border-border text-muted-foreground hover:border-foreground/50'
                  )}
                >
                  Nein
                </button>
              </div>
            </div>

            {/* Re-eval SL/TP */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reeval-sl">Re-Evaluation SL (optional)</Label>
                <Input
                  id="reeval-sl"
                  type="number"
                  step="any"
                  placeholder={selectedTrade.sl_price ? String(selectedTrade.sl_price) : '0.0'}
                  value={reevalSL}
                  onChange={e => setReevalSL(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reeval-tp">Re-Evaluation TP (optional)</Label>
                <Input
                  id="reeval-tp"
                  type="number"
                  step="any"
                  placeholder={selectedTrade.tp_price ? String(selectedTrade.tp_price) : '0.0'}
                  value={reevalTP}
                  onChange={e => setReevalTP(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={wouldTake === null || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Berechne...</>
              ) : (
                'Ergebnis berechnen'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {result && selectedTrade && (
        <ReplayResultCard
          trade={selectedTrade}
          result={result}
          wouldTake={wouldTake}
          onReset={() => {
            setResult(null)
            setSelectedTradeId(null)
          }}
        />
      )}
    </div>
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

function ReplayResultCard({
  trade,
  result,
  wouldTake,
  onReset,
}: {
  trade: Trade
  result: ReplayResult
  wouldTake: boolean | null
  onReset: () => void
}) {
  const outcomeColor =
    trade.outcome === 'win'
      ? 'text-green-400'
      : trade.outcome === 'loss'
      ? 'text-red-400'
      : 'text-yellow-400'

  const improvementPositive = result.improvement != null && result.improvement > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Replay-Ergebnis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Original Ergebnis</p>
            <p className={cn('text-xl font-bold', outcomeColor)}>
              {trade.outcome === 'win' ? 'Win' : trade.outcome === 'loss' ? 'Loss' : 'BE'}
            </p>
            {result.original_result != null && (
              <p className={cn('text-sm', outcomeColor)}>
                {result.original_result >= 0 ? '+' : ''}{result.original_result.toFixed(2)}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Re-Eval Ergebnis</p>
            {result.reeval_result != null ? (
              <>
                <p className={cn('text-xl font-bold', result.reeval_result >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {result.reeval_result >= 0 ? 'Win' : 'Loss'}
                </p>
                <p className={cn('text-sm', result.reeval_result >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {result.reeval_result >= 0 ? '+' : ''}{result.reeval_result.toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nicht berechnet</p>
            )}
          </div>
        </div>

        {result.improvement != null && (
          <div className={cn(
            'rounded-lg border p-3 flex items-center gap-3',
            improvementPositive ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
          )}>
            {improvementPositive ? (
              <TrendingUp className="h-5 w-5 text-green-400 shrink-0" />
            ) : result.improvement < 0 ? (
              <TrendingDown className="h-5 w-5 text-red-400 shrink-0" />
            ) : (
              <Minus className="h-5 w-5 text-yellow-400 shrink-0" />
            )}
            <p className="text-sm">
              Deine Re-Evaluation hätte{' '}
              <span className={cn('font-semibold', improvementPositive ? 'text-green-400' : 'text-red-400')}>
                {improvementPositive ? '+' : ''}{result.improvement.toFixed(2)}
              </span>{' '}
              {improvementPositive ? 'mehr' : 'weniger'} gebracht.
            </p>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Du hättest diesen Trade{' '}
          <span className={cn('font-medium', wouldTake ? 'text-green-400' : 'text-red-400')}>
            {wouldTake ? 'genommen' : 'nicht genommen'}
          </span>
          .
        </div>

        <Button onClick={onReset} variant="outline" className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          Neuen Trade evaluieren
        </Button>
      </CardContent>
    </Card>
  )
}
