'use client'

import { Trade } from '@/hooks/useTrades'
import { QuizAnswer } from './QuizSession'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  trades: Trade[]
  answers: QuizAnswer[]
  onRestart: () => void
}

export function QuizSummary({ trades, answers, onRestart }: Props) {
  const correct = answers.filter(a => a.isCorrect).length
  const total = answers.length
  const matchRate = total > 0 ? Math.round((correct / total) * 100) : 0

  const rateColor =
    matchRate >= 70 ? 'text-green-400' : matchRate >= 40 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz abgeschlossen!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Übereinstimmungs-Rate</span>
            <span className={cn('text-3xl font-bold', rateColor)}>{matchRate}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Richtig bewertet</span>
            <span>{correct} / {total} Trades</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                matchRate >= 70 ? 'bg-green-500' : matchRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${matchRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-Trade list */}
      <div className="space-y-2">
        {trades.map((trade, i) => {
          const answer = answers[i]
          if (!answer) return null
          return (
            <Card key={trade.id} className="py-3">
              <CardContent className="flex items-center gap-3 py-0">
                {answer.isCorrect ? (
                  <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">
                    {trade.asset} · {trade.direction === 'long' ? 'Long' : 'Short'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(trade.traded_at), 'dd.MM.yyyy', { locale: de })}
                  </span>
                </div>
                {trade.outcome && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-xs',
                      trade.outcome === 'win' && 'text-green-400 border-green-400/30',
                      trade.outcome === 'loss' && 'text-red-400 border-red-400/30',
                      trade.outcome === 'breakeven' && 'text-yellow-400 border-yellow-400/30'
                    )}
                  >
                    {trade.outcome === 'win' ? 'Win' : trade.outcome === 'loss' ? 'Loss' : 'BE'}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button onClick={onRestart} className="w-full" variant="outline">
        <RotateCcw className="h-4 w-4 mr-2" />
        Neues Quiz starten
      </Button>
    </div>
  )
}
