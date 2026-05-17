'use client'

import { useState, useCallback, useRef } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'

export interface AiError {
  category: string
  description: string
}

export interface AiStrength {
  description: string
}

export interface AiSuggestion {
  action: string
  priority: 'high' | 'medium' | 'low'
}

export interface TradeAnalysis {
  id: string
  trade_id: string
  type: 'trade'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  score: number | null
  errors: AiError[] | null
  strengths: AiStrength[] | null
  suggestions: AiSuggestion[] | null
  summary: string | null
  error_message: string | null
  retry_count: number
  created_at: string
  updated_at: string
}

export function useAiAnalysis() {
  const { activeAccount } = useAccountContext()
  const [isTriggering, setIsTriggering] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchAnalysis = useCallback(async (tradeId: string): Promise<TradeAnalysis | null> => {
    if (!activeAccount) return null
    const res = await fetch(`/api/ai/analysis?trade_id=${tradeId}&account_id=${activeAccount.id}&type=trade`)
    if (!res.ok) return null
    return res.json()
  }, [activeAccount])

  const triggerAnalysis = useCallback(async (
    tradeId: string,
    onUpdate?: (analysis: TradeAnalysis) => void
  ): Promise<void> => {
    if (!activeAccount) return
    setIsTriggering(true)
    stopPolling()

    try {
      const res = await fetch('/api/ai/analyze-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_id: tradeId, account_id: activeAccount.id }),
      })
      if (!res.ok) return

      if (!onUpdate) return

      // Poll until completed or failed
      pollRef.current = setInterval(async () => {
        const analysis = await fetchAnalysis(tradeId)
        if (!analysis) return
        onUpdate(analysis)
        if (analysis.status === 'completed' || analysis.status === 'failed') {
          stopPolling()
        }
      }, 3000)
    } finally {
      setIsTriggering(false)
    }
  }, [activeAccount, fetchAnalysis, stopPolling])

  return { fetchAnalysis, triggerAnalysis, isTriggering, stopPolling }
}
