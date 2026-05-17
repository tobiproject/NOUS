'use client'

import { useCallback, useState, useRef } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'

export interface PeriodAnalysis {
  id: string
  type: 'weekly' | 'monthly'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  period_start: string
  period_end: string
  full_response: {
    pnl: number
    trade_count: number
    win_rate: number
    top_errors: Array<{ category: string; count: number; description: string }>
    top_strengths: Array<{ description: string }>
    focus_next_period: string
    summary: string
    vs_previous?: { win_rate_delta: number; profit_factor_delta: number; avg_rr_delta: number }
    actions?: Array<{ action: string; priority: 'high' | 'medium' | 'low' }>
  } | null
  error_message: string | null
  created_at: string
}

export function useAiPeriodAnalysis() {
  const { activeAccount } = useAccountContext()
  const [isTriggering, setIsTriggering] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const fetchPeriodAnalysis = useCallback(async (
    type: 'weekly' | 'monthly',
    periodStart: string
  ): Promise<PeriodAnalysis | null> => {
    if (!activeAccount) return null
    const res = await fetch(
      `/api/ai/analysis?account_id=${activeAccount.id}&type=${type}&period_start=${periodStart}`
    )
    if (!res.ok) return null
    return res.json()
  }, [activeAccount])

  const fetchRecentAnalyses = useCallback(async (
    type: 'weekly' | 'monthly',
    limit = 8
  ): Promise<PeriodAnalysis[]> => {
    if (!activeAccount) return []
    // Fetch last N period analyses from the DB via direct Supabase
    const res = await fetch(
      `/api/ai/analyses-list?account_id=${activeAccount.id}&type=${type}&limit=${limit}`
    )
    if (!res.ok) return []
    return res.json()
  }, [activeAccount])

  const triggerPeriodAnalysis = useCallback(async (
    type: 'weekly' | 'monthly',
    periodStart: string,
    periodEnd: string,
    onUpdate?: (a: PeriodAnalysis) => void
  ): Promise<void> => {
    if (!activeAccount) return
    setIsTriggering(true)
    stopPolling()
    try {
      const res = await fetch('/api/ai/analyze-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: activeAccount.id,
          type,
          period_start: periodStart,
          period_end: periodEnd,
        }),
      })
      if (!res.ok) return
      if (!onUpdate) return
      pollRef.current = setInterval(async () => {
        const analysis = await fetchPeriodAnalysis(type, periodStart)
        if (!analysis) return
        onUpdate(analysis)
        if (analysis.status === 'completed' || analysis.status === 'failed') stopPolling()
      }, 3000)
    } finally {
      setIsTriggering(false)
    }
  }, [activeAccount, fetchPeriodAnalysis, stopPolling])

  return { fetchPeriodAnalysis, fetchRecentAnalyses, triggerPeriodAnalysis, isTriggering, stopPolling }
}
