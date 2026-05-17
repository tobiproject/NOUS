'use client'

import { useCallback, useState } from 'react'
import { useAccountContext } from '@/contexts/AccountContext'

export interface PropFirmRule {
  id: string
  account_id: string
  firm_name: string
  account_size: number
  max_daily_loss_pct: number | null
  max_total_drawdown_pct: number | null
  profit_target_pct: number | null
  trailing_drawdown: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PropFirmInput {
  firm_name: string
  account_size: number
  max_daily_loss_pct?: number | null
  max_total_drawdown_pct?: number | null
  profit_target_pct?: number | null
  trailing_drawdown?: boolean
  notes?: string | null
}

export function usePropFirmRules() {
  const { activeAccount } = useAccountContext()
  const [rule, setRule] = useState<PropFirmRule | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchRule = useCallback(async () => {
    if (!activeAccount) return
    setLoading(true)
    try {
      const res = await fetch(`/api/prop-firm?account_id=${activeAccount.id}`)
      if (!res.ok) return
      const data = await res.json()
      setRule(data.rules?.[0] ?? null)
    } finally {
      setLoading(false)
    }
  }, [activeAccount])

  const saveRule = useCallback(async (input: PropFirmInput) => {
    if (!activeAccount) return { error: 'Kein aktives Konto' }
    setSaving(true)
    try {
      const res = await fetch('/api/prop-firm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: activeAccount.id, ...input }),
      })
      if (!res.ok) {
        const d = await res.json()
        return { error: d.error ?? 'Fehler beim Speichern' }
      }
      const data = await res.json()
      setRule(data.rule)
      return { error: null }
    } finally {
      setSaving(false)
    }
  }, [activeAccount])

  const deleteRule = useCallback(async () => {
    if (!rule) return
    await fetch(`/api/prop-firm/${rule.id}`, { method: 'DELETE' })
    setRule(null)
  }, [rule])

  return { rule, loading, saving, fetchRule, saveRule, deleteRule }
}
