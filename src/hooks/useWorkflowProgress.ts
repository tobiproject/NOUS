'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type StepCategory = 'weekly' | 'daily' | 'per_trade' | 'weekly_end'

export interface WorkflowStep {
  id: string
  label: string
  description: string
  category: StepCategory
  href: string | null
  done: boolean
  missed: boolean
  calendarWarning?: string | null
}

export interface WorkflowProgress {
  steps: WorkflowStep[]
  total: number
  done_count: number
  week_iso: string
}

const STALE_MS = 30_000

export function useWorkflowProgress(accountId: string | null | undefined) {
  const [data, setData] = useState<WorkflowProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef<number>(0)

  const fetch_ = useCallback(async (force = false) => {
    if (!accountId) return
    const now = Date.now()
    if (!force && now - lastFetchRef.current < STALE_MS) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workflow/progress?account_id=${accountId}`)
      if (!res.ok) throw new Error('Failed to load workflow progress')
      const json = await res.json()
      setData(json)
      lastFetchRef.current = Date.now()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetch_(true)
  }, [fetch_])

  const markManualStep = useCallback(async (step: 'trade_prepared') => {
    if (!accountId) return
    await fetch('/api/workflow/manual-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId, step }),
    })
    fetch_(true)
  }, [accountId, fetch_])

  const reset = useCallback(async () => {
    if (!accountId) return
    await fetch('/api/workflow/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId }),
    })
    fetch_(true)
  }, [accountId, fetch_])

  return { data, loading, error, refetch: () => fetch_(true), markManualStep, reset }
}
