'use client'

import { useState, useCallback } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'

export interface LearnStats {
  streak: number
  quizzesThisWeek: number
  matchRateLast30: number | null
  coachConversations: number
  totalQuizzes: number
}

export function useLearnStats() {
  const { activeAccount } = useAccountContext()
  const [stats, setStats] = useState<LearnStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    if (!activeAccount) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/learn/stats?account_id=${activeAccount.id}`)
      if (!res.ok) return
      const data = await res.json()
      setStats(data)
    } finally {
      setIsLoading(false)
    }
  }, [activeAccount])

  return { stats, isLoading, fetchStats }
}
