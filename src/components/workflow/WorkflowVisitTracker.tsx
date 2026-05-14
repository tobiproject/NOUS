'use client'

import { useEffect } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'

interface Props {
  step: 'kalender' | 'performance' | 'briefing'
}

export function WorkflowVisitTracker({ step }: Props) {
  const { activeAccount } = useAccountContext()

  useEffect(() => {
    if (!activeAccount?.id) return
    fetch('/api/workflow/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: activeAccount.id, step }),
    }).catch(() => {
      // fire-and-forget, silently ignore errors
    })
  }, [activeAccount?.id, step])

  return null
}
