'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'
import { Trade } from '@/hooks/useTrades'
import { QuizCard } from './QuizCard'
import { QuizSummary } from './QuizSummary'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BookOpen } from 'lucide-react'

export interface QuizAnswer {
  tradeId: string
  goodEntry: 'yes' | 'no' | 'unsure'
  setupGuess: string
  improvementNotes: string
  aiComment: string
  actualOutcome: 'win' | 'loss' | 'breakeven' | null
  actualPnL: number | null
  isCorrect: boolean
}

interface QuizSession {
  sessionId: string | null
  trades: Trade[]
}

export function QuizSession() {
  const { activeAccount } = useAccountContext()
  const [phase, setPhase] = useState<'idle' | 'loading' | 'playing' | 'done' | 'error'>('idle')
  const [session, setSession] = useState<QuizSession | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const startQuiz = useCallback(async () => {
    if (!activeAccount) return
    setPhase('loading')
    setAnswers([])
    setCurrentIndex(0)
    try {
      const res = await fetch(`/api/quiz/start?account_id=${activeAccount.id}`)
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Fehler beim Laden der Quiz-Trades')
        setPhase('error')
        return
      }
      setSession({ sessionId: data.sessionId, trades: data.trades })
      setPhase('playing')
    } catch {
      setErrorMsg('Netzwerkfehler — bitte erneut versuchen')
      setPhase('error')
    }
  }, [activeAccount])

  const handleAnswer = useCallback((answer: QuizAnswer) => {
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)
    if (session && newAnswers.length >= session.trades.length) {
      setPhase('done')
    } else {
      setCurrentIndex(i => i + 1)
    }
  }, [answers, session])

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <BookOpen className="h-12 w-12 text-blue-400 opacity-80" />
        <div>
          <h2 className="text-xl font-semibold">Quiz-Modus</h2>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
            Du bekommst vergangene Trades ohne Ergebnis gezeigt. Bewerte jeden Trade — danach siehst du was wirklich passiert ist.
          </p>
        </div>
        <Button onClick={startQuiz} size="lg" className="mt-2">
          Quiz starten
        </Button>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">{errorMsg}</p>
        <Button onClick={startQuiz} variant="outline">Erneut versuchen</Button>
      </div>
    )
  }

  if (phase === 'done' && session) {
    return (
      <QuizSummary
        trades={session.trades}
        answers={answers}
        onRestart={startQuiz}
      />
    )
  }

  if (phase === 'playing' && session) {
    const trade = session.trades[currentIndex]
    const progress = (currentIndex / session.trades.length) * 100

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Trade {currentIndex + 1} von {session.trades.length}
          </span>
          <span className="text-sm text-muted-foreground">
            Quiz-Session
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <QuizCard
          trade={trade}
          sessionId={session.sessionId}
          onAnswer={handleAnswer}
        />
      </div>
    )
  }

  return null
}
