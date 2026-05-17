'use client'

import { useCallback } from 'react'

const MILESTONES = [10, 30, 50, 100, 150, 200, 500] as const

const STORAGE_KEY = 'nous-milestones-triggered'

function getTriggered(): number[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function markTriggered(milestone: number) {
  const existing = getTriggered()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...existing, milestone])]))
}

export function useMilestones() {
  const checkMilestones = useCallback((totalTrades: number): number | null => {
    const triggered = getTriggered()
    for (const m of MILESTONES) {
      if (totalTrades >= m && !triggered.includes(m)) {
        markTriggered(m)
        return m
      }
    }
    return null
  }, [])

  return { checkMilestones }
}
