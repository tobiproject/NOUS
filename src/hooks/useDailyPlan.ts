'use client'

import { useCallback } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'
import { createClient } from '@/lib/supabase'

export interface DailyPlan {
  id: string
  account_id: string
  plan_date: string
  market_bias: 'bullish' | 'bearish' | 'neutral' | null
  focus_assets: string[]
  errors_to_avoid: string[]
  notes: string | null
  created_at: string
}

export interface DailyPlanInput {
  market_bias: 'bullish' | 'bearish' | 'neutral' | null
  focus_assets: string[]
  errors_to_avoid: string[]
  notes: string
}

export function useDailyPlan() {
  const { activeAccount } = useAccountContext()
  const supabase = createClient()

  const fetchTodayPlan = useCallback(async (): Promise<DailyPlan | null> => {
    if (!activeAccount) return null
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('account_id', activeAccount.id)
      .eq('plan_date', today)
      .maybeSingle()
    return data as DailyPlan | null
  }, [activeAccount]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecentPlans = useCallback(async (limit = 10): Promise<DailyPlan[]> => {
    if (!activeAccount) return []
    const { data } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('account_id', activeAccount.id)
      .order('plan_date', { ascending: false })
      .limit(limit)
    return (data ?? []) as DailyPlan[]
  }, [activeAccount]) // eslint-disable-line react-hooks/exhaustive-deps

  const savePlan = useCallback(async (input: DailyPlanInput): Promise<{ error: string | null }> => {
    if (!activeAccount) return { error: 'Kein aktives Konto' }
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch('/api/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: activeAccount.id, plan_date: today, ...input }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: body.error ?? 'Fehler beim Speichern' }
    }
    return { error: null }
  }, [activeAccount])

  return { fetchTodayPlan, fetchRecentPlans, savePlan }
}
